import {ApiEdgeSchema, Mixed, SchemaReference, SubSchema} from "api-core";
import * as mongoose from "mongoose";
import {MongooseModelEdge} from "./MongooseModelEdge";



export class MongooseModelFactory {

    static createModel(name: string, plural: string, schema: any, publicSchema: any = null, keyField: string = MongooseModelEdge.defaultKeyField) {
        let model = new MongooseModelEdge<mongoose.Document>(publicSchema, schema);
        model.name = name;
        model.pluralName = plural;
        model.provider = mongoose.model<mongoose.Document>(name, new mongoose.Schema(schema));
        model.keyField = keyField;
        return model
    }

    static createModelWithoutTyping(name: string, plural: string, schema: any, publicSchema: any, keyField: string = MongooseModelEdge.defaultKeyField) {
        let model = new MongooseModelEdge<mongoose.Document>(publicSchema, null);
        model.name = name;
        model.pluralName = plural;
        model.provider = mongoose.model<mongoose.Document>(name, new mongoose.Schema(schema));
        model.keyField = keyField;
        return model
    }

    static createModelOnConnection(connection: mongoose.Connection, name: string, plural: string, schema: any, publicSchema: any = null, keyField: string = MongooseModelEdge.defaultKeyField) {
        let model = new MongooseModelEdge<mongoose.Document>(publicSchema, schema);
        model.name = name;
        model.pluralName = plural;
        model.provider = connection.model<mongoose.Document>(name, new mongoose.Schema(schema));
        model.keyField = keyField;
        return model
    }

}
