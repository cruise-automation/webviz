// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mount } from "enzyme";
import { createMemoryHistory } from "history";
import { cloneDeep } from "lodash";
import * as React from "react";

import {
  fillInGlobalVariablesInPath,
  getMessagePathDataItems,
  useCachedGetMessagePathDataItems,
  useDecodeMessagePathsForMessagesByTopic,
} from "./useCachedGetMessagePathDataItems";
import { setGlobalVariables } from "webviz-core/src/actions/panels";
import parseRosPath from "webviz-core/src/components/MessagePathSyntax/parseRosPath";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import type { Message, Topic } from "webviz-core/src/players/types";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import { wrapMessages } from "webviz-core/src/test/datatypes";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { deepParse, isBobject } from "webviz-core/src/util/binaryObjects";

function addValuesWithPathsToItems(messages, messagePath, providerTopics, datatypes, useBobjects) {
  const maybeBobjectMessages = useBobjects ? wrapMessages(messages) : messages;
  return maybeBobjectMessages.map((message) => {
    const rosPath = parseRosPath(messagePath);
    if (!rosPath) {
      return undefined;
    }
    const items = getMessagePathDataItems((message: any), rosPath, providerTopics, datatypes);
    return (
      items &&
      items.map(({ value, path, constantName }) => ({
        value: isBobject(value) ? deepParse(value) : value,
        path,
        constantName,
      }))
    );
  });
}

describe("useCachedGetMessagePathDataItems", () => {
  // Create a helper component that exposes the results of the hook for mocking.
  function createTest() {
    function Test({ paths }: { paths: string[] }) {
      const cachedGetMessagePathDataItems = useCachedGetMessagePathDataItems(paths);
      Test.cachedGetMessage = cachedGetMessagePathDataItems;
      return null;
    }
    Test.cachedGetMessage = (_path: string, _message: Message) => {};
    return Test;
  }

  it("clears the cache whenever any inputs to getMessagePathDataItems change", async () => {
    const Test = createTest();
    const message: Message = {
      topic: "/topic",
      receiveTime: { sec: 0, nsec: 0 },
      message: { an_array: [5, 10, 15, 20] },
    };
    const topics = [{ name: "/topic", datatype: "datatype" }];
    const datatypes = { datatype: { fields: [{ name: "an_array", type: "uint32", isArray: true, isComplex: false }] } };

    const store = configureStore(createRootReducer(createMemoryHistory()));

    const root = mount(
      <MockMessagePipelineProvider store={store} topics={topics} datatypes={datatypes}>
        <Test paths={["/topic.an_array[0]", "/topic.an_array[1]"]} />
      </MockMessagePipelineProvider>
    );

    const data0 = Test.cachedGetMessage("/topic.an_array[0]", message);
    const data1 = Test.cachedGetMessage("/topic.an_array[1]", message);
    expect(data0).toEqual([{ path: "/topic.an_array[0]", value: 5 }]);
    expect(data1).toEqual([{ path: "/topic.an_array[1]", value: 10 }]);

    // Calling again returns cached version.
    expect(Test.cachedGetMessage("/topic.an_array[0]", message)).toBe(data0);

    // Throws when asking for a path not in the list.
    expect(() => Test.cachedGetMessage("/topic.an_array[2]", message)).toThrow("not in the list of cached paths");

    // Using the exact same paths but with a new array instance will keep the returned function exactly the same.
    const originalCachedGetMessage = Test.cachedGetMessage;
    root.setProps({ children: <Test paths={["/topic.an_array[0]", "/topic.an_array[1]"]} /> });
    expect(Test.cachedGetMessage).toBe(originalCachedGetMessage);

    // Changing paths maintains cache for the remaining path.
    root.setProps({ children: <Test paths={["/topic.an_array[0]"]} /> });
    expect(Test.cachedGetMessage("/topic.an_array[0]", message)).toBe(data0);
    expect(() => Test.cachedGetMessage("/topic.an_array[1]", message)).toThrow("not in the list of cached paths");
    expect(Test.cachedGetMessage).not.toBe(originalCachedGetMessage); // Function should also be different.
    // Change it back to make sure that we indeed cleared the cache for the path that we removed.
    root.setProps({ children: <Test paths={["/topic.an_array[0]", "/topic.an_array[1]"]} /> });
    expect(Test.cachedGetMessage("/topic.an_array[1]", message)).not.toBe(data1);
    expect(Test.cachedGetMessage("/topic.an_array[0]", message)).toBe(data0); // Another sanity check.

    // Invalidate cache with topics.
    const data0BeforeProviderTopicsChange = Test.cachedGetMessage("/topic.an_array[0]", message);
    root.setProps({ topics: cloneDeep(topics) });
    expect(Test.cachedGetMessage("/topic.an_array[0]", message)).not.toBe(data0BeforeProviderTopicsChange);

    // Invalidate cache with datatypes.
    const data0BeforeDatatypesChange = Test.cachedGetMessage("/topic.an_array[0]", message);
    root.setProps({ datatypes: cloneDeep(datatypes) });
    expect(Test.cachedGetMessage("/topic.an_array[0]", message)).not.toBe(data0BeforeDatatypesChange);

    root.unmount();
  });

  it("clears the cache only when relevant global variables change", async () => {
    const Test = createTest();
    const message: Message = {
      topic: "/topic",
      receiveTime: { sec: 0, nsec: 0 },
      message: { an_array: [5, 10, 15, 20] },
    };
    const topics = [{ name: "/topic", datatype: "datatype" }];
    const datatypes = { datatype: { fields: [{ name: "an_array", type: "uint32", isArray: true, isComplex: false }] } };

    const store = configureStore(createRootReducer(createMemoryHistory()));
    store.dispatch(setGlobalVariables({ foo: 0 }));

    const root = mount(
      <MockMessagePipelineProvider store={store} topics={topics} datatypes={datatypes}>
        <Test paths={["/topic.an_array[$foo]"]} />
      </MockMessagePipelineProvider>
    );

    const data0 = Test.cachedGetMessage("/topic.an_array[$foo]", message);
    expect(data0).toEqual([{ path: "/topic.an_array[0]", value: 5 }]);

    // Sanity check.
    expect(Test.cachedGetMessage("/topic.an_array[$foo]", message)).toBe(data0);

    // Changing an unrelated global variable should not invalidate the cache.
    store.dispatch(setGlobalVariables({ bar: 0 }));
    expect(Test.cachedGetMessage("/topic.an_array[$foo]", message)).toBe(data0);

    // Changing a relevant global variable.
    store.dispatch(setGlobalVariables({ foo: 1 }));
    expect(Test.cachedGetMessage("/topic.an_array[$foo]", message)).toEqual([
      { path: "/topic.an_array[1]", value: 10 },
    ]);

    root.unmount();
  });

  describe.each([[false], [true]])("getMessagePathDataItems (Bobjects: %p)", (useBobjects) => {
    it("traverses down the path for every item", () => {
      const messages: Message[] = [
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: { some_array: [{ some_id: 10, some_message: { x: 10, y: 20 } }] },
        },
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            some_array: [
              { some_id: 10, some_message: { x: 10, y: 20 } },
              { some_id: 50, some_message: { x: 50, y: 60 } },
            ],
          },
        },
      ];
      const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
      const datatypes: RosDatatypes = {
        some_datatype: {
          fields: [{ name: "some_array", type: "some_other_datatype", isArray: true }],
        },
        some_other_datatype: {
          fields: [{ name: "some_id", type: "uint32" }, { name: "some_message", type: "yet_another_datatype" }],
        },
        yet_another_datatype: {
          fields: [{ name: "x", type: "uint32" }, { name: "y", type: "uint32" }],
        },
      };

      expect(
        addValuesWithPathsToItems(messages, "/some/topic.some_array[:].some_message", topics, datatypes, useBobjects)
      ).toEqual([
        [
          {
            value: { x: 10, y: 20 },
            path: "/some/topic.some_array[:]{some_id==10}.some_message",
            constantName: undefined,
          },
        ],
        [
          {
            value: { x: 10, y: 20 },
            path: "/some/topic.some_array[:]{some_id==10}.some_message",
            constantName: undefined,
          },
          {
            value: { x: 50, y: 60 },
            path: "/some/topic.some_array[:]{some_id==50}.some_message",
            constantName: undefined,
          },
        ],
      ]);
    });
    describe("JSON", () => {
      it("traverses JSON fields", () => {
        const messages: Message[] = [
          {
            topic: "/some/topic",
            receiveTime: { sec: 0, nsec: 0 },
            message: { someJson: { someId: 10, anotherId: 9, nested: { someNestedId: "7" } } },
          },
          {
            topic: "/some/topic",
            receiveTime: { sec: 0, nsec: 0 },
            message: { someJson: { someId: 11, anotherId: 12, nested: { someNestedId: "8" } } },
          },
        ];
        const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
        const datatypes: RosDatatypes = {
          some_datatype: { fields: [{ name: "someJson", type: "json", isArray: false }] },
        };

        expect(addValuesWithPathsToItems(messages, "/some/topic.someJson", topics, datatypes, useBobjects)).toEqual([
          [
            {
              value: { someId: 10, anotherId: 9, nested: { someNestedId: "7" } },
              path: "/some/topic.someJson",
              constantName: undefined,
            },
          ],
          [
            {
              value: { someId: 11, anotherId: 12, nested: { someNestedId: "8" } },
              path: "/some/topic.someJson",
              constantName: undefined,
            },
          ],
        ]);
        expect(
          addValuesWithPathsToItems(messages, "/some/topic.someJson.someId", topics, datatypes, useBobjects)
        ).toEqual([
          [{ value: 10, path: "/some/topic.someJson.someId", constantName: undefined }],
          [{ value: 11, path: "/some/topic.someJson.someId", constantName: undefined }],
        ]);
        expect(
          addValuesWithPathsToItems(
            messages,
            "/some/topic.someJson.nested.someNestedId",
            topics,
            datatypes,
            useBobjects
          )
        ).toEqual([
          [{ value: "7", path: "/some/topic.someJson.nested.someNestedId", constantName: undefined }],
          [{ value: "8", path: "/some/topic.someJson.nested.someNestedId", constantName: undefined }],
        ]);
      });

      it("traverses nested JSON arrays", () => {
        const messages: Message[] = [
          { topic: "/some/topic", receiveTime: { sec: 0, nsec: 0 }, message: { jsonArr: [{ foo: { bar: 42 } }] } },
        ];
        const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
        const datatypes: RosDatatypes = {
          some_datatype: { fields: [{ name: "jsonArr", type: "json", isArray: false }] },
        };

        expect(
          addValuesWithPathsToItems(messages, "/some/topic.jsonArr[0].foo.bar", topics, datatypes, useBobjects)
        ).toEqual([[{ value: 42, path: "/some/topic.jsonArr[0].foo.bar", constantName: undefined }]]);
      });

      it("filters JSON arrays", () => {
        const messages: Message[] = [
          {
            topic: "/some/topic",
            receiveTime: { sec: 0, nsec: 0 },
            message: { jsonArr: [{ id: 1, val: 42 }, { id: 2 }] },
          },
        ];
        const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
        const datatypes: RosDatatypes = {
          some_datatype: { fields: [{ name: "jsonArr", type: "json", isArray: false }] },
        };
        const path = "/some/topic.jsonArr[:]{id==1}.val";
        expect(addValuesWithPathsToItems(messages, path, topics, datatypes, useBobjects)).toEqual([
          [{ value: 42, path, constantName: undefined }],
        ]);
      });

      it("traverses arrays of JSON", () => {
        const messages: Message[] = [
          { topic: "/some/topic", receiveTime: { sec: 0, nsec: 0 }, message: { jsonArr: [{ foo: 42 }] } },
        ];
        const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
        const datatypes: RosDatatypes = {
          some_datatype: { fields: [{ name: "jsonArr", type: "json", isArray: true }] },
        };

        expect(
          addValuesWithPathsToItems(messages, "/some/topic.jsonArr[0].foo", topics, datatypes, useBobjects)
        ).toEqual([[{ value: 42, path: "/some/topic.jsonArr[0].foo", constantName: undefined }]]);
      });

      it("gracefully handles non-existent JSON fields", () => {
        const messages: Message[] = [
          {
            topic: "/some/topic",
            receiveTime: { sec: 0, nsec: 0 },
            message: { someJson: { someId: 11, anotherId: 12 } },
          },
        ];
        const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
        const datatypes: RosDatatypes = {
          some_datatype: { fields: [{ name: "someJson", type: "json", isArray: false }] },
        };

        expect(
          addValuesWithPathsToItems(messages, "/some/topic.someJson.badPath", topics, datatypes, useBobjects)
        ).toEqual([[]]);
        expect(
          addValuesWithPathsToItems(messages, "/some/topic.someJson.someId.badPath", topics, datatypes, useBobjects)
        ).toEqual([[]]);
        expect(
          addValuesWithPathsToItems(messages, "/some/topic.someJson[0].someId.badPath", topics, datatypes, useBobjects)
        ).toEqual([[]]);
      });
    });

    it("works with negative slices", () => {
      const messages: Message[] = [
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: { some_array: [1, 2, 3, 4, 5] },
        },
      ];
      const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
      const datatypes: RosDatatypes = {
        some_datatype: { fields: [{ name: "some_array", type: "int32", isArray: true }] },
      };

      expect(
        addValuesWithPathsToItems(messages, "/some/topic.some_array[-2:-1]", topics, datatypes, useBobjects)
      ).toEqual([
        [
          { constantName: undefined, path: "/some/topic.some_array[-2]", value: 4 },
          { constantName: undefined, path: "/some/topic.some_array[-1]", value: 5 },
        ],
      ]);
    });

    it("returns nothing for invalid topics", () => {
      const messages: Message[] = [
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: { value: 1 },
        },
      ];
      // Topic not present
      expect(addValuesWithPathsToItems(messages, "/some/topic", [], {}, useBobjects)).toEqual([undefined]);
    });

    it("handles fields inside times", () => {
      const topics: Topic[] = [{ name: "/some/topic", datatype: "std_msgs/Header" }];
      const datatypes: RosDatatypes = {
        "std_msgs/Header": { fields: [{ name: "stamp", type: "time", isArray: false }] },
      };
      const messages: Message[] = [
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: { stamp: { sec: 1, nsec: 2 } },
        },
      ];
      expect(addValuesWithPathsToItems(messages, "/some/topic.stamp.nsec", topics, datatypes, useBobjects)).toEqual([
        [{ constantName: undefined, path: "/some/topic.stamp.nsec", value: 2 }],
      ]);
    });

    it("filters properly, and uses the filter name in the path", () => {
      const messages: Message[] = [
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            some_array: [
              {
                some_filter_value: 0,
                some_id: 10,
              },
              {
                some_filter_value: 1,
                some_id: 50,
              },
            ],
          },
        },
      ];
      const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
      const datatypes: RosDatatypes = {
        some_datatype: {
          fields: [
            {
              name: "some_array",
              type: "some_other_datatype",
              isArray: true,
            },
          ],
        },
        some_other_datatype: {
          fields: [
            {
              name: "some_filter_value",
              type: "uint32",
            },
            {
              name: "some_id",
              type: "uint32",
            },
          ],
        },
      };

      expect(
        addValuesWithPathsToItems(
          messages,
          "/some/topic.some_array[:]{some_filter_value==0}.some_id",
          topics,
          datatypes,
          useBobjects
        )
      ).toEqual([
        [{ constantName: undefined, value: 10, path: "/some/topic.some_array[:]{some_filter_value==0}.some_id" }],
      ]);
    });

    it("filters entire messages", () => {
      const messages: Message[] = [
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            str_field: "A",
            num_field: 1,
          },
        },
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            str_field: "A",
            num_field: 2,
          },
        },
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            str_field: "B",
            num_field: 2,
          },
        },
      ];
      const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
      const datatypes: RosDatatypes = {
        some_datatype: {
          fields: [
            {
              name: "str_field",
              type: "string",
            },
            {
              name: "num_field",
              type: "uint32",
            },
          ],
        },
      };

      expect(
        addValuesWithPathsToItems(messages, "/some/topic{str_field=='A'}.num_field", topics, datatypes, useBobjects)
      ).toEqual([
        [{ value: 1, path: "/some/topic{str_field=='A'}.num_field" }],
        [{ value: 2, path: "/some/topic{str_field=='A'}.num_field" }],
        [],
      ]);

      expect(
        addValuesWithPathsToItems(messages, "/some/topic{str_field=='B'}.num_field", topics, datatypes, useBobjects)
      ).toEqual([[], [], [{ value: 2, path: "/some/topic{str_field=='B'}.num_field" }]]);

      expect(
        addValuesWithPathsToItems(messages, "/some/topic{num_field==2}.num_field", topics, datatypes, useBobjects)
      ).toEqual([
        [],
        [{ value: 2, path: "/some/topic{num_field==2}.num_field" }],
        [{ value: 2, path: "/some/topic{num_field==2}.num_field" }],
      ]);

      expect(
        addValuesWithPathsToItems(
          messages,
          "/some/topic{str_field=='A'}{num_field==2}.num_field",
          topics,
          datatypes,
          useBobjects
        )
      ).toEqual([[], [{ value: 2, path: "/some/topic{str_field=='A'}{num_field==2}.num_field" }], []]);

      expect(
        addValuesWithPathsToItems(messages, "/some/topic{str_field=='C'}.num_field", topics, datatypes, useBobjects)
      ).toEqual([[], [], []]);
    });

    it("returns matching constants", () => {
      const messages: Message[] = [
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            state: 0,
          },
        },
        {
          topic: "/some/topic",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            state: 1,
          },
        },
      ];
      const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
      const datatypes: RosDatatypes = {
        some_datatype: {
          fields: [
            {
              name: "OFF",
              type: "uint32",
              isConstant: true,
              value: 0,
            },
            {
              name: "ON",
              type: "uint32",
              isConstant: true,
              value: 1,
            },
            {
              name: "state",
              type: "uint32",
            },
          ],
        },
      };

      expect(addValuesWithPathsToItems(messages, "/some/topic.state", topics, datatypes, useBobjects)).toEqual([
        [
          {
            value: 0,
            path: "/some/topic.state",
            constantName: "OFF",
          },
        ],
        [
          {
            value: 1,
            path: "/some/topic.state",
            constantName: "ON",
          },
        ],
      ]);
    });

    it("is robust to incorrect datatypes", () => {
      const messages: Message[] = [{ topic: "/some/topic", receiveTime: { sec: 0, nsec: 0 }, message: { state: 0 } }];
      const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
      const datatypes: RosDatatypes = { some_datatype: { fields: [] } };
      expect(addValuesWithPathsToItems(messages, "/some/topic.state", topics, datatypes, useBobjects)).toEqual([
        [{ value: 0, path: "/some/topic.state" }],
      ]);
    });
  });
});

describe("fillInGlobalVariablesInPath", () => {
  it("fills in global variables in slices", () => {
    expect(
      fillInGlobalVariablesInPath(
        {
          topicName: "/foo",
          messagePath: [
            { type: "name", name: "bar" },
            { type: "slice", start: { variableName: "start", startLoc: 0 }, end: { variableName: "end", startLoc: 0 } },
          ],
          modifier: undefined,
        },
        { start: 10, end: "123" }
      )
    ).toEqual({
      topicName: "/foo",
      messagePath: [{ name: "bar", type: "name" }, { type: "slice", start: 10, end: 123 }],
    });

    // Non-numbers
    expect(
      fillInGlobalVariablesInPath(
        {
          topicName: "/foo",
          messagePath: [
            { type: "name", name: "bar" },
            { type: "slice", start: { variableName: "start", startLoc: 0 }, end: { variableName: "end", startLoc: 0 } },
          ],
          modifier: undefined,
        },
        { end: "blah" }
      )
    ).toEqual({
      topicName: "/foo",
      messagePath: [{ name: "bar", type: "name" }, { type: "slice", start: 0, end: Infinity }],
    });
  });

  it("fills in global variables in filters", () => {
    expect(
      fillInGlobalVariablesInPath(
        {
          topicName: "/foo",
          messagePath: [
            {
              type: "filter",
              path: ["bar"],
              value: { variableName: "var", startLoc: 0 },
              nameLoc: 0,
              valueLoc: 0,
              repr: "",
            },
          ],
          modifier: undefined,
        },
        { var: 123 }
      )
    ).toEqual({
      topicName: "/foo",
      messagePath: [{ type: "filter", path: ["bar"], value: 123, nameLoc: 0, valueLoc: 0, repr: "" }],
    });
  });
});

describe("useDecodeMessagePathsForMessagesByTopic", () => {
  // Create a helper component that exposes the results of the hook for mocking.
  function createTest() {
    function Test({ paths }: { paths: string[] }) {
      Test.hook = useDecodeMessagePathsForMessagesByTopic(paths);
      return null;
    }
    return Test;
  }

  it("results in missing entries when no array is provided for a topic", () => {
    const Test = createTest();
    const store = configureStore(createRootReducer(createMemoryHistory()));
    const topics = [
      { name: "/topic1", datatype: "datatype" },
      { name: "/topic2", datatype: "datatype" },
      { name: "/topic3", datatype: "datatype" },
    ];
    const datatypes = { datatype: { fields: [{ name: "value", type: "uint32", isArray: false, isComplex: false }] } };
    const root = mount(
      <MockMessagePipelineProvider store={store} topics={topics} datatypes={datatypes}>
        <Test paths={["/topic1.value", "/topic2.value", "/topic3.value", "/topic3..value"]} />
      </MockMessagePipelineProvider>
    );

    const message = {
      topic: "/topic1",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 1 },
    };
    const messagesByTopic = {
      "/topic1": [message],
      "/topic2": [],
    };
    expect(Test.hook(messagesByTopic)).toEqual({
      // Value for /topic1.value
      "/topic1.value": [{ message, queriedData: [{ path: "/topic1.value", value: 1 }] }],
      // Empty array for /topic2.value
      "/topic2.value": [],
      // No array for /topic3.value because the path is valid but the data is missing.
      // Empty array for /topic3..value because path is invalid.
      "/topic3..value": [],
    });
    root.unmount();
  });
});
