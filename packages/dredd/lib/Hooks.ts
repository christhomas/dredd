import hooksLog from './hooksLog';

// READ THIS! Disclaimer:
// Do not add any functionality to this class unless you want to expose it to the Hooks API.
// This class is only an interface for users of Dredd hooks.

class Hooks {
  logs: any;
  logger: any;
  beforeHooks: Record<string, Function[]>;
  beforeValidationHooks: Record<string, Function[]>;
  afterHooks: Record<string, Function[]>;
  beforeAllHooks: Function[];
  afterAllHooks: Function[];
  beforeEachHooks: Function[];
  beforeEachValidationHooks: Function[];
  afterEachHooks: Function[];
  transactions: any;
  configuration: any;

  constructor(options: any = {}) {
    this.before = this.before.bind(this);
    this.beforeValidation = this.beforeValidation.bind(this);
    this.after = this.after.bind(this);
    this.beforeAll = this.beforeAll.bind(this);
    this.afterAll = this.afterAll.bind(this);
    this.beforeEach = this.beforeEach.bind(this);
    this.beforeEachValidation = this.beforeEachValidation.bind(this);
    this.afterEach = this.afterEach.bind(this);
    this.log = this.log.bind(this);
    this.logs = options.logs;
    this.logger = options.logger;
    this.beforeHooks = {};
    this.beforeValidationHooks = {};
    this.afterHooks = {};
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.beforeEachHooks = [];
    this.beforeEachValidationHooks = [];
    this.afterEachHooks = [];
  }

  before(name: string, hook: Function): void {
    this.addHook(this.beforeHooks, name, hook);
  }

  beforeValidation(name: string, hook: Function): void {
    this.addHook(this.beforeValidationHooks, name, hook);
  }

  after(name: string, hook: Function): void {
    this.addHook(this.afterHooks, name, hook);
  }

  beforeAll(hook: Function): void {
    this.beforeAllHooks.push(hook);
  }

  afterAll(hook: Function): void {
    this.afterAllHooks.push(hook);
  }

  beforeEach(hook: Function): void {
    this.beforeEachHooks.push(hook);
  }

  beforeEachValidation(hook: Function): void {
    this.beforeEachValidationHooks.push(hook);
  }

  afterEach(hook: Function): void {
    this.afterEachHooks.push(hook);
  }

  addHook(hooks: Record<string, Function[]>, name: string, hook: Function): void {
    if (hooks[name]) {
      hooks[name].push(hook);
    } else {
      hooks[name] = [hook];
    }
  }

  // log(logVariant, content)
  // log(content)
  log(...args: any[]): void {
    this.logs = (hooksLog as any)(this.logs, this.logger, ...args);
  }
}

export default Hooks;
