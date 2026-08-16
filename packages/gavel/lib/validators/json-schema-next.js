const Ajv = require('ajv');
const Ajv2020 = require('ajv/dist/2020');
const AjvDraft04 = require('ajv-draft-04');

const metaSchemaV4 = require('ajv-draft-04/dist/refs/json-schema-draft-04.json');
const metaSchemaV6 = require('ajv/dist/refs/json-schema-draft-06.json');
const metaSchemaV7 = require('ajv/dist/refs/json-schema-draft-07.json');
const metaSchema2020 = require('ajv/dist/refs/json-schema-2020-12/schema.json');

const errors = require('../errors');
const parseJson = require('../utils/parseJson');

const SCHEMA_VERSIONS = {
  draftV4: 'http://json-schema.org/draft-04/schema',
  draftV6: 'http://json-schema.org/draft-06/schema',
  draftV7: 'http://json-schema.org/draft-07/schema',
  draft2020: 'https://json-schema.org/draft/2020-12/schema'
};

const META_SCHEMA = {
  draftV4: metaSchemaV4,
  draftV6: metaSchemaV6,
  draftV7: metaSchemaV7,
  draft2020: metaSchema2020
};

// One dialect per compiler. ajv dropped draft-04 from its core at version 7 and keeps
// 2020-12 behind a separate entry point, so the version stated by the schema decides which
// compiler reads it rather than one instance being asked to speak every dialect.
const compilerFor = (schemaVersion, options) => {
  switch (schemaVersion) {
    case 'draftV4':
      return new AjvDraft04(options);
    case 'draft2020':
      return new Ajv2020(options);
    case 'draftV6': {
      // ajv 8 knows draft-07 out of the box and draft-06 only once told about it - but only
      // where a meta schema is wanted. Registering it while validating data collides with
      // the data's own schema when that schema is the draft-06 meta schema itself, which is
      // exactly what a test of draft-06 support validates against.
      const ajv = new Ajv(options);
      if (options.meta !== false) {
        ajv.addMetaSchema(metaSchemaV6);
      }
      return ajv;
    }
    default:
      return new Ajv(options);
  }
};

const last = (list) => {
  return list[list.length - 1];
};

/**
 * Returns a JSON Schema Draft version of the given JSON Schema.
 */
const getExplicitSchemaVersion = (jsonSchema) => {
  const currentVersion = jsonSchema.$schema && jsonSchema.$schema;
  return Object.keys(SCHEMA_VERSIONS).find((version) => {
    const jsonSchemaAnnotation = SCHEMA_VERSIONS[version];
    return currentVersion && currentVersion.includes(jsonSchemaAnnotation);
  });
};

const getImplicitSchemaVersion = (jsonSchema) => {
  // A single boolean value is a valid JSON Schema Draft 7
  if (typeof jsonSchema === 'boolean') {
    return 'draftV7';
  }
};

/**
 * @deprecate
 * Attempts to resolve a schema version for a JSON Schema
 * without the explicit version.
 */
const getImplicitLegacySchemaVersion = (jsonSchema) => {
  const ajv = new AjvDraft04({ strict: false, logger: false });
  try {
    return ajv.validateSchema(jsonSchema) ? 'draftV4' : null;
  } catch (error) {
    // A schema this compiler cannot even read is not a draft-04 schema.
    return null;
  }
};

const getSchemaVersion = (jsonSchema) => {
  return (
    getExplicitSchemaVersion(jsonSchema) ||
    getImplicitSchemaVersion(jsonSchema) ||
    getImplicitLegacySchemaVersion(jsonSchema)
  );
};

/**
 * Returns the schema with any identifier that is not a string removed.
 *
 * Draft-04 says "id" is a string, and a generated schema does not always agree: array items
 * numbered by their index - {"items": [{"id": 0}, {"id": 1}]} - come out of description
 * documents in the wild. ajv 6 ignored those quietly; ajv 8 resolves every identifier and
 * fails on one it cannot treat as a URI, taking a document with it. Dropping the identifier
 * loses nothing a validator would have used, since a non-string one can never be referenced.
 */
// Keywords whose values are data rather than schemas. Descending into them would strip an
// "id" belonging to an example or an allowed value, changing what the schema accepts.
const DATA_KEYWORDS = new Set(['enum', 'const', 'default', 'example', 'examples']);

// Keywords whose values map a NAME to a schema. The names are the API's own - a property
// really can be called "id" - so they are never read as keywords themselves.
const SCHEMA_MAP_KEYWORDS = new Set([
  'properties',
  'patternProperties',
  'definitions',
  '$defs',
  'dependencies'
]);

/**
 * Returns the schema without the keywords ajv 6 ignored and ajv 8 refuses.
 *
 * Description documents in the wild carry draft-3 spellings under a draft-04 declaration:
 * array items numbered by index - {"items": [{"id": 0}]} - and "required": true on a
 * property, where draft-04 wants an array of names on the parent. ajv 6 passed over both
 * quietly. ajv 8 resolves every identifier and type-checks every keyword, so either one
 * throws and takes the whole document with it - a document that used to validate, weakly,
 * now cannot be validated at all.
 *
 * Dropping them reproduces what ajv 6 did: a non-string identifier can never be referenced,
 * and a boolean "required" was never read by a draft-04 validator.
 */
const withoutLegacyKeywords = (node) => {
  if (Array.isArray(node)) {
    return node.map(withoutLegacyKeywords);
  }
  if (node === null || typeof node !== 'object') {
    return node;
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(node)) {
    if ((key === 'id' || key === '$id') && typeof value !== 'string') {
      continue;
    }

    // Draft-3 spelled "required" as a boolean on the property itself.
    if (key === 'required' && !Array.isArray(value)) {
      continue;
    }

    if (DATA_KEYWORDS.has(key)) {
      cleaned[key] = value;
      continue;
    }

    if (
      SCHEMA_MAP_KEYWORDS.has(key) &&
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      const named = {};
      for (const [name, subSchema] of Object.entries(value)) {
        named[name] = withoutLegacyKeywords(subSchema);
      }
      cleaned[key] = named;
      continue;
    }

    cleaned[key] = withoutLegacyKeywords(value);
  }
  return cleaned;
};

class JsonSchemaValidator {
  // Assignment rather than the constructor alone: a caller can swap the schema on an
  // existing validator and validate again, and that schema needs the same treatment.
  set jsonSchema(value) {
    this.resolvedJsonSchema = withoutLegacyKeywords(value);
  }

  get jsonSchema() {
    return this.resolvedJsonSchema;
  }

  constructor(jsonSchema) {
    this.jsonSchema = this.resolveJsonSchema(jsonSchema);
    this.jsonSchemaVersion = getSchemaVersion(this.jsonSchema);

    if (this.jsonSchemaVersion == null) {
      const supportedVersions = Object.keys(SCHEMA_VERSIONS).join('/');

      // Including all supported JSON Schema versions (even legacy)
      // so that derived JsonSchemaLegacy class doesn't have to duplicate
      // this version existence check.
      throw new errors.JsonSchemaNotSupported(
        `Expected a supported version of JSON Schema (${supportedVersions}).`
      );
    }

    this.jsonMetaSchema = this.getMetaSchema();

    const isSchemaValid = this.validateSchema();
    if (!isSchemaValid) {
      throw new errors.JsonSchemaNotValid(
        `Provided JSON Schema is not a valid JSON Schema ${this.jsonSchemaVersion}.`
      );
    }
  }

  /**
   * Parses given JSON Schema string.
   * Prevents invalid JSON to be consumed by a validator.
   */
  resolveJsonSchema(jsonSchema) {
    let resolvedJsonSchema = jsonSchema;

    if (typeof jsonSchema === 'string') {
      try {
        resolvedJsonSchema = parseJson(jsonSchema);
      } catch (error) {
        const unparsableJsonSchemaError = new errors.SchemaNotJsonParsableError(
          `Given JSON Schema is not a valid JSON. ${error.message}`
        );
        unparsableJsonSchemaError.schema = jsonSchema;
        throw unparsableJsonSchemaError;
      }
    }

    return resolvedJsonSchema;
  }

  /**
   * Returns a meta schema for the provided JSON Schema.
   */
  getMetaSchema() {
    return META_SCHEMA[this.jsonSchemaVersion];
  }

  /**
   * Validates the schema against its version specification.
   * @return {boolean}
   */
  validateSchema() {
    const { jsonSchemaVersion, jsonSchema } = this;
    // strict mode off: it rejects keywords a dialect permits but ajv does not recognise, and
    // a description document is not ours to reject on style. logger off: ajv would otherwise
    // print those same complaints to the console during a normal validation run.
    const ajv = compilerFor(jsonSchemaVersion, { strict: false, logger: false });

    try {
      return Boolean(ajv.validateSchema(jsonSchema));
    } catch (error) {
      return false;
    }
  }

  parseData(data) {
    let resolvedData = data;

    if (typeof data === 'string') {
      try {
        resolvedData = parseJson(data);
      } catch (error) {
        const dataError = new errors.DataNotJsonParsableError(
          `Expected data to be a valid JSON, but got: ${data}. ${error.message}`
        );
        error.data = data;
        throw dataError;
      }
    }

    return resolvedData;
  }

  /**
   * Validates the given data.
   */
  validate(data) {
    const parsedData = this.parseData(data);

    const ajv = compilerFor(this.jsonSchemaVersion, {
      // Enable for error messages to include enum violations.
      allErrors: true,
      // Enable verbose mode for error messages to include
      // the actual values in `error[n].data`.
      verbose: true,
      // Disable adding a meta schema by default; the version the schema states decides
      // which compiler reads it.
      meta: false,
      // No need to validate schema again, already validated in "validateSchema()".
      validateSchema: false,
      // A description document is not ours to reject on style, and ajv should not print
      // its opinions to the console mid-run.
      strict: false,
      logger: false
    });

    ajv.validate(this.jsonSchema, parsedData);

    // Convert AJV validation errors to the Gavel public validation errors.
    return (ajv.errors || []).map((ajvError) => {
      const relevantProperty = this.getErrorProperty(ajvError);

      const pointer = ajvError.instancePath.concat(
        // Handle root-level pointers.
        // AJV returns an empty `dataPath` when a root-level property
        // rejects. TV4, however, used to return a pointer to a root-level
        // property regardless. Keep backward-compatibility.
        relevantProperty ? ['/', relevantProperty].join('') : ''
      );

      // Property is pretty much 1-1 representation of the pointer
      // stored in the list of strings.
      const property = pointer.split('/').filter(Boolean);

      const errorMessage = this.getBackwardCompatibleErrorMessage(
        ajv,
        ajvError,
        pointer,
        property
      );

      return {
        message: errorMessage,
        location: {
          pointer,
          property
        }
      };
    });
  }

  getErrorProperty(ajvError) {
    switch (ajvError.keyword) {
      case 'required':
        return ajvError.params.missingProperty;
      case 'additionalProperties':
        return ajvError.params.additionalProperty;
      default:
        return null;
    }
  }

  /**
   * @deprecate
   * Coerces AJV validation error message to the error message
   * previously produced by Amanda/TV4 for backward-compatibility.
   */
  getBackwardCompatibleErrorMessage(ajv, ajvError, pointer, property) {
    const { keyword, data, params } = ajvError;

    switch (keyword) {
      case 'type':
        return `At '${pointer}' Invalid type: ${
          data === null ? null : typeof data
        } (expected ${params.type})`;

      case 'required':
        return `At '${pointer}' Missing required property: ${last(property)}`;

      case 'enum':
        return `At '${pointer}' No enum match for: "${data}"`;

      default:
        // ajv 7 reworded its standard messages from "should ..." to "must ...". The wording
        // reaches a user through dredd's report and is compared verbatim by anything
        // treating dredd as a reference, so the previous phrasing is kept.
        return ajv.errorsText([ajvError]).replace(/\bmust\b/, 'should');
    }
  }
}

module.exports = {
  JsonSchemaValidator,
  getSchemaVersion,
  META_SCHEMA
};
