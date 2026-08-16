const { Fury } = require('@antimatter-studios/core');
const { expect } = require('../../chai');
const parse = require('../../../../lib/parser/oas/parseMediaTypeObject');
const Context = require('../../../../lib/context');

const { minim: namespace } = new Fury();

describe('Media Type Object', () => {
  let context;
  const messageBodyClass = namespace.elements.HttpResponse;

  beforeEach(() => {
    context = new Context(namespace);
  });

  it('provides warning when media type is non-object', () => {
    const mediaType = new namespace.elements.Member('application/json', null);

    const parseResult = parse(context, messageBodyClass, mediaType);

    expect(parseResult).to.contain.warning("'Media Type Object' is not an object");
  });

  it('provides warning when content type is invalid', () => {
    const mediaType = new namespace.elements.Member('foo', {});

    const parseResult = parse(context, messageBodyClass, mediaType);

    expect(parseResult).to.contain.warning("'Media Type Object' media type 'foo' is invalid");
  });

  it('provides warning when media type is invalid', () => {
    const mediaType = new namespace.elements.Member('*/*', {});

    const parseResult = parse(context, messageBodyClass, mediaType);

    expect(parseResult).to.contain.warning("'Media Type Object' media type '*/*' is invalid");
  });

  it('permits media type with parameters', () => {
    const mediaType = new namespace.elements.Member('application/json; charset=utf-8', {});

    const parseResult = parse(context, messageBodyClass, mediaType);

    const message = parseResult.get(0);
    expect(message).to.be.instanceof(messageBodyClass);
    expect(message.contentType.toValue()).to.equal('application/json; charset=utf-8');
  });

  it('returns a HTTP message body', () => {
    const mediaType = new namespace.elements.Member('application/json', {});

    const parseResult = parse(context, messageBodyClass, mediaType);

    const message = parseResult.get(0);
    expect(message).to.be.instanceof(messageBodyClass);
    expect(message.contentType.toValue()).to.equal('application/json');
  });

  describe('warnings for unsupported properties', () => {
    it('provides warning for unsupported encoding key', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        encoding: {},
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      expect(parseResult).to.contain.warning("'Media Type Object' contains unsupported key 'encoding'");
    });
  });

  describe('#example', () => {
    it('creates an messageBody asset from an example for JSON type', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        example: {
          message: 'Hello World',
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody.toValue()).to.equal('{"message":"Hello World"}');
      expect(message.messageBody.contentType.toValue()).to.equal('application/json');
    });

    it('creates an messageBody asset from an example for JSON subtype', () => {
      const mediaType = new namespace.elements.Member('application/hal+json', {
        example: {
          message: 'Hello World',
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody.toValue()).to.equal('{"message":"Hello World"}');
      expect(message.messageBody.contentType.toValue()).to.equal('application/hal+json');
    });

    it('creates an messageBody asset for text type with text example', () => {
      const mediaType = new namespace.elements.Member('text/plain', {
        example: 'Hello World',
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody.toValue()).to.equal('Hello World');
      expect(message.messageBody.contentType.toValue()).to.equal('text/plain');
    });

    it('creates an messageBody asset for text type with xml example', () => {
      const mediaType = new namespace.elements.Member('application/xml', {
        example: '<?xml version="1.0" encoding="UTF-8"?>',
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody.toValue()).to.equal('<?xml version="1.0" encoding="UTF-8"?>');
      expect(message.messageBody.contentType.toValue()).to.equal('application/xml');
    });

    it('warns for example without supported media type', () => {
      const mediaType = new namespace.elements.Member('application/plist', {
        example: {
          message: 'Hello World',
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody).to.be.undefined;

      expect(parseResult).to.contain.warning(
        "'Media Type Object' 'example' is not supported for media type 'application/plist'"
      );
    });

    it('warns for non-string example with text type', () => {
      const mediaType = new namespace.elements.Member('text/plain', {
        example: { message: 'Hello World' },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      expect(parseResult).to.contain.warning(
        "'Media Type Object' 'example' should be a string for media type 'text/plain'"
      );

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody).to.be.undefined;
    });
  });

  describe('#examples', () => {
    it('provides warning when examples is non-object', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        examples: null,
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      expect(parseResult).to.contain.warning("'Media Type Object' 'examples' is not an object");
    });

    it('ignores empty examples', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        examples: {},
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody).to.be.undefined;
    });

    it('ignores empty example', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        examples: {
          cat: {},
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody).to.be.undefined;
    });

    it('creates an messageBody asset from an example for JSON type', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        examples: {
          cat: {
            value: {
              message: 'Hello World',
            },
          },
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody.toValue()).to.equal('{"message":"Hello World"}');
      expect(message.messageBody.contentType.toValue()).to.equal('application/json');
    });

    it('warns for examples without JSON type', () => {
      const mediaType = new namespace.elements.Member('application/xml', {
        examples: {
          cat: {
            value: {
              message: 'Hello World',
            },
          },
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody).to.be.undefined;

      expect(parseResult).to.contain.warning(
        "'Media Type Object' 'examples' is only supported for JSON media types"
      );
    });

    it('warns for unsupported multiple examples', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        examples: {
          cat: {
            value: {
              message: 'Hello World',
            },
          },
          dog: {
            value: {
              message: 'Hello World',
            },
          },
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);

      expect(parseResult).to.contain.warning(
        "'Media Type Object' 'examples' only one example is supported, other examples have been ignored"
      );
    });
  });

  describe('#schema', () => {
    it('parses a schema into a data structure', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        schema: {
          type: 'object',
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.dataStructure).to.be.instanceof(namespace.elements.DataStructure);
      expect(message.dataStructure.content).to.be.instanceof(namespace.elements.Object);
    });

    it('parses a schema reference into as data structure', () => {
      context.state.components = new namespace.elements.Object({
        schemas: {
          // Data Structure for an Object
          User: new namespace.elements.DataStructure(
            new namespace.elements.Object(undefined, {
              id: 'User',
            })
          ),
        },
      });

      const mediaType = new namespace.elements.Member('application/json', {
        schema: {
          $ref: '#/components/schemas/User',
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.dataStructure).to.be.instanceof(namespace.elements.DataStructure);
      expect(message.dataStructure.content.element).to.equal('User');
    });

    it('generates an messageBody asset for JSON type with no examples', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'doe',
            },
          },
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody.toValue()).to.equal('{"name":"doe"}');
      expect(message.messageBody.contentType.toValue()).to.equal('application/json');
    });

    it('generates a messageBody asset for JSON type with referenced schema with no examples', () => {
      context.state.components = new namespace.elements.Object({
        schemas: {
          Name: new namespace.elements.DataStructure(
            new namespace.elements.String('doe', {
              id: 'Name',
            })
          ),
        },
      });

      const mediaType = new namespace.elements.Member('application/json', {
        schema: {
          type: 'object',
          properties: {
            name: {
              $ref: '#/components/schemas/Name',
            },
          },
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody.toValue()).to.equal('{"name":"doe"}');
      expect(message.messageBody.contentType.toValue()).to.equal('application/json');
    });

    it('generates a messageBody asset for JSON type with circular referenced schema with no examples', () => {
      const node = new namespace.Element();
      node.element = 'Node';

      const nodes = new namespace.Element();
      nodes.element = 'Nodes';

      context.state.components = new namespace.elements.Object({
        schemas: {
          Nodes: new namespace.elements.DataStructure(
            new namespace.elements.Array({
              node,
            }, {
              id: 'Nodes',
            })
          ),
          Node: new namespace.elements.DataStructure(
            new namespace.elements.Object({
              parents: nodes,
            }, {
              id: 'Node',
            })
          ),
        },
      });

      const mediaType = new namespace.elements.Member('application/json', {
        schema: {
          $ref: '#/components/schemas/Node',
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody.toValue()).to.equal('{"parents":[]}');
      expect(message.messageBody.contentType.toValue()).to.equal('application/json');
    });

    it('generates an messageBody asset for text type with string schema', () => {
      const mediaType = new namespace.elements.Member('text/plain', {
        schema: {
          type: 'string',
          example: 'hello world',
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody.toValue()).to.equal('hello world');
      expect(message.messageBody.contentType.toValue()).to.equal('text/plain');
    });

    it('does not generates an messageBody asset for text type with non string type', () => {
      const mediaType = new namespace.elements.Member('text/plain', {
        schema: {
          type: 'number',
          example: 5,
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody).to.be.undefined;
    });

    it('does not generate a messageBody asset when generateMessageBody is disabled', () => {
      context.options.generateMessageBody = false;

      const mediaType = new namespace.elements.Member('application/json', {
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'doe',
            },
          },
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBody).to.be.undefined;
    });
  });
  describe('#messageBodySchema', () => {
    it('generates a schema asset from the schema', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        schema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            nickname: { type: 'string' },
          },
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      const message = parseResult.get(0);
      expect(message).to.be.instanceof(messageBodyClass);
      expect(message.messageBodySchema).to.not.be.undefined;
      expect(message.messageBodySchema.contentType.toValue()).to.equal('application/schema+json');

      const schema = JSON.parse(message.messageBodySchema.toValue());
      // required carries through, which is the whole point: a consumer can tell a property
      // that must be present from one that may be absent.
      expect(schema.required).to.deep.equal(['name']);
      expect(schema.properties.nickname).to.deep.equal({ type: 'string' });
      expect(schema.$schema).to.equal('http://json-schema.org/draft-04/schema#');
    });

    it('translates nullable into a type a JSON Schema validator understands', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        schema: {
          type: 'object',
          properties: { deletedAt: { type: 'string', nullable: true } },
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);
      const schema = JSON.parse(parseResult.get(0).messageBodySchema.toValue());

      // nullable is not a JSON Schema keyword, so leaving it would make a validator reject
      // the null the API legitimately sends.
      expect(schema.properties.deletedAt.type).to.deep.equal(['string', 'null']);
      expect(schema.properties.deletedAt.nullable).to.be.undefined;
    });

    it('translates a nullable reference into a choice including null', () => {
      context.document = {
        components: { schemas: { Payload: { type: 'object', properties: { kind: { type: 'string' } } } } },
      };

      const mediaType = new namespace.elements.Member('application/json', {
        schema: {
          type: 'object',
          properties: {
            payload: { nullable: true, allOf: [{ $ref: '#/components/schemas/Payload' }] },
          },
        },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);
      const schema = JSON.parse(parseResult.get(0).messageBodySchema.toValue());

      // allOf applies unconditionally, so it cannot describe something that may be null.
      expect(schema.properties.payload.anyOf).to.deep.equal([
        { $ref: '#/definitions/Payload' },
        { type: 'null' },
      ]);
      expect(schema.properties.payload.allOf).to.be.undefined;
    });

    it('does not generate a schema asset when generateMessageBodySchema is disabled', () => {
      context.options.generateMessageBodySchema = false;

      const mediaType = new namespace.elements.Member('application/json', {
        schema: { type: 'object' },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      expect(parseResult.get(0).messageBodySchema).to.be.undefined;
    });

    it('does not generate a schema asset for a non-JSON media type', () => {
      const mediaType = new namespace.elements.Member('text/plain', {
        schema: { type: 'string' },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      expect(parseResult.get(0).messageBodySchema).to.be.undefined;
    });

    it('generates no message, and so no schema, when a reference cannot be resolved', () => {
      const mediaType = new namespace.elements.Member('application/json', {
        schema: { $ref: '#/components/schemas/Missing' },
      });

      const parseResult = parse(context, messageBodyClass, mediaType);

      // An unresolvable reference is reported elsewhere; a half-converted schema here would
      // fail every response validated against it.
      expect(parseResult.get(0).messageBodySchema).to.be.undefined;
    });
  });
});
