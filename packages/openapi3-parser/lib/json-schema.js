const _ = require('lodash');

// Ported from packages/openapi2-parser/lib/json-schema.js. The Swagger 2 parser has always
// produced a JSON Schema for message bodies; the OpenAPI 3 parser never did, which left
// consumers comparing responses against a generated example and treating every key in it as
// required. Three things differ from the original:
//
//   1. references are '#/components/schemas/X', not '#/definitions/X'
//   2. emitted references are rewritten to '#/definitions/X', because the result is a
//      standalone JSON Schema whose referenced schemas are copied into definitions
//   3. OpenAPI's `nullable` is translated into a draft-04 type union, since `nullable` is
//      not a JSON Schema keyword and a validator would otherwise reject a legitimate null

class ReferenceError extends Error {}

// The prefix a converted schema's internal references use, since the referenced schemas are
// copied into `definitions` rather than left under `components`.
const localReference = reference => `#/definitions/${reference.split('/').pop()}`;

// Test whether a key is a special Swagger extension.
const isExtension = (value, key) => _.startsWith(key, 'x-');

const parseReference = (reference) => {
  const parts = reference.split('/');

  if (parts[0] !== '#') {
    throw new ReferenceError('Schema reference must start with document root (#)');
  }

  if (parts[1] !== 'components' || parts[2] !== 'schemas' || parts.length !== 4) {
    throw new ReferenceError('Schema reference must be reference to #/components/schemas');
  }

  const id = parts[3];

  return id;
};

/**
 * Lookup a reference
 *
 * Resolves a reference in the given root schema. An optional depth argument
 * can be provided to limit resolution to a certain level. For example to
 * limit the `#/definitions/User/properties/name` reference lookup to just a
 * depth `#/definitions/User`, a depth of 3 can be supplied.
 *
 * @param reference {string} - Example: #/definitions/User/properties/name
 * @param root {object} - The object to resolve the given reference
 * @param depth {number} - A limit to resolving the depth
 *
 * @private
 */
const lookupReference = (reference, root, depth) => {
  const parts = reference.split('/').reverse();

  if (parts.pop() !== '#') {
    throw new ReferenceError('Schema reference must start with document root (#)');
  }

  if (parts.pop() !== 'components' || parts.pop() !== 'schemas') {
    throw new ReferenceError('Schema reference must be reference to #/components/schemas');
  }

  const id = parts[parts.length - 1];
  let value = root.components ? root.components.schemas : undefined;

  // ['#', 'components', 'schemas'] (3)
  let currentDepth = 3;

  while (parts.length > 0 && value !== undefined) {
    const key = parts.pop();
    value = value[key];
    currentDepth += 1;

    if (depth && depth === currentDepth) {
      break;
    }
  }

  if (value === undefined) {
    throw new ReferenceError(`Reference to ${reference} does not exist`);
  }

  return {
    id,
    referenced: value,
  };
};

const pathHasCircularReference = (paths, path, reference) => {
  const currentPath = (path || []).join('/');

  // Check for direct circular reference
  if (currentPath === reference || currentPath.startsWith(`${reference}/`)) {
    return true;
  }

  // Check for indirect circular Reference
  if ((paths || []).find(p => p === reference || p.startsWith(`${reference}/`))) {
    return true;
  }

  return false;
};

const dereference = (example, root, paths, path) => {
  // We shouldn't even be dereferencing examples, but given how swagger-parser
  // works it had been doing this from the start (which was caught later).
  //
  // See https://github.com/apiaryio/api-elements.js/issues/220
  //
  // At thsi point, changing that behaviour would be a significant breaking
  // change and it will affect some of our larger users. Not to mention that
  // swagger-parser will still dereference the examples in cases where our code
  // path doesn't, it won't be easy to solve.
  //
  // The below code attemps to dereference an example, but if we can't we
  // will just return the example (possibly a "reference object") to be
  // the example value.

  if (example === null || example === undefined) {
    return example;
  }

  if (example.$ref && _.isString(example.$ref)) {
    const refPath = example.$ref.split('/');
    const currentPath = (path || []).join('/');

    if (path && pathHasCircularReference(paths, path, example.$ref)) {
      return {};
    }

    let ref;

    try {
      ref = lookupReference(example.$ref, root);
    } catch (error) {
      if (error instanceof ReferenceError) {
        // Cannot find the reference, use example
        return example;
      }

      throw error;
    }

    const newPaths = (paths || []).concat([currentPath]);
    return dereference(ref.referenced, root, newPaths, refPath);
  }

  if (_.isArray(example)) {
    return example.map(value => dereference(value, root, paths, path));
  }

  if (_.isObject(example)) {
    const result = {};

    _.forOwn(example, (value, key) => {
      result[key] = dereference(value, root, paths, (path || []).concat([key]));
    });

    return result;
  }

  return example;
};

const convertSubSchema = (schema, references, swagger) => {
  if (schema.$ref) {
    references.push(schema.$ref);
    return { $ref: localReference(schema.$ref) };
  }

  const recurseConvertSubSchema = s => convertSubSchema(s, references, swagger);

  let actualSchema = _.omit(schema, ['discriminator', 'readOnly', 'xml', 'externalDocs', 'example']);
  actualSchema = _.omitBy(actualSchema, isExtension);
  actualSchema = _.cloneDeep(actualSchema);

  if (schema.type === 'file') {
    // file is not a valid JSON Schema type let's pick string instead
    actualSchema.type = 'string';
  }

  if (schema.pattern && schema.minLength && schema.pattern.startsWith('^[') && schema.pattern.endsWith(']*$')) {
    // If a schema has a minimal length (minLength) > 0 AND there is a regex
    // such as: `^[A-z]*$`, the schema can resolve to an empty string which
    // doesn't match minLength.
    //
    // JSON Schema Faker will fail in that case and get into an infinite loop.
    actualSchema.pattern = schema.pattern.replace('*$', '+$');
  }

  if (schema.example) {
    actualSchema.examples = [dereference(schema.example, swagger)];
  }

  if (schema['x-nullable']) {
    if (actualSchema.type) {
      actualSchema.type = [actualSchema.type, 'null'];
    } else if (actualSchema.enum === undefined) {
      actualSchema.type = 'null';
    }

    if (actualSchema.enum && !actualSchema.enum.includes(null)) {
      actualSchema.enum.push(null);
    }
  }

  if (schema.allOf) {
    actualSchema.allOf = schema.allOf.map(recurseConvertSubSchema);
  }

  if (schema.anyOf) {
    actualSchema.anyOf = schema.anyOf.map(recurseConvertSubSchema);
  }

  if (schema.oneOf) {
    actualSchema.oneOf = schema.oneOf.map(recurseConvertSubSchema);
  }

  if (schema.not) {
    actualSchema.not = recurseConvertSubSchema(schema.not);
  }

  // Array

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      actualSchema.items = schema.items.map(recurseConvertSubSchema);
    } else {
      actualSchema.items = recurseConvertSubSchema(schema.items);
    }
  }

  if (schema.additionalItems && typeof schema.additionalItems === 'object') {
    actualSchema.additionalItems = recurseConvertSubSchema(schema.additionalItems);
  }

  // Object

  if (schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      actualSchema.properties[key] = recurseConvertSubSchema(schema.properties[key]);
    });
  }

  if (schema.patternProperties) {
    Object.keys(schema.patternProperties).forEach((key) => {
      actualSchema.patternProperties[key] = recurseConvertSubSchema(schema.patternProperties[key]);
    });
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    actualSchema.additionalProperties = recurseConvertSubSchema(schema.additionalProperties);
  }

  // OpenAPI's `nullable` is not a JSON Schema keyword, so a validator would reject the null a
  // nullable field legitimately carries. Translated here, on the converted schema, so nested
  // references have already been rewritten.
  if (actualSchema.nullable) {
    delete actualSchema.nullable;

    // allOf is checked before type. OpenAPI 3 requires a type beside nullable for the keyword
    // to apply, so a nullable reference carries both - and widening the type while keeping the
    // reference achieves nothing, because allOf applies unconditionally and the referenced
    // schema still rejects null.
    if (Array.isArray(actualSchema.allOf)) {
      actualSchema.anyOf = actualSchema.allOf.concat([{ type: 'null' }]);
      delete actualSchema.allOf;
      delete actualSchema.type;
    } else if (typeof actualSchema.type === 'string') {
      actualSchema.type = [actualSchema.type, 'null'];
    }
  }

  return actualSchema;
};

/**
 * Returns true if the given schema contains any references
 *
 * @private
 */
const checkSchemaHasReferences = (schema) => {
  if (!schema) {
    return false;
  }

  if (schema.$ref) {
    return true;
  }

  return Object.values(schema).some((value) => {
    if (_.isArray(value)) {
      return value.some(checkSchemaHasReferences);
    }

    if (_.isObject(value)) {
      return checkSchemaHasReferences(value);
    }

    return false;
  });
};

/**
 * Traverses the entire schema to find all of the references
 * @returns array of each reference that is found in the schema
 * @private
 */

// The dialect a converted schema declares. An OpenAPI 3.0 Schema Object is a draft-04
// variant; a 3.1 one is JSON Schema 2020-12 outright. Declaring the wrong one is not
// cosmetic - a validator reading draft-04 rejects a numeric `exclusiveMinimum` as invalid and
// refuses the schema, so a document that says exactly what it means cannot be validated.
const DRAFT_04 = 'http://json-schema.org/draft-04/schema#';
const DRAFT_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

/**
 * Convert Swagger schema to JSON Schema
 * @param schema - The Swagger schema to convert
 * @param root - The document root (this contains the JSON schema definitions)
 * @param swagger - The swagger document root (this contains the Swagger schema definitions)
 * @param copyDefinitins - Whether to copy the referenced definitions to the resulted schema
 * @private
 */
const convertSchema = (schema, root, swagger, copyDefinitions = true, dialect = DRAFT_04) => {
  const references = [];
  const result = convertSubSchema(schema, references, swagger);

  if (copyDefinitions) {
    result.$schema = dialect;

    if (references.length !== 0) {
      result.definitions = {};
    }

    while (references.length !== 0) {
      const lookup = lookupReference(references.pop(), root, 3);

      if (result.definitions[lookup.id] === undefined) {
        // Converted, not copied verbatim. A copied schema keeps whatever references the
        // document wrote, and those point at '#/components/schemas', which does not exist in
        // the schema being produced. Converting rewrites them to the definitions the result
        // carries. The placeholder is assigned first so a schema that reaches itself
        // terminates instead of recursing until the stack ends.
        result.definitions[lookup.id] = {};
        result.definitions[lookup.id] = convertSubSchema(lookup.referenced, references, swagger);
      }
    }
  }

  if (result.$ref && copyDefinitions) {
    // result.$ref is already the local '#/definitions/X' form written by convertSubSchema,
    // so the id comes from it directly rather than from another lookup in the document.
    const id = result.$ref.split('/').pop();

    if (!checkSchemaHasReferences(result.definitions[id])) {
      // Dereference the root reference if possible
      return result.definitions[id];
    }

    // Wrap any root reference in allOf because faker will end up in
    // loop with root references which is avoided with allOf
    return {
      allOf: [{ $ref: result.$ref }],
      definitions: result.definitions,
    };
  }

  return result;
};

const convertSchemaDefinitions = (definitions) => {
  const jsonSchemaDefinitions = {};

  if (definitions) {
    _.forOwn(definitions, (schema, key) => {
      jsonSchemaDefinitions[key] = convertSchema(schema, { definitions }, { definitions }, false);
    });
  }

  return jsonSchemaDefinitions;
};

module.exports = {
  isExtension,
  parseReference,
  lookupReference,
  dereference,
  convertSchema,
  convertSchemaDefinitions,
  DRAFT_04,
  DRAFT_2020_12,
  pathHasCircularReference,
};
