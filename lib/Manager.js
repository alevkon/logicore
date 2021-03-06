// const PgAdapter = require("./adapters/psql-adapter.js");

class Manager {
  constructor(adapter) {
    this.adapter = adapter;
    this.schemas = {};
    this.validators = {};
  }

  async init() {
    this._initPromise = this.adapter.init();
    this._initPromise.then(() => {
      delete this._initPromise;
    })
  }

  async _ensureReady() {
    if (this._initPromise) {
      await this._initPromise();
    }
  }

  registerSchema(key, schema, ajv) {
    this.schemas[key] = schema;
    this.validators[key] = ajv.compile(schema);
    this.adapter.registerSchema(key, schema);
  }

  validate(schemaKey, values) {
    const result = this.validators[schemaKey](values);
    return result || this.validators[schemaKey].errors;
  }

  async beginTransaction() {
  }

  async endTransaction() {
  }

  async rollbackTransaction() {
  }

  async insert(schemaKey, data) {
    await this._ensureReady();
    if (!this.schemas[schemaKey]) { throw new Error(`Schema ${schemaKey} is not registered`); }

    return await this.adapter.insert(schemaKey, data);
  };

  async findOne(schemaKey, filter) {
    await this._ensureReady();
    if (!this.schemas[schemaKey]) { throw new Error(`Schema ${schemaKey} is not registered`); }

    return await this.adapter.findOne(schemaKey, filter);
  }

  async update(schemaKey, id, patch) {
    await this._ensureReady();
    if (!this.schemas[schemaKey]) { throw new Error(`Schema ${schemaKey} is not registered`); }

    return await this.adapter.update(schemaKey, id, patch);
  }

  async upsert(schemaKey, instanceFilter, values) {
    await this._ensureReady();
    if (!this.schemas[schemaKey]) { throw new Error(`Schema ${schemaKey} is not registered`); }

    return await this.adapter.upsert(schemaKey, instanceFilter, values);
  }
};

module.exports = Manager;