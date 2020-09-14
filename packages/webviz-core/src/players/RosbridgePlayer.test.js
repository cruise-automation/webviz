// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isBobject, deepParse } from "webviz-core/src/util/binaryObjects";

const headerMessage = ({ seq, stamp: { sec, nsec }, frame_id }) => {
  const bytes = Buffer.alloc(16 + frame_id.length);
  bytes.writeUInt32LE(seq, 0);
  bytes.writeUInt32LE(sec, 4);
  bytes.writeUInt32LE(nsec, 8);
  bytes.writeUInt32LE(frame_id.length, 12);
  bytes.write(frame_id, 16);
  return { bytes };
};

const textMessage = ({ text }) => {
  const bytes = Buffer.alloc(4 + text.length);
  bytes.writeUInt32LE(text.length, 0);
  bytes.write(text, 4);
  return { bytes };
};

let workerInstance: MockRosClient; // eslint-disable-line no-use-before-define
class MockRosClient {
  constructor() {
    workerInstance = this;
  }

  _topics = [];
  _types = [];
  _typedefs_full_text = [];
  _connectCallback: ?any;
  _messages = [];

  setup({
    topics = [],
    types = [],
    typedefs = [],
    messages = [],
  }: {
    topics?: string[],
    types?: string[],
    typedefs?: string[],
    messages?: any[],
  }) {
    this._topics = topics;
    this._types = types;
    this._typedefs_full_text = typedefs;
    this._messages = messages;

    if (this._connectCallback) {
      this._connectCallback();
    }
  }

  on(op, callback) {
    if (op === "connection") {
      this._connectCallback = callback;
    }
  }

  close() {}

  getTopicsAndRawTypes(callback) {
    callback({
      topics: this._topics,
      types: this._types,
      typedefs_full_text: this._typedefs_full_text,
    });
  }

  getMessagesByTopicName(topicName): any[] {
    return this._messages.filter(({ topic }) => topic === topicName);
  }
}

class MockRosTopic {
  _name = "";

  constructor({ name }) {
    this._name = name;
  }

  subscribe(callback) {
    workerInstance.getMessagesByTopicName(this._name).forEach(({ message }) => callback(message));
  }
}

const MockROSLIB = {
  Ros: MockRosClient,
  Topic: MockRosTopic,
};

// Mock ROSLIB with a custom implementation for tests.
// Also, assign it to the window object so it can be used correctly
// from RosbridgePlayer.
jest.mock("roslib/build/roslib", () => MockROSLIB);
window.ROSLIB = MockROSLIB;

const RosbridgePlayer = require("./RosbridgePlayer").default;

describe("RosbridgePlayer", () => {
  let player;

  beforeEach(() => {
    player = new RosbridgePlayer("ws://some-url");
  });

  afterEach(() => {
    player.close();
  });

  it("subscribes to topics without errors", (done) => {
    workerInstance.setup({
      topics: ["/topic/A"],
      types: ["/std_msgs/Header"],
      typedefs: [
        `std_msgs/Header header

      ================================================================================
      MSG: std_msgs/Header
      uint32 seq
      time stamp
      string frame_id`,
      ],
    });

    player.setSubscriptions([{ topic: "/topic/A", format: "parsedMessages" }]);
    player.setListener(async ({ activeData }) => {
      const { topics } = activeData || {};
      if (!topics) {
        return Promise.resolve();
      }

      expect(topics).toStrictEqual([{ name: "/topic/A", datatype: "/std_msgs/Header" }]);
      done();
      return Promise.resolve();
    });
  });

  describe("bobjects", () => {
    beforeEach(() => {
      workerInstance.setup({
        topics: ["/topic/A", "/topic/B"],
        types: ["/std_msgs/Header", "text"],
        typedefs: [
          `std_msgs/Header header

            ================================================================================
            MSG: std_msgs/Header
            uint32 seq
            time stamp
            string frame_id`,
          `string text`,
        ],
        messages: [
          {
            topic: "/topic/A",
            receiveTime: { sec: 100, nsec: 0 },
            message: headerMessage({ seq: 7643, stamp: { sec: 1234, nsec: 5678 }, frame_id: "someFrameId" }),
          },
          {
            topic: "/topic/B",
            receiveTime: { sec: 100, nsec: 0 },
            message: textMessage({ text: "some text" }),
          },
        ],
      });
    });

    it("returns bobjects with complex type", (done) => {
      player.setSubscriptions([{ topic: "/topic/A", format: "bobjects" }]);

      player.setListener(async ({ activeData }) => {
        const { messages, bobjects } = activeData || {};
        if (!messages || !bobjects) {
          return Promise.resolve();
        }

        expect(messages.length).toBe(0);

        expect(bobjects.length).toBe(1);
        expect(isBobject(bobjects[0].message)).toBe(true);
        expect(deepParse(bobjects[0].message)).toStrictEqual({
          header: {
            seq: 7643,
            stamp: { sec: 1234, nsec: 5678 },
            frame_id: "someFrameId",
          },
        });

        done();
        return Promise.resolve();
      });
    });

    it("returns bobjects with basic types", (done) => {
      player.setSubscriptions([{ topic: "/topic/B", format: "bobjects" }]);

      player.setListener(async ({ activeData }) => {
        const { messages, bobjects } = activeData || {};
        if (!messages || !bobjects) {
          return Promise.resolve();
        }

        expect(messages.length).toBe(0);

        expect(bobjects.length).toBe(1);
        expect(isBobject(bobjects[0].message)).toBe(true);
        expect(deepParse(bobjects[0].message)).toStrictEqual({
          text: "some text",
        });

        done();
        return Promise.resolve();
      });
    });

    it("returns parsedMessages with complex type", (done) => {
      player.setSubscriptions([{ topic: "/topic/A", format: "parsedMessages" }]);

      player.setListener(async ({ activeData }) => {
        const { messages, bobjects } = activeData || {};
        if (!messages || !bobjects) {
          return Promise.resolve();
        }

        expect(messages.length).toBe(1);
        expect(isBobject(messages[0].message)).toBe(false);
        expect(messages[0].message).toEqual({
          header: {
            seq: 7643,
            stamp: { sec: 1234, nsec: 5678 },
            frame_id: "someFrameId",
          },
        });

        expect(bobjects.length).toBe(0);

        done();
        return Promise.resolve();
      });
    });

    it("returns parsedMessages with basic types", (done) => {
      player.setSubscriptions([{ topic: "/topic/B", format: "parsedMessages" }]);

      player.setListener(async ({ activeData }) => {
        const { messages, bobjects } = activeData || {};
        if (!messages || !bobjects) {
          return Promise.resolve();
        }

        expect(messages.length).toBe(1);
        expect(isBobject(messages[0].message)).toBe(false);
        expect(messages[0].message).toEqual({
          text: "some text",
        });

        expect(bobjects.length).toBe(0);

        done();
        return Promise.resolve();
      });
    });

    it("returns mixed messages", (done) => {
      player.setSubscriptions([
        { topic: "/topic/A", format: "parsedMessages" },
        { topic: "/topic/B", format: "bobjects" },
      ]);

      player.setListener(async ({ activeData }) => {
        const { messages, bobjects } = activeData || {};
        if (!messages || !bobjects) {
          return Promise.resolve();
        }

        expect(messages.length).toBe(1);
        expect(isBobject(messages[0].message)).toBe(false);
        expect(messages[0].message).toEqual({
          header: {
            seq: 7643,
            stamp: { sec: 1234, nsec: 5678 },
            frame_id: "someFrameId",
          },
        });

        expect(bobjects.length).toBe(1);
        expect(isBobject(bobjects[0].message)).toBe(true);
        expect(deepParse(bobjects[0].message)).toStrictEqual({
          text: "some text",
        });

        done();
        return Promise.resolve();
      });
    });

    it("handles multiple subscriptions to the same topic using different formats", (done) => {
      player.setSubscriptions([
        { topic: "/topic/A", format: "parsedMessages" },
        { topic: "/topic/A", format: "bobjects" },
      ]);

      player.setListener(async ({ activeData }) => {
        const { messages, bobjects } = activeData || {};
        if (!messages || !bobjects) {
          return Promise.resolve();
        }

        expect(messages.length).toBe(1);
        expect(isBobject(messages[0].message)).toBe(false);
        expect(messages[0].message).toEqual({
          header: {
            seq: 7643,
            stamp: { sec: 1234, nsec: 5678 },
            frame_id: "someFrameId",
          },
        });

        expect(bobjects.length).toBe(1);
        expect(isBobject(bobjects[0].message)).toBe(true);
        expect(deepParse(bobjects[0].message)).toStrictEqual({
          header: {
            seq: 7643,
            stamp: { sec: 1234, nsec: 5678 },
            frame_id: "someFrameId",
          },
        });

        done();
        return Promise.resolve();
      });
    });
  });
});
