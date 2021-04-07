// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import signal from "webviz-core/shared/signal";
import { cast } from "webviz-core/src/players/types";
import { wrapObjects } from "webviz-core/src/test/datatypes";
import { deepParse, getObject, merge, wrapJsObject } from "webviz-core/src/util/binaryObjects";
import {
  BobjectRpcSender,
  BobjectRpcReceiver,
  findBinaryDataLocations,
} from "webviz-core/src/util/binaryObjects/BobjectRpc";
import { getSourceData } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";
import { definitions, type HasComplexAndArray } from "webviz-core/src/util/binaryObjects/testUtils";
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

const mixedBobject = cast<HasComplexAndArray>(
  wrapJsObject(definitions, datatype, { ...js, header: binaryBobject.header() })
);
const jsPrimitiveArrayObject = { stringArray: ["hello", "world"] };
const binaryPrimitiveArrayBobject = wrapObjects([jsPrimitiveArrayObject])[0];
const mixedBinaryPrimitiveArrayBobject = merge(binaryPrimitiveArrayBobject, {
  stringArray: binaryPrimitiveArrayBobject.stringArray(),
});

const jsComplexArrayObject = { complexArray: [{ foo: 1, bar: "a" }, { foo: 2, bar: "b" }] };
const binaryComplexArrayBobject = wrapObjects([jsComplexArrayObject])[0];
const mixedBinaryComplexArrayBobject = merge(binaryComplexArrayBobject, {
  complexArray: binaryComplexArrayBobject.complexArray(),
});

const topic = "/topic";
const receiveTime = { sec: 1, nsec: 2 };

const isBinary = (message) => "buffer" in (getSourceData(Object.getPrototypeOf(message).constructor) ?? {});

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

  it("sends some binary data for mixed binary/parsed messages", async () => {
    const { local, remote } = createLinkedChannels();
    const sender = new BobjectRpcSender(new Rpc(local));
    const receiver = new BobjectRpcReceiver(new Rpc(remote));
    const promise = signal();

    receiver.receive("action name", "bobject", async (msg) => {
      expect(msg.topic).toBe(topic);
      expect(msg.receiveTime).toEqual(receiveTime);
      expect(deepParse(msg.message)).toEqual(js);
      // Message should be a reverse-wrapped bobject
      expect(isBinary(msg.message)).toBe(false);
      // Header should be a binary bobject
      expect(isBinary(msg.message.header())).toBe(true);
      promise.resolve();
    });
    sender.send("action name", { topic, receiveTime, message: mixedBobject });
    await promise;
  });

  it("can send nested binary primitive arrays across worker boundaries", async () => {
    const { local, remote } = createLinkedChannels();
    const sender = new BobjectRpcSender(new Rpc(local));
    const receiver = new BobjectRpcReceiver(new Rpc(remote));
    const promise = signal();
    receiver.receive("action name", "bobject", async (msg) => {
      expect(deepParse(msg.message)).toEqual(jsPrimitiveArrayObject);
      // Message should be a reverse-wrapped bobject
      expect(isBinary(msg.message)).toBe(false);
      // stringArray should be binary
      expect(isBinary(msg.message.stringArray())).toBe(true);
      promise.resolve();
    });
    sender.send("action name", { topic, receiveTime, message: mixedBinaryPrimitiveArrayBobject });
    await promise;
  });

  it("can send nested binary complex arrays across worker boundaries", async () => {
    const { local, remote } = createLinkedChannels();
    const sender = new BobjectRpcSender(new Rpc(local));
    const receiver = new BobjectRpcReceiver(new Rpc(remote));
    const promise = signal();
    receiver.receive("action name", "bobject", async (msg) => {
      expect(deepParse(msg.message)).toEqual(jsComplexArrayObject);
      // Message should be a reverse-wrapped bobject
      expect(isBinary(msg.message)).toBe(false);
      // Header should be a js bobject
      expect(isBinary(msg.message.complexArray())).toBe(true);
      promise.resolve();
    });

    sender.send("action name", { topic, receiveTime, message: mixedBinaryComplexArrayBobject });
    await promise;
  });
});

describe("findBinaryDataLocations", () => {
  it("correctly classifies purely-parsed objects", () => {
    // Purely parsed. Don't iterate past the first level.
    expect(findBinaryDataLocations(parsedBobject)).toEqual({ value: null });
  });
  it("correctly classifies purely-binary objects", () => {
    // Purely binary. Don't iterate past the first level.
    expect(findBinaryDataLocations(binaryBobject)).toEqual({ value: null });
  });
  it("finds binary fields in mixed parsed/binary objects", () => {
    // The top-level object contains binary children, but there are no other mixed nested messages.
    expect(findBinaryDataLocations(mixedBobject)).toEqual({ value: {} });

    const deeperMixedBobject = merge(parsedBobject, {
      header: merge(parsedBobject.header(), { stamp: binaryBobject.header().stamp() }),
    });
    expect(findBinaryDataLocations(deeperMixedBobject)).toEqual({ value: { header: {} } });
  });
});
