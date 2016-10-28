/// <reference types="mongoose" />
import * as mongoose from "mongoose";
import { MongooseModelEdge } from "./MongooseModelEdge";
export declare class MongooseModelFactory {
    static createModel(name: string, plural: string, scheme: any): MongooseModelEdge<mongoose.Document>;
}
