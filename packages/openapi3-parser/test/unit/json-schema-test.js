const { expect } = require('chai');
const { convertSchema } = require('../../lib/json-schema');

// The converter turns an OpenAPI 3 Schema Object into a standalone JSON Schema. Two things
// differ from the Swagger 2 parser this was ported from: references are written as
// '#/components/schemas/X' but have to be emitted as '#/definitions/X', since the referenced
// schemas are copied into the result; and `nullable` has to be translated, because it is not a
// JSON Schema keyword and a validator would reject the null it permits.
describe('JSON Schema converter', () => {
  const documentWith = schemas => ({ components: { schemas } });

  it('keeps required, so an absent optional property is distinguishable', () => {
    const schema = convertSchema({
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, nickname: { type: 'string' } },
    }, documentWith({}), documentWith({}));

    expect(schema.required).to.deep.equal(['name']);
    expect(schema.properties.nickname).to.deep.equal({ type: 'string' });
    expect(schema.$schema).to.equal('http://json-schema.org/draft-04/schema#');
  });

  it('rewrites a reference and copies what it points at into definitions', () => {
    const document = documentWith({
      Name: { type: 'object', required: ['first'], properties: { first: { type: 'string' } } },
    });

    const schema = convertSchema({
      type: 'object',
      properties: { name: { $ref: '#/components/schemas/Name' } },
    }, document, document);

    expect(schema.properties.name).to.deep.equal({ $ref: '#/definitions/Name' });
    expect(schema.definitions.Name.required).to.deep.equal(['first']);
  });

  it('rewrites references nested inside a copied definition', () => {
    const document = documentWith({
      Pets: { type: 'array', items: { $ref: '#/components/schemas/Pet' } },
      Pet: { type: 'object', properties: { id: { type: 'integer' } } },
    });

    const schema = convertSchema({ $ref: '#/components/schemas/Pets' }, document, document);

    // A copied definition used to keep the pointer the document wrote, which resolves to
    // nothing in the schema being produced.
    expect(JSON.stringify(schema)).to.not.contain('#/components/schemas');
    expect(JSON.stringify(schema)).to.contain('#/definitions/Pet');
  });

  it('terminates on a schema that references itself', () => {
    const document = documentWith({
      Node: {
        type: 'object',
        properties: { children: { type: 'array', items: { $ref: '#/components/schemas/Node' } } },
      },
    });

    const schema = convertSchema({ $ref: '#/components/schemas/Node' }, document, document);

    expect(schema).to.not.be.undefined;
    expect(JSON.stringify(schema)).to.contain('#/definitions/Node');
  });

  it('translates nullable into a type union', () => {
    const schema = convertSchema({
      type: 'object',
      properties: { deletedAt: { type: 'string', nullable: true } },
    }, documentWith({}), documentWith({}));

    expect(schema.properties.deletedAt.type).to.deep.equal(['string', 'null']);
    expect(schema.properties.deletedAt.nullable).to.be.undefined;
  });

  it('translates a nullable reference into a choice including null', () => {
    const document = documentWith({
      Payload: { type: 'object', properties: { kind: { type: 'string' } } },
    });

    const schema = convertSchema({
      type: 'object',
      properties: { payload: { nullable: true, allOf: [{ $ref: '#/components/schemas/Payload' }] } },
    }, document, document);

    // allOf applies unconditionally, so it cannot describe a value that may be null.
    expect(schema.properties.payload.anyOf).to.deep.equal([
      { $ref: '#/definitions/Payload' },
      { type: 'null' },
    ]);
    expect(schema.properties.payload.allOf).to.be.undefined;
  });


  it('translates a nullable reference that also declares a type', () => {
    const document = documentWith({
      Payload: { type: 'object', required: ['kind'], properties: { kind: { type: 'string' } } },
    });

    // What a generator emits for a nullable reference under OpenAPI 3: the keyword needs a
    // type beside it to apply at all, so both are present. Widening the type is not enough,
    // because allOf still demands the referenced object.
    const schema = convertSchema({
      type: 'object',
      properties: {
        payload: { type: 'object', nullable: true, allOf: [{ $ref: '#/components/schemas/Payload' }] },
      },
    }, document, document);

    expect(schema.properties.payload).to.deep.equal({
      anyOf: [{ $ref: '#/definitions/Payload' }, { type: 'null' }],
    });
  });

  it('reports a reference it cannot resolve', () => {
    const document = documentWith({});

    expect(() => convertSchema({ $ref: '#/components/schemas/Missing' }, document, document))
      .to.throw(/does not exist/);
  });
});
