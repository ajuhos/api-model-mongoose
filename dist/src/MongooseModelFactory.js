"use strict";
const api_core_1 = require("api-core");
const mongoose = require("mongoose");
const MongooseModelEdge_1 = require("./MongooseModelEdge");
class MongooseModelFactory {
    static createModel(name, plural, scheme, publicScheme, keyField = MongooseModelEdge_1.MongooseModelEdge.defaultKeyField) {
        let model = new MongooseModelEdge_1.MongooseModelEdge();
        model.name = name;
        model.pluralName = plural;
        model.provider = mongoose.model(name, new mongoose.Schema(scheme));
        model.schema = new api_core_1.ApiEdgeSchema(publicScheme);
        model.keyField = keyField;
        return model;
    }
    static createModelOnConnection(connection, name, plural, scheme, publicScheme, keyField = MongooseModelEdge_1.MongooseModelEdge.defaultKeyField) {
        let model = new MongooseModelEdge_1.MongooseModelEdge();
        model.name = name;
        model.pluralName = plural;
        model.provider = connection.model(name, new mongoose.Schema(scheme));
        model.schema = new api_core_1.ApiEdgeSchema(publicScheme);
        model.keyField = keyField;
        return model;
    }
}
exports.MongooseModelFactory = MongooseModelFactory;
//# sourceMappingURL=MongooseModelFactory.js.map