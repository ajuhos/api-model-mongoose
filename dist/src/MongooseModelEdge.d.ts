/// <reference types="mongoose" />
import { ApiEdge, ApiEdgeDefinition, ApiEdgeQueryContext, ApiEdgeQueryResponse } from "api-core";
import * as mongoose from "mongoose";
export declare class MongooseModelEdge<T extends mongoose.Document> extends ApiEdge implements ApiEdgeDefinition {
    name: string;
    pluralName: string;
    idField: string;
    provider: mongoose.Model<T>;
    methods: never[];
    relations: never[];
    actions: never[];
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
}
