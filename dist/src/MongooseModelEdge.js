"use strict";
const api_core_1 = require("api-core");
const parse = require('obj-parse'), deepKeys = require('deep-keys');
class MongooseModelEdge extends api_core_1.ApiEdge {
    constructor() {
        super(...arguments);
        this.name = "entry";
        this.pluralName = "entries";
        this.idField = MongooseModelEdge.defaultIdField;
        this.methods = [];
        this.relations = [];
        this.actions = [];
        this.inspect = () => `/${this.pluralName}`;
        this.getEntry = (context) => {
            return new Promise((resolve, reject) => {
                let queryString = { _id: context.id };
                this.applyFilters(queryString, context.filters);
                let query = this.provider.findOne(queryString).lean();
                if (context.fields.length)
                    query.select(context.fields.join(' '));
                if (context.populatedFields.length)
                    query.populate(context.populatedFields.join(' '));
                query.then(entry => {
                    resolve(new api_core_1.ApiEdgeQueryResponse(entry));
                }).catch(reject);
            });
        };
        this.listEntries = (context) => {
            return new Promise((resolve, reject) => {
                let queryString = {};
                this.applyFilters(queryString, context.filters);
                let query = this.provider.find(queryString).lean();
                if (context.fields.length)
                    query.select(context.fields.join(' '));
                if (context.populatedFields.length)
                    query.populate(context.populatedFields.join(' '));
                if (context.sortBy) {
                    let sortOptions = {};
                    context.sortBy.forEach((sort) => sortOptions["" + sort[0]] = sort[1]);
                    query.sort(sortOptions);
                }
                if (context.pagination) {
                    query.limit(context.pagination.limit).skip(context.pagination.skip);
                    this.provider.count(queryString).then(count => {
                        query.then(entries => {
                            resolve(new api_core_1.ApiEdgeQueryResponse(entries, { pagination: { total: count } }));
                        }).catch(reject);
                    });
                }
                else {
                    query.then(entries => {
                        resolve(new api_core_1.ApiEdgeQueryResponse(entries));
                    }).catch(reject);
                }
            });
        };
        this.createEntry = (context, body) => {
            return new Promise((resolve, reject) => {
                let query = this.provider.create(body);
                query.then(entries => {
                    resolve(new api_core_1.ApiEdgeQueryResponse(entries));
                }).catch(reject);
            });
        };
        this.patchEntry = (context, body) => {
            return new Promise((resolve, reject) => {
                if (!context.id) {
                    if (!body || (!body.id && !body._id))
                        reject(new api_core_1.ApiEdgeError(400, "Missing ID"));
                    context.id = body.id || body._id;
                }
                this.getEntry(context).then(resp => {
                    let entry = resp.data;
                    deepKeys(body).map((key) => parse(key)).forEach((parsedKey) => parsedKey.assign(entry, parsedKey(body)));
                    let query = this.provider.update({ _id: entry._id || entry.id }, entry).lean();
                    query.then((entry) => {
                        resolve(new api_core_1.ApiEdgeQueryResponse(entry));
                    }).catch(reject);
                }).catch(reject);
            });
        };
        this.updateEntry = (context, body) => {
            return new Promise((resolve, reject) => {
                if (!context.id) {
                    if (!body || (!body.id && !body._id))
                        reject(new api_core_1.ApiEdgeError(400, "Missing ID"));
                    context.id = body.id || body._id;
                }
                this.getEntry(context).then(resp => {
                    let entry = resp.data;
                    Object.keys(body).forEach(key => entry[key] = body[key]);
                    let query = this.provider.update({ id: entry._id || entry.id }, entry).lean();
                    query.then((entry) => {
                        resolve(new api_core_1.ApiEdgeQueryResponse(entry));
                    }).catch(reject);
                }).catch(reject);
            });
        };
        this.updateEntries = () => {
            return new Promise((resolve, reject) => {
                reject(new api_core_1.ApiEdgeError(500, "Not Supported"));
            });
        };
        this.removeEntry = (context, body) => {
            return new Promise((resolve, reject) => {
                if (!context.id) {
                    if (!body || (!body.id && !body._id))
                        reject(new api_core_1.ApiEdgeError(400, "Missing ID"));
                    context.id = body.id || body._id;
                }
                let query = this.provider.remove({ id: context.id });
                query.then(() => {
                    resolve(new api_core_1.ApiEdgeQueryResponse({}));
                }).catch(reject);
            });
        };
        this.removeEntries = () => {
            return new Promise((resolve, reject) => {
                reject(new api_core_1.ApiEdgeError(500, "Not Supported"));
            });
        };
        this.exists = (context) => {
            return new Promise((resolve, reject) => {
                let query = this.provider.findOne({ id: context.id }, 'id');
                query.then(entry => {
                    resolve(new api_core_1.ApiEdgeQueryResponse(!!entry));
                }).catch(reject);
            });
        };
    }
    static applyFilter(item, filter) {
        switch (filter.type) {
            case api_core_1.ApiEdgeQueryFilterType.Equals:
                item[filter.field] = filter.value;
                break;
            case api_core_1.ApiEdgeQueryFilterType.NotEquals:
                item[filter.field] = { $ne: filter.value };
                break;
            case api_core_1.ApiEdgeQueryFilterType.GreaterThan:
                item[filter.field] = { $gt: filter.value };
                break;
            case api_core_1.ApiEdgeQueryFilterType.GreaterThanOrEquals:
                item[filter.field] = { $gte: filter.value };
                break;
            case api_core_1.ApiEdgeQueryFilterType.LowerThan:
                item[filter.field] = { $lt: filter.value };
                break;
            case api_core_1.ApiEdgeQueryFilterType.LowerThanOrEquals:
                item[filter.field] = { $lte: filter.value };
                break;
            default:
                return false;
        }
    }
    applyFilters(item, filters) {
        if (!filters.length)
            return true;
        filters.forEach(filter => MongooseModelEdge.applyFilter(item, filter));
    }
}
MongooseModelEdge.defaultIdField = "id";
exports.MongooseModelEdge = MongooseModelEdge;
//# sourceMappingURL=MongooseModelEdge.js.map