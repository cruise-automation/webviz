// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { TimeUtil } from "rosbag";

import delay from "webviz-core/shared/delay";
import BagDataProvider, { statsAreAdjacent } from "webviz-core/src/dataProviders/BagDataProvider";
import sendNotification from "webviz-core/src/util/sendNotification";

const dummyExtensionPoint = {
  progressCallback() {},
  reportMetadataCallback() {},
  notifyPlayerManager: async () => {},
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
      { datatype: "rosgraph_msgs/Log", name: "/rosout", numMessages: 1 },
      { datatype: "turtlesim/Color", name: "/turtle1/color_sensor", numMessages: 1351 },
      { datatype: "tf2_msgs/TFMessage", name: "/tf_static", numMessages: 1 },
      { datatype: "turtlesim/Color", name: "/turtle2/color_sensor", numMessages: 1344 },
      { datatype: "turtlesim/Pose", name: "/turtle1/pose", numMessages: 1344 },
      { datatype: "turtlesim/Pose", name: "/turtle2/pose", numMessages: 1344 },
      { datatype: "tf/tfMessage", name: "/tf", numMessages: 1344 },
      { datatype: "geometry_msgs/Twist", name: "/turtle2/cmd_vel", numMessages: 208 },
      { datatype: "geometry_msgs/Twist", name: "/turtle1/cmd_vel", numMessages: 357 },
    ]);
    const { messageDefinitions } = result;
    if (messageDefinitions.type !== "raw") {
      throw new Error("BagDataProvider requires raw message definitions");
    }
    expect(Object.keys(messageDefinitions.messageDefinitionsByTopic)).toContainOnly([
      "/rosout",
      "/turtle1/color_sensor",
      "/tf_static",
      "/turtle2/color_sensor",
      "/turtle1/pose",
      "/turtle2/pose",
      "/tf",
      "/turtle2/cmd_vel",
      "/turtle1/cmd_vel",
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
      { datatype: "rosgraph_msgs/Log", name: "/rosout", numMessages: 10 },
      { datatype: "turtlesim/Color", name: "/turtle1/color_sensor", numMessages: 1351 },
      { datatype: "tf2_msgs/TFMessage", name: "/tf_static", numMessages: 1 },
      { datatype: "turtlesim/Color", name: "/turtle2/color_sensor", numMessages: 1344 },
      { datatype: "turtlesim/Pose", name: "/turtle1/pose", numMessages: 1344 },
      { datatype: "turtlesim/Pose", name: "/turtle2/pose", numMessages: 1344 },
      { datatype: "tf/tfMessage", name: "/tf", numMessages: 2688 },
      { datatype: "geometry_msgs/Twist", name: "/turtle2/cmd_vel", numMessages: 208 },
      { datatype: "geometry_msgs/Twist", name: "/turtle1/cmd_vel", numMessages: 357 },
    ]);
    const { messageDefinitions } = result;
    if (messageDefinitions.type !== "raw") {
      throw new Error("BagDataProvider requires raw message definitions");
    }
    expect(Object.keys(messageDefinitions.messageDefinitionsByTopic)).toContainOnly([
      "/rosout",
      "/turtle1/color_sensor",
      "/tf_static",
      "/turtle2/color_sensor",
      "/turtle1/pose",
      "/turtle2/pose",
      "/tf",
      "/turtle2/cmd_vel",
      "/turtle1/cmd_vel",
    ]);
  });

  it("gets messages", async () => {
    const provider = new BagDataProvider(
      { bagPath: { type: "file", file: `${__dirname}/../../public/fixtures/example.bag` } },
      []
    );
    await provider.initialize(dummyExtensionPoint);
    const start = { sec: 1396293887, nsec: 844783943 };
    const end = { sec: 1396293888, nsec: 60000000 };
    const messages = await provider.getMessages(start, end, { rosBinaryMessages: ["/tf"] });
    expect(messages.bobjects).toBe(undefined);
    expect(messages.parsedMessages).toBe(undefined);
    expect(messages.rosBinaryMessages).toEqual([
      { topic: "/tf", receiveTime: { sec: 1396293888, nsec: 56251251 }, message: expect.any(ArrayBuffer) },
      { topic: "/tf", receiveTime: { nsec: 56262848, sec: 1396293888 }, message: expect.any(ArrayBuffer) },
    ]);
  });

  it("sorts shuffled messages (and reports an error)", async () => {
    const provider = new BagDataProvider(
      { bagPath: { type: "file", file: `${__dirname}/../../public/fixtures/demo-shuffled.bag` } },
      []
    );
    await provider.initialize(dummyExtensionPoint);
    const start = { sec: 1490148912, nsec: 0 };
    const end = { sec: 1490148913, nsec: 0 };
    const { bobjects, parsedMessages, rosBinaryMessages } = await provider.getMessages(start, end, {
      rosBinaryMessages: ["/tf"],
    });
    expect(bobjects).toBe(undefined);
    expect(parsedMessages).toBe(undefined);
    if (rosBinaryMessages == null) {
      throw new Error("Satisfy flow");
    }
    const timestamps = rosBinaryMessages.map(({ receiveTime }) => receiveTime);
    const sortedTimestamps = [...timestamps];
    sortedTimestamps.sort(TimeUtil.compare);
    expect(timestamps).toEqual(sortedTimestamps);
    sendNotification.expectCalledDuringTest();
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
    expect(sendNotification.mock.calls).toEqual([
      [
        "Empty connections found",
        'This bag has some empty connections, which Webviz does not currently support. We\'ll try to play the remaining topics. Details:\n\n[{"offset":5254,"dataOffset":5310,"end":5475,"length":221,"conn":0,"topic":"/led_array_status","type":"led_array_msgs/Status","md5sum":"53a14e6cadee4d14930b099922d25397","messageDefinition":"","callerid":"/led_array_node","latching":false}]',
        "user",
        "warn",
      ],
      ["Cannot play invalid bag", "Bag is empty or corrupt.", "user", "error"],
    ]);
    sendNotification.expectCalledDuringTest();
  });
});

describe("statsAreAdjacent", () => {
  it("returns false when topics have changed", () => {
    const a = {
      startTime: { sec: 10, nsec: 500 },
      endTime: { sec: 10, nsec: 599 },
      data: {
        type: "average_throughput",
        topics: ["/topic1"],
        totalSizeOfMessages: 10,
        numberOfMessages: 1,
        receivedRangeDuration: { sec: 0, nsec: 100 },
        requestedRangeDuration: { sec: 0, nsec: 100 },
        totalTransferTime: { sec: 0, nsec: 500 },
      },
    };
    const b = {
      startTime: { sec: 10, nsec: 600 },
      endTime: { sec: 10, nsec: 699 },
      data: {
        type: "average_throughput",
        topics: ["/topic1", "/topic2"],
        totalSizeOfMessages: 10,
        numberOfMessages: 1,
        receivedRangeDuration: { sec: 0, nsec: 100 },
        requestedRangeDuration: { sec: 0, nsec: 100 },
        totalTransferTime: { sec: 0, nsec: 500 },
      },
    };
    expect(statsAreAdjacent(a, b)).toBe(false);
  });

  it("returns false when requests are far away from each other", () => {
    const a = {
      startTime: { sec: 10, nsec: 500 },
      endTime: { sec: 10, nsec: 599 },
      data: {
        type: "average_throughput",
        topics: ["/topic1"],
        totalSizeOfMessages: 10,
        numberOfMessages: 1,
        receivedRangeDuration: { sec: 0, nsec: 100 },
        requestedRangeDuration: { sec: 0, nsec: 100 },
        totalTransferTime: { sec: 0, nsec: 500 },
      },
    };
    const b = {
      startTime: { sec: 20, nsec: 600 },
      endTime: { sec: 20, nsec: 699 },
      data: {
        type: "average_throughput",
        topics: ["/topic1"],
        totalSizeOfMessages: 10,
        numberOfMessages: 1,
        receivedRangeDuration: { sec: 0, nsec: 100 },
        requestedRangeDuration: { sec: 0, nsec: 100 },
        totalTransferTime: { sec: 0, nsec: 500 },
      },
    };
    expect(statsAreAdjacent(a, b)).toBe(false);
  });

  it("returns true when stats are adjacent", () => {
    const a = {
      startTime: { sec: 10, nsec: 500 },
      endTime: { sec: 10, nsec: 599 },
      data: {
        type: "average_throughput",
        topics: ["/topic1"],
        totalSizeOfMessages: 10,
        numberOfMessages: 1,
        receivedRangeDuration: { sec: 0, nsec: 100 },
        requestedRangeDuration: { sec: 0, nsec: 100 },
        totalTransferTime: { sec: 0, nsec: 500 },
      },
    };
    const b = {
      startTime: { sec: 10, nsec: 600 },
      endTime: { sec: 10, nsec: 699 },
      data: {
        type: "average_throughput",
        topics: ["/topic1"],
        totalSizeOfMessages: 12,
        numberOfMessages: 2,
        receivedRangeDuration: { sec: 0, nsec: 100 },
        requestedRangeDuration: { sec: 0, nsec: 100 },
        totalTransferTime: { sec: 0, nsec: 500 },
      },
    };
    expect(statsAreAdjacent(a, b)).toBe(true);
  });
});
