// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import RpcDataProvider from "./RpcDataProvider";
import RpcDataProviderRemote from "./RpcDataProviderRemote";
import MemoryDataProvider from "webviz-core/src/players/MemoryDataProvider";
import { mockExtensionPoint } from "webviz-core/src/players/mockExtensionPoint";
import Rpc, { createLinkedChannels } from "webviz-core/src/util/Rpc";

const data = {
  messages: [
    { topic: "/some_topic", receiveTime: { sec: 100, nsec: 0 }, message: new ArrayBuffer(0) },
    { topic: "/some_topic", receiveTime: { sec: 101, nsec: 0 }, message: new ArrayBuffer(0) },
    { topic: "/some_topic", receiveTime: { sec: 102, nsec: 0 }, message: new ArrayBuffer(0) },
  ],
  topics: [{ name: "/some_topic", datatype: "some_datatype" }],
  datatypes: { some_datatype: [{ name: "data", type: "string" }] },
};

describe("RpcDataProvider", () => {
  it("passes the initialization result through the Rpc channel", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const provider = new RpcDataProvider(new Rpc(mainChannel), { name: "MemoryDataProvider", args: {}, children: [] });
    const memoryDataProvider = new MemoryDataProvider(data);
    new RpcDataProviderRemote(new Rpc(workerChannel), () => memoryDataProvider);

    expect(await provider.initialize(mockExtensionPoint().extensionPoint)).toEqual({
      start: { nsec: 0, sec: 100 },
      end: { nsec: 0, sec: 102 },
      topics: [{ datatype: "some_datatype", name: "/some_topic" }],
      datatypes: { some_datatype: [{ name: "data", type: "string" }] },
    });
  });

  it("passes messages with ArrayBuffers through the Rpc channel", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const provider = new RpcDataProvider(new Rpc(mainChannel), { name: "MemoryDataProvider", args: {}, children: [] });
    const memoryDataProvider = new MemoryDataProvider(data);
    new RpcDataProviderRemote(new Rpc(workerChannel), () => memoryDataProvider);

    await provider.initialize(mockExtensionPoint().extensionPoint);
    const messages = await provider.getMessages({ sec: 100, nsec: 0 }, { sec: 101, nsec: 0 }, ["/some_topic"]);
    expect(messages).toEqual([data.messages[0], data.messages[1]]);
  });

  it("passes calls to extensionPoint.reportMetadataCallback through the Rpc channel", async () => {
    const extensionPoint = {
      progressCallback() {},
      addTopicsCallback() {},
      reportMetadataCallback: jest.fn(),
    };
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const provider = new RpcDataProvider(new Rpc(mainChannel), { name: "MemoryDataProvider", args: {}, children: [] });
    const memoryDataProvider = new MemoryDataProvider(data);
    new RpcDataProviderRemote(new Rpc(workerChannel), () => memoryDataProvider);
    const error = { type: "error", source: "test", errorType: "user", message: "test error" };

    await provider.initialize(extensionPoint);
    if (!memoryDataProvider.extensionPoint) {
      throw new Error("memoryDataProvider.extensionPoint should be set");
    }
    memoryDataProvider.extensionPoint.reportMetadataCallback(error);
    expect(extensionPoint.reportMetadataCallback.mock.calls[0][0]).toEqual(error);
  });
});
