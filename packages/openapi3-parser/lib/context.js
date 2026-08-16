const State = require('./state.js');

class Context {
  constructor(namespace, options) {
    this.namespace = namespace;
    this.openapiVersion = {
      major: 3,
      minor: 0,
      patch: 0,
    };
    this.options = options || {};

    if (this.options.generateSourceMap === undefined) {
      this.options.generateSourceMap = false;
    }

    if (this.options.generateMessageBody === undefined) {
      this.options.generateMessageBody = true;
    }

    // Defaulted on to match the Swagger 2 parser, which has always produced a schema for
    // message bodies. A consumer with no schema has to compare responses against a generated
    // example instead, which treats every key in that example as required.
    if (this.options.generateMessageBodySchema === undefined) {
      this.options.generateMessageBodySchema = true;
    }

    // The unparsed document, needed while converting a schema: a '#/components/schemas/X'
    // reference has to be resolved against the original JSON, not against the parsed
    // dataStructure that has replaced it by then.
    this.document = undefined;

    this.state = new State();
  }

  // The unparsed document, kept for schema conversion further down the tree where only the
  // parsed form is in scope.
  useDocument(document) {
    this.document = document;
  }

  registerId(id) {
    return this.state.registerId(id);
  }

  oauthFlow(id, flow) {
    return this.state.oauthFlow(id, flow);
  }

  registerScheme(id) {
    return this.state.registerScheme(id);
  }

  hasScheme(id) {
    return this.state.hasScheme(id);
  }

  // Versioning
  isOpenAPIVersionLessThan(major, minor) {
    return this.openapiVersion.major < major || (this.openapiVersion.major === major && this.openapiVersion.minor < minor);
  }

  isOpenAPIVersionMoreThanOrEqual(major, minor) {
    return this.openapiVersion.major > major || (this.openapiVersion.major === major && this.openapiVersion.minor >= minor);
  }
}

module.exports = Context;
