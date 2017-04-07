import {
    ApiEdge, ApiEdgeDefinition, ApiEdgeError, ApiEdgeQueryContext, ApiEdgeQueryResponse,
    ApiEdgeQueryFilter, ApiEdgeQueryFilterType
} from "api-core";
import * as mongoose from "mongoose";
const parse = require('obj-parse'),
    deepKeys = require('deep-keys');

export class MongooseModelEdge<T extends mongoose.Document> extends ApiEdge implements ApiEdgeDefinition {

    static defaultIdField = "id";
    static defaultKeyField = "_id";

    name = "entry";
    pluralName = "entries";
    idField = MongooseModelEdge.defaultIdField;
    keyField = MongooseModelEdge.defaultKeyField;
    provider: mongoose.Model<T>;

    methods = [];
    relations = [];
    actions = [];

    inspect = () => `/${this.pluralName}`;

    private static applyFilter(item: any, filter: ApiEdgeQueryFilter) {
        switch(filter.type) {
            case ApiEdgeQueryFilterType.Equals:
                item[filter.field] = filter.value;
                break;
            case ApiEdgeQueryFilterType.NotEquals:
                item[filter.field] = { $ne: filter.value };
                break;
            case ApiEdgeQueryFilterType.GreaterThan:
                item[filter.field] = { $gt: filter.value };
                break;
            case ApiEdgeQueryFilterType.GreaterThanOrEquals:
                item[filter.field] = { $gte: filter.value };
                break;
            case ApiEdgeQueryFilterType.LowerThan:
                item[filter.field] = { $lt: filter.value };
                break;
            case ApiEdgeQueryFilterType.LowerThanOrEquals:
                item[filter.field] = { $lte: filter.value };
                break;
            default:
                return false;
        }
    }

    private applyFilters(item: any, filters: ApiEdgeQueryFilter[]) {
        if(!filters.length) return true;
        filters.forEach(filter => MongooseModelEdge.applyFilter(item, filter))
    }

    private static handleMongoError(e: Error): ApiEdgeError|Error {
        if(e instanceof (mongoose as any).Error.ValidationError) {
            return new ApiEdgeError(422, "Unprocessable Entity")
        }
        else {
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
            if(context.fields.length) query.select(context.fields.join(' '));
            if(context.populatedFields.length) query.populate(context.populatedFields.join(' '));

            query.then(entry => {
                resolve(new ApiEdgeQueryResponse(entry))
            }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
        })
    };

    listEntries = (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        return new Promise((resolve, reject) => {
            let queryString = {};
            this.applyFilters(queryString, context.filters);
            let query = this.provider.find(queryString).lean();
            if(context.fields.length) query.select(context.fields.join(' '));
            if(context.populatedFields.length) query.populate(context.populatedFields.join(' '));
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
            let query = this.provider.create(body);
            query.then(entries => {
                resolve(new ApiEdgeQueryResponse(entries))
            }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
        })
    };

    patchEntry = (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            if(!context.id) {
                let res = this.extractKey(body);
                if(res == null) return reject(new ApiEdgeError(400, "Missing ID"));
                context.id = res.id;
            }

            this.getEntry(context).then(resp => {
                let entry = resp.data;
                //TODO: Better deep extend?
                deepKeys(body).map((key: any) => parse(key)).forEach((parsedKey: any) => parsedKey.assign(entry, parsedKey(body)));
                let query =this.provider.update({ _id: entry._id||entry.id }, entry).lean();
                query.then((entry: T) => {
                    resolve(new ApiEdgeQueryResponse(entry))
                }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
            }).catch(reject)
        })
    };

    updateEntry = (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            if(!context.id) {
                let res = this.extractKey(body);
                if(res == null) return reject(new ApiEdgeError(400, "Missing ID"));
                context.id = res.id;
            }

            this.getEntry(context).then(resp => {
                let entry = resp.data;
                Object.keys(body).forEach(key => entry[key] = body[key]);
                let query =this.provider.update({ _id: entry._id||entry.id }, entry).lean();
                query.then((entry: T) => {
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
            if(!context.id) {
                let res = this.extractKey(body);
                if(res == null) return reject(new ApiEdgeError(400, "Missing ID"));
                context.id = res.id;
            }

            this.getEntry(context).then(resp => {
                let entry = resp.data;
                let query = this.provider.remove({ [this.keyField]: context.id });
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
            let query = this.provider.findOne({ [this.keyField]: context.id }, 'id');
            query.then(entry => {
                resolve(new ApiEdgeQueryResponse(!!entry))
            }).catch(e => reject(MongooseModelEdge.handleMongoError(e)));
        })
    }

}
