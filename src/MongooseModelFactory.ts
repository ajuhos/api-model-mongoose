import {ApiEdgeSchema} from "api-core";
import * as mongoose from "mongoose";
import {MongooseModelEdge} from "./MongooseModelEdge";

export class MongooseModelFactory {

    static createModel(name: string, plural: string, scheme: any, publicScheme: any) {
        let model = new MongooseModelEdge<mongoose.Document>();
        model.name = name;
        model.pluralName = plural;
        model.provider = mongoose.model<mongoose.Document>(name, new mongoose.Schema(scheme));
        model.schema = new ApiEdgeSchema(publicScheme);
        return model
    }

}
