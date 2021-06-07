import {
    ApiEdge, ApiEdgeDefinition, ApiEdgeError, ApiEdgeQueryContext, ApiEdgeQueryResponse,
    ApiEdgeQueryFilter, ApiEdgeQueryFilterType, Api, ApiEdgeSchema, ApiEdgeMethod
} from "api-core";
import {mapSchema, convertMongooseSchemaToSimplSchema, buildPublicSchema} from "./utils/SchemaConverter"
import * as mongoose from "mongoose";
import {SchemaTypeMapper} from "api-core/dist/src/edge/utils/SchemaTypeMapper";
const parse = require('obj-parse'),
    deepKeys = require('deep-keys'),
    debug = require('debug')('api-model-mongoose');

export class MongooseModelEdge<T extends mongoose.Document> extends ApiEdge implements ApiEdgeDefinition {

    static defaultIdField = "id";
    static defaultKeyField = "_id";

    name = "entry";
    pluralName = "entries";
    idField = MongooseModelEdge.defaultIdField;
    keyField = MongooseModelEdge.defaultKeyField;
    provider: mongoose.Model<T>;

    methods: ApiEdgeMethod[] = [];
    relations = [];
    actions = [];

    private originalSchema: any;
    private originalPublicSchema: any;

    constructor(publicSchema: any|((schema: any) => any), schema: any) {
        super();

        if(typeof publicSchema === 'function') {
            this.originalPublicSchema = publicSchema(buildPublicSchema(schema));
        }
        else {
            this.originalPublicSchema = publicSchema || buildPublicSchema(schema);
        }

        this.originalSchema = schema
    }

    metadata = () => {
        return {
            name: this.name,
            pluralName: this.pluralName,
            idField: this.idField,
            keyField: this.keyField,
            fields: this.schema.fields,
            methods: this.methods.map(m => ({
                name: m.name,
                type: m.acceptedTypes,
                scope: m.scope,
                parameters: m.parameters
            })),
            //relatedFields,
            typings: this.schema.originalSchema
                ? SchemaTypeMapper.exportSchema(this.schema.originalSchema)
                : undefined,
            allowGet: this.allowGet,
            allowList: this.allowList,
            allowCreate: this.allowCreate,
            allowUpdate: this.allowUpdate,
            allowPatch: this.allowPatch,
            allowRemove: this.allowRemove,
            allowExists: this.allowExists,
            external: this.external
        }
    };

    prepare = async (api: Api) => {
        if(this.originalSchema) {
            this.schema = new ApiEdgeSchema(
                this.originalPublicSchema,
                mapSchema(convertMongooseSchemaToSimplSchema(this.originalSchema, api, this), this.originalPublicSchema),
                Object.keys(this.originalPublicSchema)
            )
        }
        else {
            this.schema = new ApiEdgeSchema(this.originalPublicSchema, null)
        }
    };

    inspect = () => `/${this.pluralName}`;

    private mapIdToKeyField(field: string): string {
        return this.idField === field ? this.keyField : field
    }

    private applyFilter(item: any, filter: ApiEdgeQueryFilter) {
        switch(filter.type) {
            case ApiEdgeQueryFilterType.Equals:
                item[this.mapIdToKeyField(filter.field)] = filter.value;
                break;
            case ApiEdgeQueryFilterType.NotEquals:
                item[this.mapIdToKeyField(filter.field)] = { $ne: filter.value };
                break;
            case ApiEdgeQueryFilterType.GreaterThan:
                item[this.mapIdToKeyField(filter.field)] = { $gt: filter.value };
                break;
            case ApiEdgeQueryFilterType.GreaterThanOrEquals:
                item[this.mapIdToKeyField(filter.field)] = { $gte: filter.value };
                break;
            case ApiEdgeQueryFilterType.LowerThan:
                item[this.mapIdToKeyField(filter.field)] = { $lt: filter.value };
                break;
            case ApiEdgeQueryFilterType.LowerThanOrEquals:
                item[this.mapIdToKeyField(filter.field)] = { $lte: filter.value };
                break;
            case ApiEdgeQueryFilterType.Similar:
                item[this.mapIdToKeyField(filter.field)] = { $regex: filter.value, $options: 'i' };
                break;
            case ApiEdgeQueryFilterType.In:
                item[this.mapIdToKeyField(filter.field)] = { $in: filter.value };
                break;
            default:
                return false;
        }
    }

    private applyFilters(item: any, filters: ApiEdgeQueryFilter[]) {
        if(!filters.length) return true;
        filters.forEach(filter => this.applyFilter(item, filter))
    }

    private static handleMongoError(e: Error): ApiEdgeError|Error {
        if(e instanceof (mongoose as any).Error.ValidationError) {
            return new ApiEdgeError(422, "Unprocessable Entity: " + e.message);
        }
        else {
            console.log('MONGO ERROR', e);
            return e;
        }
    }

    private extractKey(body: any) {
        if(!body) return null;
        let id = body[this.keyField];
        if(id) return { id, key: this.keyField };
        if(!body.id && !body._id) return null;
        id = body.id || body._id;
        return { id, key: "_id" }
    }

    getEntry = (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        return new Promise((resolve, reject) => {
            let queryString = { [this.keyField]: context.id };
            this.applyFilters(queryString, context.filters);
            let query = this.provider.findOne(queryString).lean();
            
            // Apply request field filters
            if(context.fields.length) { 
                query.select(context.fields.join(' '));
            // Apply default non private filter
            } else if (this.provider.schema && this.provider.schema.obj) {
                query.select(Object.keys(this.provider.schema.obj).filter(
                    x => !this.provider.schema.obj[x].private
                ).join(' '));
            }
            debug('GET', queryString, context.fields, context.sortBy);

            query.then(entry => {
                if(entry) resolve(new ApiEdgeQueryResponse(entry));
                else reject(new ApiEdgeError(404, "Not Found"))
            }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
        })
    };

    listEntries = (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        return new Promise((resolve, reject) => {
            let queryString = {};
            this.applyFilters(queryString, context.filters);
            let query = this.provider.find(queryString).lean();

            debug('LIST', queryString, context.fields, context.sortBy, context.pagination);

            // Apply request field filters
            if(context.fields.length) {
                query.select(context.fields.join(' '));
            // Apply default non private filter
            } else if (this.provider.schema && this.provider.schema.obj) {
                query.select(Object.keys(this.provider.schema.obj).filter(
                    x => !this.provider.schema.obj[x].private
                ).join(' '));
            }
            if(context.sortBy) {
                let sortOptions: any = {};
                context.sortBy.forEach((sort: any[]) => sortOptions[""+sort[0]] = sort[1]);
                query.sort(sortOptions);
            }
            if(context.pagination) {
                query.limit(context.pagination.limit).skip(context.pagination.skip);
                this.provider.count(queryString).then(count => {
                    query.then(entries => {
                        resolve(new ApiEdgeQueryResponse(entries, { pagination: { total: count } }))
                    }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
                }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
            }
            else {
                query.then(entries => {
                    resolve(new ApiEdgeQueryResponse(entries))
                }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
            }
        })
    };

    createEntry = (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            debug('CREATE', body);

            let query = this.provider.create(body);
            query.then(entries => {
                resolve(new ApiEdgeQueryResponse(entries.toObject()))
            }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
        })
    };

    patchEntry = (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            debug('PATCH', context.id, body);

            if(!context.id) {
                let res = this.extractKey(body);
                if(res == null) return reject(new ApiEdgeError(400, "Missing ID"));
                context.id = res.id;
            }

            const keys = deepKeys(body);
            const queryValue: { $set: { [key: string]: any } } = { $set: {} }
            for(let key of keys) {
                queryValue.$set[key] = parse(key)(body)
            }

            let queryString = { [this.keyField]: context.id };
            this.applyFilters(queryString, context.filters);
            let query = this.provider.updateOne(queryString, queryValue).lean();
            query.then(() => {
                this.getEntry(context)
                    .then(resolve)
                    .catch(reject)
            }).catch(e => reject(MongooseModelEdge.handleMongoError(e)))
        })
    };

    updateEntry = (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            debug('UPDATE', context.id, body);

            if(!context.id) {
                let res = this.extractKey(body);
                if(res == null) return reject(new ApiEdgeError(400, "Missing ID"));
                context.id = res.id;
            }

            this.getEntry(context).then(resp => {
                let entry = resp.data;
                Object.keys(body).forEach(key => entry[key] = body[key]);
                let query = this.provider.updateOne({ _id: entry._id||entry.id }, entry).lean();
                query.then(() => {
                    resolve(new ApiEdgeQueryResponse(entry))
                }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
            }).catch(reject)
        })
    };

    updateEntries = (): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            reject(new ApiEdgeError(500, "Not Supported"))
        })
    };

    removeEntry = (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            debug('REMOVE', context.id, body);

            if(!context.id) {
                let res = this.extractKey(body);
                if(res == null) return reject(new ApiEdgeError(400, "Missing ID"));
                context.id = res.id;
            }

            this.getEntry(context).then(resp => {
                let entry = resp.data;
                let query = this.provider.deleteOne({ [this.keyField]: context.id });
                query.then(() => {
                    resolve(new ApiEdgeQueryResponse(entry))
                }).catch(e => reject(MongooseModelEdge.handleMongoError(e)))
            }).catch(reject)
        })
    };

    removeEntries = (): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            reject(new ApiEdgeError(500, "Not Supported"))
        })
    };

    exists = (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            debug('EXISTS', context.id);

            let query = this.provider.findOne({ [this.keyField]: context.id }, 'id');
            query.then(entry => {
                resolve(new ApiEdgeQueryResponse(!!entry))
            }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
        })
    }

}
