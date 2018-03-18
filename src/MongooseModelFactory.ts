import {ApiEdgeSchema} from "api-core";
import * as mongoose from "mongoose";
import {MongooseModelEdge} from "./MongooseModelEdge";

function mapFieldToSimple(field: any) {
    //TODO
    return field
}

function mapSchema(schema: any, publicSchema: any) {
    const publicFields = Object.keys(publicSchema);
    const output: { [key: string]: any } = {};
    for(let field of publicFields) {
        //TODO. Support deep fields
        const schemaField = schema[field];
        if(schemaField) {
            output[field] = mapFieldToSimple(schemaField)
        }
    }
    return output
}

export class MongooseModelFactory {

    static createModel(name: string, plural: string, schema: any, publicSchema: any, keyField: string = MongooseModelEdge.defaultKeyField) {
        let model = new MongooseModelEdge<mongoose.Document>();
        model.name = name;
        model.pluralName = plural;
        model.provider = mongoose.model<mongoose.Document>(name, new mongoose.Schema(schema));
        model.schema = new ApiEdgeSchema(publicSchema, mapSchema(schema, publicSchema));
        model.keyField = keyField;
        return model
    }

    static createModelOnConnection(connection: mongoose.Connection, name: string, plural: string, schema: any, publicSchema: any, keyField: string = MongooseModelEdge.defaultKeyField) {
        let model = new MongooseModelEdge<mongoose.Document>();
        model.name = name;
        model.pluralName = plural;
        model.provider = connection.model<mongoose.Document>(name, new mongoose.Schema(schema));
        model.schema = new ApiEdgeSchema(publicSchema, mapSchema(schema, publicSchema));
        model.keyField = keyField;
        return model
    }

}
