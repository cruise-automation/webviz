// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import signal from "webviz-core/shared/signal";
import { cast } from "webviz-core/src/players/types";
import { deepParse, getObject, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import { BobjectRpcSender, BobjectRpcReceiver } from "webviz-core/src/util/binaryObjects/BobjectRpc";
import { definitions, type HasComplexAndArray } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils.test";
import Rpc, { createLinkedChannels } from "webviz-core/src/util/Rpc";

const datatype = "fake_msgs/HasComplexAndArray";

const js = {
  header: {
    stamp: { sec: 0, nsec: 0 },
    seq: 0,
    frame_id: "",
  },
  stringArray: ["as", "df"],
};
const parsedBobject = cast<HasComplexAndArray>(wrapJsObject(definitions, datatype, js));

const intArray = new Int32Array([
  ...[0, 0, 0, 0, 0], //header
  ...[2, 28], // string array
  ...[2, 0, 2, 2], // string array index data (into bigString)
]);
const bigString = "asdf";
const binaryBobject = cast<HasComplexAndArray>(getObject(definitions, datatype, intArray.buffer, bigString));

const topic = "/topic";
const receiveTime = { sec: 1, nsec: 2 };

describe("BobjectRpc", () => {
  it("can send parsed -> parsed", async () => {
    const { local, remote } = createLinkedChannels();
    const sender = new BobjectRpcSender(new Rpc(local));
    const receiver = new BobjectRpcReceiver(new Rpc(remote));
    const promise = signal();

    receiver.receive("action name", "parsed", async (msg) => {
      expect(msg).toEqual({ topic, receiveTime, message: js });
      promise.resolve();
    });
    sender.send("action name", { topic, receiveTime, message: parsedBobject });
    await promise;
  });

  it("can send parsed -> bobject", async () => {
    const { local, remote } = createLinkedChannels();
    const sender = new BobjectRpcSender(new Rpc(local));
    const receiver = new BobjectRpcReceiver(new Rpc(remote));
    const promise = signal();

    receiver.receive("action name", "bobject", async (msg) => {
      expect(msg.topic).toBe(topic);
      expect(msg.receiveTime).toEqual(receiveTime);
      expect(deepParse(msg.message)).toEqual(js);
      promise.resolve();
    });
    sender.send("action name", { topic, receiveTime, message: parsedBobject });
    await promise;
  });

  it("can send binary -> parsed", async () => {
    const { local, remote } = createLinkedChannels();
    const sender = new BobjectRpcSender(new Rpc(local));
    const receiver = new BobjectRpcReceiver(new Rpc(remote));
    const promise = signal();

    receiver.receive("action name", "parsed", async (msg) => {
      expect(msg).toEqual({ topic, receiveTime, message: js });
      promise.resolve();
    });
    sender.send("action name", { topic, receiveTime, message: binaryBobject });
    await promise;
  });

  it("can send binary -> bobject", async () => {
    const { local, remote } = createLinkedChannels();
    const sender = new BobjectRpcSender(new Rpc(local));
    const receiver = new BobjectRpcReceiver(new Rpc(remote));
    const promise = signal();

    receiver.receive("action name", "bobject", async (msg) => {
      expect(msg.topic).toBe(topic);
      expect(msg.receiveTime).toEqual(receiveTime);
      expect(deepParse(msg.message)).toEqual(js);
      promise.resolve();
    });
    sender.send("action name", { topic, receiveTime, message: binaryBobject });
    await promise;
  });
});
