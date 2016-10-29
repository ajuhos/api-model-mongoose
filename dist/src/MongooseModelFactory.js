"use strict";
const mongoose = require("mongoose");
const MongooseModelEdge_1 = require("./MongooseModelEdge");
class MongooseModelFactory {
    static createModel(name, plural, scheme) {
        let model = new MongooseModelEdge_1.MongooseModelEdge();
        model.name = name;
        model.pluralName = plural;
        model.provider = mongoose.model(name, new mongoose.Schema(scheme));
        model.fields = Object.keys(scheme);
        return model;
    }
}
exports.MongooseModelFactory = MongooseModelFactory;
//# sourceMappingURL=MongooseModelFactory.js.map