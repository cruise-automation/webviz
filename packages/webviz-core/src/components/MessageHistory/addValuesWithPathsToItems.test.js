// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import addValuesWithPathsToItems from "./addValuesWithPathsToItems";
import type { RawItem } from "./internalCommon";
import type { Topic } from "webviz-core/src/types/dataSources";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

describe("addValuesWithPathsToItems", () => {
  it("traverses down the path for every item", () => {
    const items: RawItem[] = [
      {
        timestamp: { sec: 0, nsec: 0 },
        elapsedSinceStart: { sec: 0, nsec: 0 },
        hasAccurateTimestamp: false,
        message: {
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
        index: 0,
      },
      {
        timestamp: { sec: 0, nsec: 0 },
        elapsedSinceStart: { sec: 0, nsec: 0 },
        hasAccurateTimestamp: false,
        message: {
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
        index: 1,
      },
    ];
    const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
    const datatypes: RosDatatypes = {
      some_datatype: [
        {
          name: "some_array",
          type: "some_other_datatype",
          isArray: true,
        },
      ],
      some_other_datatype: [
        {
          name: "some_id",
          type: "uint32",
        },
        {
          name: "some_message",
          type: "yet_another_datatype",
        },
      ],
      yet_another_datatype: [
        {
          name: "x",
          type: "uint32",
        },
        {
          name: "y",
          type: "uint32",
        },
      ],
    };

    expect(
      addValuesWithPathsToItems(
        items,
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
        ...items[0],
        queriedData: [
          {
            value: { x: 10, y: 20 },
            path: "/some/topic.some_array[:]{some_id==10}.some_message",
            constantName: undefined,
          },
        ],
      },
      {
        ...items[1],
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

  it("returns empty array for invalid topics", () => {
    const items: RawItem[] = [
      {
        timestamp: { sec: 0, nsec: 0 },
        elapsedSinceStart: { sec: 0, nsec: 0 },
        hasAccurateTimestamp: false,
        message: {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: 123,
        },
        index: 0,
      },
    ];
    expect(
      addValuesWithPathsToItems(items, { topicName: "/some/topic", messagePath: [], modifier: undefined }, [], {})
    ).toEqual([]);
  });

  it("filters properly, and uses the filter name in the path", () => {
    const items: RawItem[] = [
      {
        timestamp: { sec: 0, nsec: 0 },
        elapsedSinceStart: { sec: 0, nsec: 0 },
        hasAccurateTimestamp: false,
        message: {
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
        index: 1,
      },
    ];
    const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
    const datatypes: RosDatatypes = {
      some_datatype: [
        {
          name: "some_array",
          type: "some_other_datatype",
          isArray: true,
        },
      ],
      some_other_datatype: [
        {
          name: "some_filter_value",
          type: "uint32",
        },
        {
          name: "some_id",
          type: "uint32",
        },
      ],
    };

    expect(
      addValuesWithPathsToItems(
        items,
        {
          topicName: "/some/topic",
          messagePath: [
            { type: "name", name: "some_array" },
            { type: "slice", start: 0, end: Infinity },
            { type: "filter", name: "some_filter_value", value: "0", nameLoc: 0 }, // Test with a string value, should still work!
            { type: "name", name: "some_id" },
          ],
          modifier: undefined,
        },
        topics,
        datatypes
      )
    ).toEqual([
      {
        ...items[0],
        queriedData: [{ value: 10, path: "/some/topic.some_array[:]{some_filter_value==0}.some_id" }],
      },
    ]);
  });

  it("returns matching constants", () => {
    const items: RawItem[] = [
      {
        timestamp: { sec: 0, nsec: 0 },
        elapsedSinceStart: { sec: 0, nsec: 0 },
        hasAccurateTimestamp: false,
        message: {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            state: 0,
          },
        },
        index: 0,
      },
      {
        timestamp: { sec: 0, nsec: 0 },
        elapsedSinceStart: { sec: 0, nsec: 0 },
        hasAccurateTimestamp: false,
        message: {
          op: "message",
          topic: "/some/topic",
          datatype: "some_datatype",
          receiveTime: { sec: 0, nsec: 0 },
          message: {
            state: 1,
          },
        },
        index: 1,
      },
    ];
    const topics: Topic[] = [{ name: "/some/topic", datatype: "some_datatype" }];
    const datatypes: RosDatatypes = {
      some_datatype: [
        {
          name: "state",
          type: "uint32",
        },
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
      ],
    };

    expect(
      addValuesWithPathsToItems(
        items,
        { topicName: "/some/topic", messagePath: [{ type: "name", name: "state" }], modifier: undefined },
        topics,
        datatypes
      )
    ).toEqual([
      {
        ...items[0],
        queriedData: [
          {
            value: 0,
            path: "/some/topic.state",
            constantName: "OFF",
          },
        ],
      },
      {
        ...items[1],
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
