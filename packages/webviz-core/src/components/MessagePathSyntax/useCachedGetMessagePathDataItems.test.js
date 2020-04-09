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
  getMessagePathDataItems,
  useCachedGetMessagePathDataItems,
  fillInGlobalVariablesInPath,
} from "./useCachedGetMessagePathDataItems";
import { setGlobalVariables } from "webviz-core/src/actions/panels";
import parseRosPath from "webviz-core/src/components/MessagePathSyntax/parseRosPath";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import type { Message, Topic } from "webviz-core/src/players/types";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

function addValuesWithPathsToItems(messages, path, providerTopics, datatypes) {
  return messages.map((message) => {
    const rosPath = parseRosPath(path);
    if (!rosPath) {
      return undefined;
    }
    return getMessagePathDataItems(message, rosPath, providerTopics, datatypes);
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
    Test.cachedGetMessage = (path: string, message: Message) => {};
    return Test;
  }

  it("clears the cache whenever any inputs to getMessagePathDataItems change", async () => {
    const Test = createTest();
    const message: Message = {
      op: "message",
      topic: "/topic",
      datatype: "datatype",
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
      op: "message",
      topic: "/topic",
      datatype: "datatype",
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

  describe("getMessagePathDataItems", () => {
    it("traverses down the path for every item", () => {
      const messages: Message[] = [
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            some_array: [
              {
                some_id: 10,
                some_message: {
                  x: 10,
                  y: 20,
                },
              },
            ],
          },
        },
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            some_array: [
              {
                some_id: 10,
                some_message: {
                  x: 10,
                  y: 20,
                },
              },
              {
                some_id: 50,
                some_message: {
                  x: 50,
                  y: 60,
                },
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
              name: "some_id",
              type: "uint32",
            },
            {
              name: "some_message",
              type: "yet_another_datatype",
            },
          ],
        },
        yet_another_datatype: {
          fields: [
            {
              name: "x",
              type: "uint32",
            },
            {
              name: "y",
              type: "uint32",
            },
          ],
        },
      };

      expect(addValuesWithPathsToItems(messages, "/some/topic.some_array[:].some_message", topics, datatypes)).toEqual([
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

    it("works with negative slices", () => {
      const messages: Message[] = [
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: { some_array: [1, 2, 3, 4, 5] },
        },
      ];
      const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
      const datatypes: RosDatatypes = {
        some_datatype: { fields: [{ name: "some_array", type: "int32", isArray: true }] },
      };

      expect(addValuesWithPathsToItems(messages, "/some/topic.some_array[-2:-1]", topics, datatypes)).toEqual([
        [
          { constantName: undefined, path: "/some/topic.some_array[-2]", value: 4 },
          { constantName: undefined, path: "/some/topic.some_array[-1]", value: 5 },
        ],
      ]);
    });

    it("returns nothing for invalid topics", () => {
      const messages: Message[] = [
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: 123,
        },
      ];
      expect(addValuesWithPathsToItems(messages, "/some/topic", [], {})).toEqual([undefined]);
    });

    it("filters properly, and uses the filter name in the path", () => {
      const messages: Message[] = [
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
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
          datatypes
        )
      ).toEqual([
        [{ constantName: undefined, value: 10, path: "/some/topic.some_array[:]{some_filter_value==0}.some_id" }],
      ]);
    });

    it("filters entire messages", () => {
      const messages: Message[] = [
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            str_field: "A",
            num_field: 1,
          },
        },
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            str_field: "A",
            num_field: 2,
          },
        },
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
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

      expect(addValuesWithPathsToItems(messages, "/some/topic{str_field=='A'}.num_field", topics, datatypes)).toEqual([
        [{ value: 1, path: "/some/topic{str_field=='A'}.num_field" }],
        [{ value: 2, path: "/some/topic{str_field=='A'}.num_field" }],
        [],
      ]);

      expect(addValuesWithPathsToItems(messages, "/some/topic{str_field=='B'}.num_field", topics, datatypes)).toEqual([
        [],
        [],
        [{ value: 2, path: "/some/topic{str_field=='B'}.num_field" }],
      ]);

      expect(addValuesWithPathsToItems(messages, "/some/topic{num_field==2}.num_field", topics, datatypes)).toEqual([
        [],
        [{ value: 2, path: "/some/topic{num_field==2}.num_field" }],
        [{ value: 2, path: "/some/topic{num_field==2}.num_field" }],
      ]);

      expect(
        addValuesWithPathsToItems(messages, "/some/topic{str_field=='A'}{num_field==2}.num_field", topics, datatypes)
      ).toEqual([[], [{ value: 2, path: "/some/topic{str_field=='A'}{num_field==2}.num_field" }], []]);

      expect(addValuesWithPathsToItems(messages, "/some/topic{str_field=='C'}.num_field", topics, datatypes)).toEqual([
        [],
        [],
        [],
      ]);
    });

    it("returns matching constants", () => {
      const messages: Message[] = [
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            state: 0,
          },
        },
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
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

      expect(addValuesWithPathsToItems(messages, "/some/topic.state", topics, datatypes)).toEqual([
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
