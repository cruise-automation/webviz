// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { BagDataProvider } from "./BagDataProvider";
import { BagProviderWorker } from "./BagDataProvider.worker";
import Rpc, { createLinkedChannels } from "webviz-core/src/util/Rpc";

describe("Provider", () => {
  it("initializes", async () => {
    const channels = createLinkedChannels();
    new BagProviderWorker(new Rpc(channels.remote));
    const provider = new BagDataProvider(`${__dirname}/example.bag`, new Rpc(channels.local));
    const result = await provider.initialize();
    expect(result.start).toEqual({ sec: 1396293887, nsec: 844783943 });
    expect(result.end).toEqual({ sec: 1396293909, nsec: 544870199 });
    expect(result.topics).toContainOnly([
      { datatype: "rosgraph_msgs/Log", topic: "/rosout" },
      { datatype: "turtlesim/Color", topic: "/turtle1/color_sensor" },
      { datatype: "tf2_msgs/TFMessage", topic: "/tf_static" },
      { datatype: "turtlesim/Color", topic: "/turtle2/color_sensor" },
      { datatype: "turtlesim/Pose", topic: "/turtle1/pose" },
      { datatype: "turtlesim/Pose", topic: "/turtle2/pose" },
      { datatype: "tf/tfMessage", topic: "/tf" },
      { datatype: "geometry_msgs/Twist", topic: "/turtle2/cmd_vel" },
      { datatype: "geometry_msgs/Twist", topic: "/turtle1/cmd_vel" },
    ]);
    expect(Object.keys(result.datatypes)).toContainOnly([
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
    const channels = createLinkedChannels();
    new BagProviderWorker(new Rpc(channels.remote));
    const provider = new BagDataProvider(`${__dirname}/example.bag`, new Rpc(channels.local));
    await provider.initialize();
    const start = { sec: 1396293887, nsec: 844783943 };
    const end = { sec: 1396293888, nsec: 60000000 };
    const messages = await provider.getMessages(start, end, ["/tf"]);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({
      topic: "/tf",
      datatype: "tf/tfMessage",
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
    });
    expect(messages[1]).toEqual({
      datatype: "tf/tfMessage",
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
    });
  });
});
