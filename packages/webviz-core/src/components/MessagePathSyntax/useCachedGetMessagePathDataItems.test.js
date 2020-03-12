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

import { getMessagePathDataItems, useCachedGetMessagePathDataItems } from "./useCachedGetMessagePathDataItems";
import { setGlobalVariables } from "webviz-core/src/actions/panels";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import type { Message, Topic } from "webviz-core/src/players/types";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

function addValuesWithPathsToItems(messages, path, providerTopics, datatypes, globalVariables) {
  return messages.map((message) =>
    getMessagePathDataItems(message, path, providerTopics, datatypes, globalVariables || {})
  );
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

    // Invalidate cache with globalVariables.
    const data0BeforeGlobalVariablesChange = Test.cachedGetMessage("/topic.an_array[0]", message);
    store.dispatch(setGlobalVariables({ foo: 0 }));
    expect(Test.cachedGetMessage("/topic.an_array[0]", message)).not.toBe(data0BeforeGlobalVariablesChange);

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

    it("slices properly with globalVariables", () => {
      const messages: Message[] = [
        {
          op: "message",
          topic: "/topic",
          datatype: "datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: { an_array: [5, 10, 15, 20] },
        },
      ];
      const topics: Topic[] = [{ name: "/topic", datatype: "datatype" }];
      const datatypes: RosDatatypes = {
        datatype: { fields: [{ name: "an_array", type: "uint32", isArray: true, isComplex: false }] },
      };

      // 1 global variable as single index
      expect(
        addValuesWithPathsToItems(messages, "/topic.an_array[$global_data_idx_a]", topics, datatypes, {
          global_data_idx_a: 2,
        })
      ).toEqual([[{ value: 15, path: "/topic.an_array[2]" }]]);

      // 2 global variables as indices
      expect(
        addValuesWithPathsToItems(
          messages,
          "/topic.an_array[$global_data_idx_a:$global_data_idx_b]",
          topics,
          datatypes,
          {
            global_data_idx_a: 1,
            global_data_idx_b: 2,
          }
        )
      ).toEqual([[{ path: "/topic.an_array[1]", value: 10 }, { path: "/topic.an_array[2]", value: 15 }]]);

      // 1 global variable for 1 of 2 indices (global variable first)
      expect(
        addValuesWithPathsToItems(messages, "/topic.an_array[$global_data_idx_a:1]", topics, datatypes, {
          global_data_idx_a: 0,
        })
      ).toEqual([[{ path: "/topic.an_array[0]", value: 5 }, { path: "/topic.an_array[1]", value: 10 }]]);

      // 1 global variable for 1 of 2 indices (global variable second)
      expect(
        addValuesWithPathsToItems(messages, "/topic.an_array[0:$global_data_idx_b]", topics, datatypes, {
          global_data_idx_b: 3,
        })
      ).toEqual([
        [
          { path: "/topic.an_array[0]", value: 5 },
          { path: "/topic.an_array[1]", value: 10 },
          { path: "/topic.an_array[2]", value: 15 },
          { path: "/topic.an_array[3]", value: 20 },
        ],
      ]);

      // without any global variable value
      expect(addValuesWithPathsToItems(messages, "/topic.an_array[$global_data_idx_a]", topics, datatypes, {})).toEqual(
        [[]]
      );

      // with non-number global variable value
      expect(
        addValuesWithPathsToItems(messages, "/topic.an_array[$global_data_idx_a]", topics, datatypes, {
          global_data_idx_a: "a",
        })
      ).toEqual([[]]);
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

    it("filters properly for globalVariables, and uses the filter object in the path", () => {
      const messages: Message[] = [
        {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            some_array: [
              {
                some_filter_value: 5,
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
          "/some/topic.some_array[:]{some_filter_value==$some_global_data_key}.some_id",
          topics,
          datatypes,
          { some_global_data_key: 5 }
        )
      ).toEqual([
        [
          {
            constantName: undefined,
            value: 10,
            path: "/some/topic.some_array[:]{some_filter_value==$some_global_data_key}.some_id",
          },
        ],
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
