const Person = require("./fixtures/Person.js");
const Adapter = require('./fixtures/Adapter');
const Action = require('../lib/Action');
const Event = require('../lib/Event');
const Core = require('../lib/Core');

const createCore = async() => {
  const core = new Core({
    dbAdapter: new Adapter(),
    dbLogAdapter: new Adapter()
  });
  await core.init();

  core.registerSchema("person", Person.schema);
  return core;
};

describe('Action', () => {
  describe('constructor', () => {
    describe('Should throw an error then given any of calculated props', () => {
      const props = ["id", "dataOld", "dataDiff", "dataDiffPrepatched", "stage", "status"];
      props.forEach((prop) => {
        it(prop, () => {
          expect(() => {
            new Action({
              [prop]: 1
            })
          }).toThrow(/should be empty/i);
        });
      });
    });
    describe('Other wrong arguments', () => {
      const testCases = [
        {
          title: "Wrong type",
          blank: { type: 678 },
          error: /Action\.type has inappropriate value/
        },
        {
          title: "Empty schemaKey",
          blank: { type: "1" },
          error: /Action\.schemaKey is required/
        },
        {
          title: "Empty data",
          blank: { type: "1", schemaKey: "s1" },
          error: /Action\.data is required/
        },
        {
          title: "Data is not an object",
          blank: { type: "1", schemaKey: "s1", data: "some string" },
          error: /Action\.data should be an object/
        },
        {
          title: "Data is array",
          blank: { type: "1", schemaKey: "s1", data: [] },
          error: /Action\.data should not be an array/
        },
        {
          title: "INSERT: instanceId present",
          blank: { type: Action.ACTION_TYPE.INSERT, schemaKey: "s1", data: {}, instanceId: 1 },
          error: /Action\.instanceId should be empty for INSERT type/
        },
        {
          title: "INSERT: instanceFilter present",
          blank: { type: Action.ACTION_TYPE.INSERT, schemaKey: "s1", data: {}, instanceFilter: {} },
          error: /Action\.instanceFilter should be empty for INSERT type/
        },
        {
          title: "UPDATE: no instanceId",
          blank: { type: Action.ACTION_TYPE.UPDATE, schemaKey: "s1", data: {}},
          error: /Action\.instanceId is required for UPDATE type/
        },
        {
          title: "UPDATE: instanceFilter present",
          blank: { type: Action.ACTION_TYPE.UPDATE, schemaKey: "s1", data: {}, instanceId: 1, instanceFilter: {} },
          error: /Action\.instanceFilter should be empty for UPDATE type/
        },
        {
          title: "UPSERT: instanceId present",
          blank: { type: Action.ACTION_TYPE.UPSERT, schemaKey: "s1", data: {}, instanceId: 1 },
          error: /Action\.instanceId should be empty for UPSERT type/
        },
        {
          title: "UPSERT: no instanceFilter",
          blank: { type: Action.ACTION_TYPE.UPSERT, schemaKey: "s1", data: {} },
          error: /Action\.instanceFilter is required for UPSERT type/
        },
        {
          title: "UPSERT: instanceFilter not an object",
          blank: { type: Action.ACTION_TYPE.UPSERT, schemaKey: "s1", data: {}, instanceFilter: 1 },
          error: /Action\.instanceFilter should be an object/
        }
      ];
      testCases.forEach((testCase) => {
        it(testCase.title, () => {
          expect(() => {
            new Action(testCase.blank)
          }).toThrow(testCase.error);
        });
      });
    });
    describe('Successful cases', () => {
      const testCases = [
        {
          title: "INSERT",
          blank: { type: Action.ACTION_TYPE.INSERT, schemaKey: "s1", data: { a1: "v1" } },
          result: {
            type: Action.ACTION_TYPE.INSERT,
            status: Action.ACTION_STATUS.PENDING,
            data: { a1: "v1" }
          }
        },
        {
          title: "UPDATE",
          blank: { type: Action.ACTION_TYPE.UPDATE, schemaKey: "s1", data: { a1: "v1" }, instanceId: 1 },
          result: {
            type: Action.ACTION_TYPE.UPDATE,
            status: Action.ACTION_STATUS.PENDING,
            data: { a1: "v1" },
            instanceId: 1
          }
        },
        {
          title: "UPSERT",
          blank: { type: Action.ACTION_TYPE.UPSERT, schemaKey: "s1", data: { a1: "v1" }, instanceFilter: { key: 2 } },
          result: {
            type: Action.ACTION_TYPE.UPSERT,
            status: Action.ACTION_STATUS.PENDING,
            data: { a1: "v1" },
            instanceFilter: { key: 2 }
          }
        }
      ];
      testCases.forEach((testCase) => {
        it(testCase.title, () => {
          expect(new Action(testCase.blank)).toMatchObject(testCase.result);
        });
      });
    });
  });
  describe('populateWithOld', () => {
    const testCases = [
      {
        title: "INSERT",
        blank: {
          type: Action.ACTION_TYPE.INSERT,
          schemaKey: "person",
          data: {
            nameFirst: "Rudy",
            age: 40
          }
        },
        populated: {
          dataOld: null,
          dataDiff: null
        },
        dbLogEvents: []
      },
      {
        title: "UPDATE",
        blank: {
          type: Action.ACTION_TYPE.UPDATE,
          instanceId: 1,
          schemaKey: "person",
          data: {
            nameFirst: "Rudy",
            age: 40
          }
        },
        populated: {
          dataOld: {
            id: 1,
            nameFirst: "Rudy",
            nameLast: "Cruysbergs",
            age: 30
          },
          dataDiff: {
            age: 40
          }
        },
        dbLogEvents: [
          {
            id: 1,
            action: 1,
            stage: 1,
            isError: false,
            inData: { instanceId: 1, instanceFilter: null, data: { nameFirst: 'Rudy', age: 40 } },
            outData: {
              dataOld: { id: 1, nameFirst: 'Rudy', nameLast: 'Cruysbergs', age: 30 },
              dataDiff: { age: 40 }
            },
            errorMessage: ''
          }
        ]
      },
      {
        title: "UPDATE with non-existing",
        blank: {
          type: Action.ACTION_TYPE.UPDATE,
          instanceId: 10000,
          schemaKey: "person",
          data: {
            age: 40
          }
        },
        error: /^Item not found/,
        dbLogEvents: [
          {
            id: 1,
            action: 1,
            stage: 1,
            isError: true,
            errorMessage: 'Item not found {"id":10000}',
            inData: { instanceId: 10000, instanceFilter: null, data: { age: 40 } },
            outData: {}
          }
        ]
      },
      {
        title: "UPSERT",
        blank: {
          type: Action.ACTION_TYPE.UPSERT,
          instanceFilter: { age: 30 },
          schemaKey: "person",
          data: {
            nameFirst: "Rudy2",
            age: 30,
            nonExistingAttribute: 10
          }
        },
        populated: {
          dataOld: {
            id: 1,
            nameFirst: "Rudy",
            nameLast: "Cruysbergs",
            age: 30
          },
          dataDiff: {
            nameFirst: "Rudy2"
          }
        },
        dbLogEvents: [
          {
            id: 1,
            action: 1,
            stage: 1,
            isError: false,
            inData: { instanceId: null, instanceFilter: { age: 30 }, data: { nameFirst: 'Rudy2', age: 30, nonExistingAttribute: 10 } },
            outData: {
              dataOld: { id: 1, nameFirst: 'Rudy', nameLast: 'Cruysbergs', age: 30 },
              dataDiff: { nameFirst: "Rudy2" }
            },
            errorMessage: ''
          }
        ]
      }
    ];


    // TODO: test failed action creatiion in CORE (proper events)

    testCases.forEach(async (testCase) => {
      it(testCase.title, async() => {
        const core = await createCore();

        const action = new Action(testCase.blank);
        await core.logger.logAction(action);

        if (testCase.error) {
          await expect(action.populateWithOld(core)).rejects.toThrow(testCase.error);
        } else {
          await action.populateWithOld(core);
          expect(action.dataOld).toStrictEqual(testCase.populated.dataOld);
        }

        expect(core.logger.adapter.instances.event).toStrictEqual(
          testCase.dbLogEvents.map(eventBlank => new Event(eventBlank))
        );
      });
    });
  })
});