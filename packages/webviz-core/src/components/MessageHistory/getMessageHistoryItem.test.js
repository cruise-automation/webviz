// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import getMessageHistoryItem from "./getMessageHistoryItem";
import { messagePathStructures } from "webviz-core/src/components/MessageHistory/messagePathsForDatatype";
import filterMap from "webviz-core/src/filterMap";
import type { Message, Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { topicsByTopicName } from "webviz-core/src/util/selectors";

function addValuesWithPathsToItems(messages, rosPath, topics, datatypes, globalVariables) {
  const structures = messagePathStructures(datatypes);
  const topic = topicsByTopicName(topics)[rosPath.topicName];
  return filterMap(messages, (message) =>
    getMessageHistoryItem(message, rosPath, topic, datatypes, globalVariables, structures)
  );
}

describe("getMessageHistoryItem", () => {
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

    expect(
      addValuesWithPathsToItems(
        messages,
        {
          topicName: "/some/topic",
          messagePath: [
            { type: "name", name: "some_array" },
            { type: "slice", start: 0, end: Infinity },
            { type: "name", name: "some_message" },
          ],
          modifier: undefined,
        },
        topics,
        datatypes
      )
    ).toEqual([
      {
        message: messages[0],
        queriedData: [
          {
            value: { x: 10, y: 20 },
            path: "/some/topic.some_array[:]{some_id==10}.some_message",
            constantName: undefined,
          },
        ],
      },
      {
        message: messages[1],
        queriedData: [
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
      },
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

    expect(
      addValuesWithPathsToItems(
        messages,
        {
          topicName: "/some/topic",
          messagePath: [{ type: "name", name: "some_array" }, { type: "slice", start: -2, end: -1 }],
          modifier: undefined,
        },
        topics,
        datatypes
      )
    ).toEqual([
      {
        message: messages[0],
        queriedData: [
          { constantName: undefined, path: "/some/topic.some_array[-2]", value: 4 },
          { constantName: undefined, path: "/some/topic.some_array[-1]", value: 5 },
        ],
      },
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

    // 1 global variable as single index - `/some/topic.an_array[$global_data_idx_a].some_id`
    const argsObj = {
      topicName: "/topic",
      messagePath: [
        { type: "name", name: "an_array" },
        {
          type: "slice",
          start: { variableName: "global_data_idx_a", startLoc: "/topic.an_array[$".length },
          end: { variableName: "global_data_idx_a", startLoc: "/topic.an_array[$".length },
        },
      ],
      modifier: undefined,
    };

    expect(addValuesWithPathsToItems(messages, argsObj, topics, datatypes, { global_data_idx_a: 2 })).toEqual([
      { message: messages[0], queriedData: [{ value: 15, path: "/topic.an_array[2]" }] },
    ]);

    // 2 global variables as indices - `/some/topic.an_array[$global_data_idx_a:$global_data_idx_b].some_id`
    const argsCopy1 = { ...argsObj };
    argsCopy1.messagePath[1] = {
      ...argsCopy1.messagePath[1],
      end: { variableName: "global_data_idx_b", startLoc: "/some/topic.an_array[$global_data_idx_a:$".length },
    };
    expect(
      addValuesWithPathsToItems(messages, argsCopy1, topics, datatypes, { global_data_idx_a: 1, global_data_idx_b: 2 })
    ).toEqual([
      {
        message: messages[0],
        queriedData: [{ path: "/topic.an_array[1]", value: 10 }, { path: "/topic.an_array[2]", value: 15 }],
      },
    ]);

    // 1 global variable for 1 of 2 indices (global variable first) - `/some/topic.an_array[$global_data_idx_a:1].some_id`
    const argsCopy2 = {
      ...argsObj,
      messagePath: [argsObj.messagePath[0], { type: "slice", start: 0, end: 1 }],
    };
    expect(addValuesWithPathsToItems(messages, argsCopy2, topics, datatypes, { global_data_idx_a: 0 })).toEqual([
      {
        message: messages[0],
        queriedData: [{ path: "/topic.an_array[0]", value: 5 }, { path: "/topic.an_array[1]", value: 10 }],
      },
    ]);

    // 1 global variable for 1 of 2 indices (global variable second) - `/some/topic.an_array[0:$global_data_idx_b].some_id`
    const argsCopy3 = {
      ...argsObj,
      messagePath: [
        argsObj.messagePath[0],
        {
          type: "slice",
          start: 0,
          end: { variableName: "global_data_idx_b", startLoc: "/topic.an_array[0:$".length },
        },
      ],
    };
    expect(addValuesWithPathsToItems(messages, argsCopy3, topics, datatypes, { global_data_idx_b: 3 })).toEqual([
      {
        message: messages[0],
        queriedData: [
          { path: "/topic.an_array[0]", value: 5 },
          { path: "/topic.an_array[1]", value: 10 },
          { path: "/topic.an_array[2]", value: 15 },
          { path: "/topic.an_array[3]", value: 20 },
        ],
      },
    ]);

    // without any global variable value
    expect(addValuesWithPathsToItems(messages, argsCopy3, topics, datatypes, {})).toEqual([
      {
        message: messages[0],
        queriedData: [],
      },
    ]);

    // with non-number global variable value
    expect(addValuesWithPathsToItems(messages, argsCopy3, topics, datatypes, { global_data_idx_b: "a" })).toEqual([
      {
        message: messages[0],
        queriedData: [],
      },
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
    expect(
      addValuesWithPathsToItems(messages, { topicName: "/some/topic", messagePath: [], modifier: undefined }, [], {})
    ).toEqual([]);
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
        {
          topicName: "/some/topic",
          messagePath: [
            { type: "name", name: "some_array" },
            { type: "slice", start: 0, end: Infinity },
            {
              type: "filter",
              path: ["some_filter_value"],
              value: "0",
              nameLoc: 0,
              valueLoc: "/some/topic.some_array[:]{some_filter_value==".length,
              repr: "some_filter_value==0",
            }, // Test with a string value, should still work!
            { type: "name", name: "some_id" },
          ],
          modifier: undefined,
        },
        topics,
        datatypes
      )
    ).toEqual([
      {
        message: messages[0],
        queriedData: [{ value: 10, path: "/some/topic.some_array[:]{some_filter_value==0}.some_id" }],
      },
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
        {
          topicName: "/some/topic",
          messagePath: [
            { type: "name", name: "some_array" },
            { type: "slice", start: 0, end: Infinity },
            {
              type: "filter",
              path: ["some_filter_value"],
              value: {
                variableName: "some_global_data_key",
                startLoc: "/some/topic.some_array[:]{some_filter_value==$".length,
              },
              nameLoc: 0,
              valueLoc: "/some/topic.some_array[:]{some_filter_value==".length,
              repr: "some_filter_value==$some_global_data_key",
            }, // Test with a string value, should still work!
            { type: "name", name: "some_id" },
          ],
          modifier: undefined,
        },
        topics,
        datatypes,
        { some_global_data_key: 5 }
      )
    ).toEqual([
      {
        message: messages[0],
        queriedData: [
          { value: 10, path: "/some/topic.some_array[:]{some_filter_value==$some_global_data_key}.some_id" },
        ],
      },
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

    expect(
      addValuesWithPathsToItems(
        messages,
        {
          topicName: "/some/topic",
          messagePath: [
            {
              type: "filter",
              path: ["str_field"],
              value: "A",
              nameLoc: 0,
              valueLoc: 0,
              repr: "str_field=='A'",
            },
            { type: "name", name: "num_field" },
          ],
          modifier: undefined,
        },
        topics,
        datatypes
      )
    ).toEqual([
      {
        message: messages[0],
        queriedData: [{ value: 1, path: "/some/topic{str_field=='A'}.num_field" }],
      },
      {
        message: messages[1],
        queriedData: [{ value: 2, path: "/some/topic{str_field=='A'}.num_field" }],
      },
    ]);

    expect(
      addValuesWithPathsToItems(
        messages,
        {
          topicName: "/some/topic",
          messagePath: [
            {
              type: "filter",
              path: ["str_field"],
              value: "B",
              nameLoc: 0,
              valueLoc: 0,
              repr: "str_field=='B'",
            },
            { type: "name", name: "num_field" },
          ],
          modifier: undefined,
        },
        topics,
        datatypes
      )
    ).toEqual([
      {
        message: messages[2],
        queriedData: [{ value: 2, path: "/some/topic{str_field=='B'}.num_field" }],
      },
    ]);

    expect(
      addValuesWithPathsToItems(
        messages,
        {
          topicName: "/some/topic",
          messagePath: [
            {
              type: "filter",
              path: ["num_field"],
              value: 2,
              nameLoc: 0,
              valueLoc: 0,
              repr: "num_field==2",
            },
            { type: "name", name: "num_field" },
          ],
          modifier: undefined,
        },
        topics,
        datatypes
      )
    ).toEqual([
      {
        message: messages[1],
        queriedData: [{ value: 2, path: "/some/topic{num_field==2}.num_field" }],
      },
      {
        message: messages[2],
        queriedData: [{ value: 2, path: "/some/topic{num_field==2}.num_field" }],
      },
    ]);

    expect(
      addValuesWithPathsToItems(
        messages,
        {
          topicName: "/some/topic",
          messagePath: [
            {
              type: "filter",
              path: ["str_field"],
              value: "A",
              nameLoc: 0,
              valueLoc: 0,
              repr: "str_field=='A'",
            },
            {
              type: "filter",
              path: ["num_field"],
              value: 2,
              nameLoc: 0,
              valueLoc: 0,
              repr: "num_field==2",
            },
            { type: "name", name: "num_field" },
          ],
          modifier: undefined,
        },
        topics,
        datatypes
      )
    ).toEqual([
      {
        message: messages[1],
        queriedData: [{ value: 2, path: "/some/topic{str_field=='A'}{num_field==2}.num_field" }],
      },
    ]);

    expect(
      addValuesWithPathsToItems(
        messages,
        {
          topicName: "/some/topic",
          messagePath: [
            {
              type: "filter",
              path: ["str_field"],
              value: "C",
              nameLoc: 0,
              valueLoc: 0,
              repr: "str_field=='C'",
            },
            { type: "name", name: "num_field" },
          ],
          modifier: undefined,
        },
        topics,
        datatypes
      )
    ).toEqual([]);
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

    expect(
      addValuesWithPathsToItems(
        messages,
        { topicName: "/some/topic", messagePath: [{ type: "name", name: "state" }], modifier: undefined },
        topics,
        datatypes
      )
    ).toEqual([
      {
        message: messages[0],
        queriedData: [
          {
            value: 0,
            path: "/some/topic.state",
            constantName: "OFF",
          },
        ],
      },
      {
        message: messages[1],
        queriedData: [
          {
            value: 1,
            path: "/some/topic.state",
            constantName: "ON",
          },
        ],
      },
    ]);
  });
});
