// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { TimeUtil } from "rosbag";

import delay from "webviz-core/shared/delay";
import BagDataProvider from "webviz-core/src/dataProviders/BagDataProvider";
import { mockExtensionPoint } from "webviz-core/src/dataProviders/mockExtensionPoint";
import reportError from "webviz-core/src/util/reportError";

const dummyExtensionPoint = {
  progressCallback() {},
  reportMetadataCallback() {},
};

describe("BagDataProvider", () => {
  it("initializes", async () => {
    const provider = new BagDataProvider(
      { bagPath: { type: "file", file: `${__dirname}/../../public/fixtures/example.bag` } },
      []
    );
    const result = await provider.initialize(dummyExtensionPoint);
    expect(result.start).toEqual({ sec: 1396293887, nsec: 844783943 });
    expect(result.end).toEqual({ sec: 1396293909, nsec: 544870199 });
    expect(result.topics).toContainOnly([
      { datatype: "rosgraph_msgs/Log", name: "/rosout" },
      { datatype: "turtlesim/Color", name: "/turtle1/color_sensor" },
      { datatype: "tf2_msgs/TFMessage", name: "/tf_static" },
      { datatype: "turtlesim/Color", name: "/turtle2/color_sensor" },
      { datatype: "turtlesim/Pose", name: "/turtle1/pose" },
      { datatype: "turtlesim/Pose", name: "/turtle2/pose" },
      { datatype: "tf/tfMessage", name: "/tf" },
      { datatype: "geometry_msgs/Twist", name: "/turtle2/cmd_vel" },
      { datatype: "geometry_msgs/Twist", name: "/turtle1/cmd_vel" },
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

  it("initializes with bz2 bag", async () => {
    const provider = new BagDataProvider(
      { bagPath: { type: "file", file: `${__dirname}/../../public/fixtures/example-bz2.bag` } },
      []
    );
    const result = await provider.initialize(dummyExtensionPoint);
    expect(result.start).toEqual({ sec: 1396293887, nsec: 844783943 });
    expect(result.end).toEqual({ sec: 1396293909, nsec: 544870199 });
    expect(result.topics).toContainOnly([
      { datatype: "rosgraph_msgs/Log", name: "/rosout" },
      { datatype: "turtlesim/Color", name: "/turtle1/color_sensor" },
      { datatype: "tf2_msgs/TFMessage", name: "/tf_static" },
      { datatype: "turtlesim/Color", name: "/turtle2/color_sensor" },
      { datatype: "turtlesim/Pose", name: "/turtle1/pose" },
      { datatype: "turtlesim/Pose", name: "/turtle2/pose" },
      { datatype: "tf/tfMessage", name: "/tf" },
      { datatype: "geometry_msgs/Twist", name: "/turtle2/cmd_vel" },
      { datatype: "geometry_msgs/Twist", name: "/turtle1/cmd_vel" },
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

  it("calls progress callback while initializing with a local bag", async () => {
    const provider = new BagDataProvider(
      { bagPath: { type: "file", file: `${__dirname}/../../public/fixtures/example.bag` } },
      []
    );
    const extensionPoint = mockExtensionPoint().extensionPoint;
    jest.spyOn(extensionPoint, "progressCallback");
    await provider.initialize(extensionPoint);
    expect(extensionPoint.progressCallback).toHaveBeenCalledWith({ fullyLoadedFractionRanges: [{ start: 0, end: 1 }] });
  });

  it("gets messages", async () => {
    const provider = new BagDataProvider(
      { bagPath: { type: "file", file: `${__dirname}/../../public/fixtures/example.bag` } },
      []
    );
    await provider.initialize(dummyExtensionPoint);
    const start = { sec: 1396293887, nsec: 844783943 };
    const end = { sec: 1396293888, nsec: 60000000 };
    const messages = await provider.getMessages(start, end, ["/tf"]);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({
      topic: "/tf",
      receiveTime: {
        sec: 1396293888,
        nsec: 56251251,
      },
      message: expect.any(ArrayBuffer),
    });
    expect(messages[1]).toEqual({
      topic: "/tf",
      receiveTime: { nsec: 56262848, sec: 1396293888 },
      message: expect.any(ArrayBuffer),
    });
  });

  it("sorts shuffled messages (and reports an error)", async () => {
    const provider = new BagDataProvider(
      { bagPath: { type: "file", file: `${__dirname}/../../public/fixtures/demo-shuffled.bag` } },
      []
    );
    await provider.initialize(dummyExtensionPoint);
    const start = { sec: 1490148912, nsec: 0 };
    const end = { sec: 1490148913, nsec: 0 };
    const messages = await provider.getMessages(start, end, ["/tf"]);
    const timestamps = messages.map(({ receiveTime }) => receiveTime);
    const sortedTimestamps = [...timestamps];
    sortedTimestamps.sort(TimeUtil.compare);
    expect(timestamps).toEqual(sortedTimestamps);
    reportError.expectCalledDuringTest();
  });

  // Regression test for https://github.com/cruise-automation/webviz/issues/373
  it("treats an empty message definition as a non-existent connection (therefore thinking this bag is empty)", async () => {
    const provider = new BagDataProvider(
      {
        bagPath: { type: "file", file: `${__dirname}/../../public/fixtures/bag-with-empty-message-definition.bag` },
      },
      []
    );
    provider.initialize(dummyExtensionPoint);
    await delay(100); // Call above returns promise that never resolves.
    // $FlowFixMe - doesn't understand this mock
    expect(reportError.mock.calls).toEqual([
      [
        "Warning: Malformed connections found",
        'This bag has some malformed connections. We\'ll try to play the remaining topics. Details:\n\n[{"offset":5254,"dataOffset":5310,"end":5475,"length":221,"conn":0,"topic":"/led_array_status","type":"led_array_msgs/Status","md5sum":"53a14e6cadee4d14930b099922d25397","messageDefinition":"","callerid":"/led_array_node","latching":false}]',
        "user",
      ],
      ["Cannot play invalid bag", "Bag is empty or corrupt.", "user"],
    ]);
    reportError.expectCalledDuringTest();
  });
});
