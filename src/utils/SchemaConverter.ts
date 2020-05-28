import * as mongoose from "mongoose";
import {
    Api,
    ApiEdgeDefinition, ApiEdgeSchemaTransformation,
    JSONDate, LazyApiEdge,
    Mixed,
    OneToManyRelation,
    OneToOneRelation,
    SchemaReference,
    SubSchema
} from "api-core";

function mapFieldToSimple(field: any) {
    //TODO
    return field
}

export function mapSchema(schema: any, publicSchema: any) {
    const publicFields = Object.keys(publicSchema);
    const output: { [key: string]: any } = {};
    for(let field of publicFields) {
        //TODO. Support deep fields
        const publicField = publicSchema[field];
        let schemaField;
        if(publicField instanceof ApiEdgeSchemaTransformation) {
            schemaField = publicField.schemaType
        }
        else {
            let privateField = publicField === '=' ? field : publicField.substring(1);
            schemaField = schema[privateField]
        }
        if(schemaField) {
            output[field] = mapFieldToSimple(schemaField)
        }
    }
    return output
}

export type RelationMetadata = {
    name?: string
    foreignName?: string
    type?: 'one-to-one'|'many-to-many'|'many-to-one'
}

const conversionCache: any[] = [];
let index = 0;
function mapSchemaFieldType(type: any): any {
    if(type === mongoose.Schema.Types.ObjectId) return SchemaReference;
    if(type === mongoose.Schema.Types.Mixed) return Mixed;
    if(type === Date) return JSONDate;

    if(type === Object) {
        return {
            type: Object,
            blackbox: true
        }
    }

    if(typeof type === "object") {
        if(type instanceof mongoose.Schema) {
            if ((type as any)._apiCoreMongoSchemaIndex) return conversionCache[(type as any)._apiCoreMongoSchemaIndex];

            (type as any)._apiCoreMongoSchemaIndex = ++index;
            return conversionCache[(type as any)._apiCoreMongoSchemaIndex]
                = new SubSchema(convertMongooseSchemaToSimplSchema((type as any).tree))
        }
        else {
            return new SubSchema(convertMongooseSchemaToSimplSchema(type))
        }
    }

    return type
}

function prepareSchemaReference(key: string, { ref: foreignEdgeName, relation = {} }: { ref: string, relation?: RelationMetadata }, api: Api, edge: ApiEdgeDefinition) {
    const foreignEdge = api.resolver.resolveEdgeLazy(foreignEdgeName, false);
    if(foreignEdge) {
        const isLazy = foreignEdge instanceof LazyApiEdge;
        const relationIndex = isLazy
            ? -1
            : foreignEdge.relations.findIndex(r => r.to === edge || r.from === edge);

        if(relationIndex === -1) {
            api.relation(new OneToOneRelation(edge, foreignEdge, {
                relationId: key,
                name: relation.name || key
            }));

            if(relation.type !== 'one-to-one') {
                const foreignRelation = new OneToManyRelation(foreignEdge, edge, {
                    relatedId: key,
                    relationId: isLazy ? 'id' : foreignEdge.idField,
                    name: relation.foreignName
                });

                if(isLazy) {
                    foreignRelation.onResolve = () => {
                        foreignRelation.relationId = foreignEdge.idField
                    }
                }

                api.relation(foreignRelation)
            }
        }
    }
}

function prepareSchemaReferenceArray(key: string, { ref: foreignEdgeName, relation = {} }: { ref: string, relation?: RelationMetadata }, api: Api, edge: ApiEdgeDefinition) {
    const foreignEdge = api.resolver.resolveEdgeLazy(foreignEdgeName, false);
    if(foreignEdge) {
        const isLazy = foreignEdge instanceof LazyApiEdge;
        const relationIndex = isLazy
            ? -1
            : foreignEdge.relations.findIndex(r => r.to === edge || r.from === edge);

        if(relationIndex === -1) {
            const hasPair = relation.type !== 'many-to-one';
            let localRelation = new OneToManyRelation(edge, foreignEdge, {
                relationId: key,
                relatedId: isLazy ? 'id' : foreignEdge.idField,
                name: relation.name || key,
                hasPair
            });

            if(isLazy) {
                localRelation.onResolve = () => {
                    foreignRelation.relatedId = foreignEdge.idField
                }
            }

            api.relation(localRelation);

            let foreignRelation: OneToManyRelation|OneToOneRelation;
            if (hasPair) {
                foreignRelation = new OneToManyRelation(foreignEdge, edge, {
                    relatedId: key,
                    relationId: isLazy ? 'id' : foreignEdge.idField,
                    name: relation.foreignName,
                    hasPair
                })
            }
            else {
                foreignRelation = new OneToOneRelation(foreignEdge, edge, {
                    relatedId: key,
                    relationId: isLazy ? 'id' : foreignEdge.idField,
                    name: relation.foreignName
                })
            }

            if(isLazy) {
                foreignRelation.onResolve = () => {
                    foreignRelation.relationId = foreignEdge.idField
                }
            }

            api.relation(foreignRelation)
        }
    }
}

function mapSchemaField(field: any, api?: Api, edge?: ApiEdgeDefinition, key?: string): any {
    if(Array.isArray(field)) {
        const innerField = field[0];
        if(api && edge && key && typeof innerField == "object" && innerField.type && innerField.ref) {
            prepareSchemaReferenceArray(key, innerField, api, edge);
        }
        return [ mapSchemaField(innerField) ]
    }
    else if(typeof field == "object" && field.type) {
        const output = {
            ...field,
            type: mapSchemaFieldType(field.type)
        };

        if(field.type === Object) {
            output.blackbox = true;
            output.type = Object
        }

        if(typeof output.default !== "undefined") {
            const defaultGetter = output.default;
            if(typeof defaultGetter === "function") {
                output.autoValue = function() {
                    if(this.isSet) return this.value;
                    return defaultGetter()
                };
            }
            else {
                output.defaultValue = defaultGetter;
            }
            delete output.default
        }

        if(typeof output.ref !== "undefined") {
            if(api && edge && key) prepareSchemaReference(key, output, api, edge);
            delete output.ref;
            delete output.relation
        }

        if(typeof output.enum !== "undefined") {
            output.allowedValues = output.enum;
            delete output.enum
        }

        delete output.unique;
        delete output.sparse;
        delete output.index;
        delete output.select;
        delete output.get;
        delete output.set;
        delete output.validate;
        delete output.private;
        delete output.expires;

        return output
    }
    else {
        return mapSchemaFieldType(field)
    }
}

export function convertMongooseSchemaToSimplSchema(schema: any, api?: Api, edge?: ApiEdgeDefinition) {
    const keys = Object.keys(schema);

    const output: { [key: string]: any } = {};
    if(api && edge) {
        keys.forEach(key => output[key] = mapSchemaField(schema[key], api, edge, key));
    }
    else {
        keys.forEach(key => output[key] = mapSchemaField(schema[key]));
    }

    return output
}

export function buildPublicSchema(schema: any, primary = '') {
    const keys = Object.keys(schema);
    let output: { [key: string]: string } = {};

    if(!primary && keys.indexOf('id') === -1) {
        output['id'] = '=_id';
    }

    for(let key of keys) {
        const entry = schema[key];
        const isComplex = typeof entry === "object" && entry.type;

        if(isComplex && entry.private) continue;

        const fullKey = primary ? `${primary}.${key}` : key;
        output[fullKey] = '=';

        const type = isComplex ? entry.type : entry;
        if(typeof type === "object" && !Array.isArray(type)) {
            output = {
                ...output,
                ...buildPublicSchema(type, fullKey)
            }
        }
    }

    return output
}