"use strict";
const api_core_1 = require("api-core");
const mongoose = require("mongoose");
const MongooseModelEdge_1 = require("./MongooseModelEdge");
class MongooseModelFactory {
    static createModel(name, plural, scheme, publicScheme) {
        let model = new MongooseModelEdge_1.MongooseModelEdge();
        model.name = name;
        model.pluralName = plural;
        model.provider = mongoose.model(name, new mongoose.Schema(scheme));
        model.schema = new api_core_1.ApiEdgeSchema(publicScheme);
        return model;
    }
}
exports.MongooseModelFactory = MongooseModelFactory;
//# sourceMappingURL=MongooseModelFactory.js.map