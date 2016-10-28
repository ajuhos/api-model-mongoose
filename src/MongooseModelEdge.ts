import {ApiEdgeDefinition, ApiEdgeError, ApiEdgeQueryContext, ApiEdgeQueryResponse, ApiEdgeQueryFilter, ApiEdgeQueryFilterType} from "api-core";
import * as mongoose from "mongoose";

export class MongooseModelEdge<T extends mongoose.Document> implements ApiEdgeDefinition {

    name = "entry";
    pluralName = "entries";
    idField = "_id";
    provider: mongoose.Model<T>;

    methods: any = {};
    relations = [];

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

    getEntry = (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        return new Promise((resolve, reject) => {
            let queryString = { _id: context.id };
            this.applyFilters(queryString, context.filters);
            let query = this.provider.findOne(queryString).lean();
            if(context.fields.length) query.select(context.fields.join(' '));
            if(context.populatedFields.length) query.populate(context.populatedFields.join(' '));

            query.then(entry => {
                resolve(new ApiEdgeQueryResponse(entry))
            }).catch(reject);
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
                    }).catch(reject);
                })
            }
            else {
                query.then(entries => {
                    resolve(new ApiEdgeQueryResponse(entries))
                }).catch(reject);
            }
        })
    };

    createEntry = (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            let query = this.provider.create(body);
            query.then(entries => {
                resolve(new ApiEdgeQueryResponse(entries))
            }).catch(reject);
        })
    };

    patchEntry = (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            if(!context.id) {
                if(!body || (!body.id && !body._id)) reject(new ApiEdgeError(400, "Missing ID"));
                context.id = body.id || body._id;
            }

            this.getEntry(context).then(resp => {
                let entry = resp.data;
                Object.keys(body).forEach(key => entry[key] = body[key]);
                let query =this.provider.update({ _id: entry._id||entry.id }, entry).lean();
                query.then((entry: T) => {
                    resolve(new ApiEdgeQueryResponse(entry))
                }).catch(reject);
            }).catch(reject)
        })
    };

    updateEntry = (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            if(!context.id) {
                if(!body || (!body.id && !body._id)) reject(new ApiEdgeError(400, "Missing ID"));
                context.id = body.id || body._id;
            }

            this.getEntry(context).then(resp => {
                let entry = resp.data;
                Object.keys(body).forEach(key => entry[key] = body[key]);
                let query =this.provider.update({ id: entry._id||entry.id }, entry).lean();
                query.then((entry: T) => {
                    resolve(new ApiEdgeQueryResponse(entry))
                }).catch(reject);
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
                if(!body || (!body.id && !body._id)) reject(new ApiEdgeError(400, "Missing ID"));
                context.id = body.id || body._id;
            }

            let query = this.provider.remove({ id: context.id });
            query.then(() => {
                resolve(new ApiEdgeQueryResponse({}))
            }).catch(reject);
        })
    };

    removeEntries = (): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            reject(new ApiEdgeError(500, "Not Supported"))
        })
    };

    exists = (context: ApiEdgeQueryContext): Promise<ApiEdgeQueryResponse> => {
        return new Promise<ApiEdgeQueryResponse>((resolve, reject) => {
            let query = this.provider.findOne({ id: context.id }, 'id');
            query.then(entry => {
                resolve(new ApiEdgeQueryResponse(!!entry))
            }).catch(reject);
        })
    };

    callMethod = (context: ApiEdgeQueryContext, body: any): Promise<ApiEdgeQueryResponse> => {
        return this.methods[""+context.id](context, body);
    }

}