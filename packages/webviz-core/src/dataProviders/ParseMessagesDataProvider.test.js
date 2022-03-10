// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { keyBy } from "lodash";

import BagDataProvider from "webviz-core/src/dataProviders/BagDataProvider";
import { CoreDataProviders } from "webviz-core/src/dataProviders/constants";
import createGetDataProvider from "webviz-core/src/dataProviders/createGetDataProvider";
import MemoryCacheDataProvider from "webviz-core/src/dataProviders/MemoryCacheDataProvider";
import ParseMessagesDataProvider from "webviz-core/src/dataProviders/ParseMessagesDataProvider";
import RewriteBinaryDataProvider from "webviz-core/src/dataProviders/RewriteBinaryDataProvider";
import { objectValues } from "webviz-core/src/util";

function getProvider() {
  return new ParseMessagesDataProvider(
    {},
    [
      {
        name: CoreDataProviders.MemoryCacheDataProvider,
        args: {},
        children: [
          {
            name: CoreDataProviders.RewriteBinaryDataProvider,
            args: {},
            children: [
              {
                name: CoreDataProviders.BagDataProvider,
                args: { bagPath: { type: "file", file: `${__dirname}/../../public/fixtures/example.bag` } },
                children: [],
              },
            ],
          },
        ],
      },
    ],
    createGetDataProvider({ BagDataProvider, MemoryCacheDataProvider, RewriteBinaryDataProvider })
  );
}

const dummyExtensionPoint = {
  progressCallback() {},
  reportMetadataCallback() {},
  notifyPlayerManager: async () => {},
  nodePlaygroundActions: {
    setCompiledNodeData: jest.fn(),
    addUserNodeLogs: jest.fn(),
    setUserNodeRosLib: jest.fn(),
  },
};

describe("ParseMessagesDataProvider", () => {
  it("initializes", async () => {
    const provider = getProvider();
    const result = await provider.initialize(dummyExtensionPoint);
    expect(result.start).toEqual({ sec: 1396293887, nsec: 844783943 });
    expect(result.end).toEqual({ sec: 1396293909, nsec: 544870199 });
    expect(keyBy(result.topics, "name")).toEqual({
      "/rosout": { datatypeName: "rosgraph_msgs/Log", datatypeId: expect.any(String), name: "/rosout", numMessages: 1 },
      "/turtle1/color_sensor": {
        datatypeName: "turtlesim/Color",
        datatypeId: expect.any(String),
        name: "/turtle1/color_sensor",
        numMessages: 1351,
      },
      "/tf_static": {
        datatypeName: "tf2_msgs/TFMessage",
        datatypeId: expect.any(String),
        name: "/tf_static",
        numMessages: 1,
      },
      "/turtle2/color_sensor": {
        datatypeName: "turtlesim/Color",
        datatypeId: expect.any(String),
        name: "/turtle2/color_sensor",
        numMessages: 1344,
      },
      "/turtle1/pose": {
        datatypeName: "turtlesim/Pose",
        datatypeId: expect.any(String),
        name: "/turtle1/pose",
        numMessages: 1344,
      },
      "/turtle2/pose": {
        datatypeName: "turtlesim/Pose",
        datatypeId: expect.any(String),
        name: "/turtle2/pose",
        numMessages: 1344,
      },
      "/tf": { datatypeName: "tf/tfMessage", datatypeId: expect.any(String), name: "/tf", numMessages: 1344 },
      "/turtle2/cmd_vel": {
        datatypeName: "geometry_msgs/Twist",
        datatypeId: expect.any(String),
        name: "/turtle2/cmd_vel",
        numMessages: 208,
      },
      "/turtle1/cmd_vel": {
        datatypeName: "geometry_msgs/Twist",
        datatypeId: expect.any(String),
        name: "/turtle1/cmd_vel",
        numMessages: 357,
      },
    });
    const { messageDefinitions } = result;
    if (messageDefinitions.type !== "parsed") {
      throw new Error("ParseMessagesDataProvider should return parsed message definitions");
    }
    expect(objectValues(messageDefinitions.datatypes).map(({ name }) => name)).toContainOnly([
      "rosgraph_msgs/Log",
      "std_msgs/Header",
      "turtlesim/Color",
      "tf2_msgs/TFMessage",
      "geometry_msgs/TransformStamped",
      "geometry_msgs/Transform",
      "geometry_msgs/Vector3",
      "geometry_msgs/Quaternion",
      "turtlesim/Pose",
      "tf/tfMessage",
      "geometry_msgs/Twist",
    ]);
  });

  it("gets messages", async () => {
    const provider = getProvider();
    await provider.initialize(dummyExtensionPoint);
    const start = { sec: 1396293887, nsec: 844783943 };
    const end = { sec: 1396293888, nsec: 60000000 };
    const messages = await provider.getMessages(start, end, { parsedMessages: ["/tf"], bobjects: [] });
    expect(messages.bobjects).toEqual([]);
    expect(messages.rosBinaryMessages).toBe(undefined);
    expect(messages.parsedMessages).toHaveLength(2);
    expect(messages.parsedMessages).toEqual([
      {
        topic: "/tf",
        receiveTime: {
          sec: 1396293888,
          nsec: 56251251,
        },
        message: {
          transforms: [
            {
              child_frame_id: "turtle2",
              header: { frame_id: "world", seq: 0, stamp: { nsec: 56065082, sec: 1396293888 } },
              transform: { rotation: { w: 1, x: 0, y: 0, z: 0 }, translation: { x: 4, y: 9.088889122009277, z: 0 } },
            },
          ],
        },
      },
      {
        message: {
          transforms: [
            {
              child_frame_id: "turtle1",
              header: { frame_id: "world", seq: 0, stamp: { nsec: 56102037, sec: 1396293888 } },
              transform: {
                rotation: { w: 1, x: 0, y: 0, z: 0 },
                translation: { x: 5.544444561004639, y: 5.544444561004639, z: 0 },
              },
            },
          ],
        },
        receiveTime: { nsec: 56262848, sec: 1396293888 },
        topic: "/tf",
      },
    ]);
  });

  it("does not return parsed messages for binary-only requests", async () => {
    const provider = getProvider();
    await provider.initialize(dummyExtensionPoint);
    const start = { sec: 1396293887, nsec: 844783943 };
    const end = { sec: 1396293888, nsec: 60000000 };
    const messages1 = await provider.getMessages(start, end, { parsedMessages: ["/tf"], bobjects: [] });
    expect(messages1.bobjects).toEqual([]);
    expect(messages1.rosBinaryMessages).toBe(undefined);
    expect(messages1.parsedMessages).toHaveLength(2);
    const messages2 = await provider.getMessages(start, end, { parsedMessages: [], bobjects: ["/tf"] });
    expect(messages2.rosBinaryMessages).toBe(undefined);
    expect(messages2.bobjects).toHaveLength(2);
    expect(messages2.parsedMessages).toEqual([]);
  });
});
