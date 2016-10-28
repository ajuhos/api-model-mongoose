/// <reference types="mongoose" />
import { ApiEdgeDefinition, ApiEdgeQueryContext, ApiEdgeQueryResponse } from "api-core";
import * as mongoose from "mongoose";
export declare class MongooseModelEdge<T extends mongoose.Document> implements ApiEdgeDefinition {
    name: string;
    pluralName: string;
    idField: string;
    provider: mongoose.Model<T>;
    methods: any;
    relations: never[];
    inspect: () => string;
    private static applyFilter(item, filter);
    private applyFilters(item, filters);
    getEntry: (context: ApiEdgeQueryContext) => Promise<ApiEdgeQueryResponse>;
    listEntries: (context: ApiEdgeQueryContext) => Promise<ApiEdgeQueryResponse>;
    createEntry: (context: ApiEdgeQueryContext, body: any) => Promise<ApiEdgeQueryResponse>;
    patchEntry: (context: ApiEdgeQueryContext, body: any) => Promise<ApiEdgeQueryResponse>;
    updateEntry: (context: ApiEdgeQueryContext, body: any) => Promise<ApiEdgeQueryResponse>;
    updateEntries: () => Promise<ApiEdgeQueryResponse>;
    removeEntry: (context: ApiEdgeQueryContext, body: any) => Promise<ApiEdgeQueryResponse>;
    removeEntries: () => Promise<ApiEdgeQueryResponse>;
    exists: (context: ApiEdgeQueryContext) => Promise<ApiEdgeQueryResponse>;
    callMethod: (context: ApiEdgeQueryContext, body: any) => Promise<ApiEdgeQueryResponse>;
}
