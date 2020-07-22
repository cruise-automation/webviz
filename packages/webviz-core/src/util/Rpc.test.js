// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Rpc, { type ChannelImpl, createLinkedChannels } from "./Rpc";
import delay from "webviz-core/shared/delay";

describe("Rpc", () => {
  it("only allows setting Rpc once per channel", () => {
    const { local: mainChannel } = createLinkedChannels();
    new Rpc(mainChannel);
    expect(() => new Rpc(mainChannel)).toThrow();
  });

  it("can send and receive", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const local = new Rpc(mainChannel);
    const worker = new Rpc(workerChannel);
    worker.receive("foo", (msg) => {
      return { bar: msg.foo };
    });
    const result = await local.send("foo", { foo: "baz" });
    expect(result).toEqual({ bar: "baz" });
  });

  it("can send and receive with a promise", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const local = new Rpc(mainChannel);
    const worker = new Rpc(workerChannel);
    worker.receive("foo", async (msg) => {
      await delay(10);
      return { bar: msg.foo };
    });
    const result = await local.send("foo", { foo: "baz" });
    expect(result).toEqual({ bar: "baz" });
  });

  it("rejects on send if receive rejects async", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const local = new Rpc(mainChannel);
    const worker = new Rpc(workerChannel);
    worker.receive("foo", async (_msg) => {
      await delay(10);
      throw new Error("boom");
    });
    return local
      .send("foo", { foo: "baz" })
      .then(() => {
        throw new Error("Send should have rejected");
      })
      .catch((err) => {
        expect(err.message).toEqual("boom");
      });
  });

  it("rejects on send if receive rejects sync", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const local = new Rpc(mainChannel);
    const worker = new Rpc(workerChannel);
    worker.receive("foo", (_msg) => {
      throw new Error("boom");
    });
    return local
      .send("foo", { foo: "baz" })
      .then(() => {
        throw new Error("Send should have rejected");
      })
      .catch((err) => {
        expect(err.message).toEqual("boom");
      });
  });

  it("rejects on send if there is no receiver", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const local = new Rpc(mainChannel);
    new Rpc(workerChannel);
    return local
      .send("foo", { foo: "baz" })
      .then(() => {
        throw new Error("Send should have rejected");
      })
      .catch((err) => {
        expect(err.message).toContain("no receiver");
      });
  });

  it("can send and receive transferrables", async () => {
    const expectedTransfer = new ArrayBuffer(1);
    const mainChannel: ChannelImpl = {
      onmessage: null,
      postMessage(data: any, _transfer?: ArrayBuffer[]) {
        const ev = new MessageEvent("message", { data });
        // eslint-disable-next-line no-use-before-define
        if (workerChannel.onmessage) {
          workerChannel.onmessage(ev); // eslint-disable-line no-use-before-define
        }
      },
      terminate: () => {},
    };

    const workerChannel: ChannelImpl = {
      onmessage: null,
      postMessage(data: any, transfer?: ArrayBuffer[]) {
        const ev = new MessageEvent("message", { data });
        expect(transfer).toHaveLength(1);
        // $FlowFixMe - flow doesn't understand the assertion above
        expect(transfer[0]).toBe(expectedTransfer);
        if (mainChannel.onmessage) {
          mainChannel.onmessage(ev);
        }
      },
      terminate: () => {},
    };

    const local = new Rpc(mainChannel);
    const worker = new Rpc(workerChannel);
    worker.receive("foo", async (msg) => {
      await delay(10);
      return {
        bar: msg.foo,
        [Rpc.transferrables]: [expectedTransfer],
      };
    });
    const result = await local.send("foo", { foo: "baz" });
    expect(result).toEqual({ bar: "baz" });
  });

  it("can resolve when receiver returns undefined", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const local = new Rpc(mainChannel);
    const worker = new Rpc(workerChannel);
    worker.receive("foo", () => {});
    expect(await local.send("foo")).toBeUndefined();
  });

  it("can resolve multiple operations", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const local = new Rpc(mainChannel);
    const worker = new Rpc(workerChannel);
    worker.receive("foo", async (count) => {
      await delay(10);
      return count;
    });
    const one = local.send("foo", 1);
    const two = local.send("foo", 2);
    const three = local.send("foo", 3);
    const result = await Promise.all([one, two, three]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("throws when registering a receiver twice", async () => {
    const rpc = new Rpc(createLinkedChannels().local);
    rpc.receive("foo", () => {});
    expect(() => rpc.receive("foo", () => {})).toThrow();
  });

  // Regression test for memory leak.
  it("clears out _pendingCallbacks when done", async () => {
    const { local: mainChannel, remote: workerChannel } = createLinkedChannels();
    const local = new Rpc(mainChannel);
    const worker = new Rpc(workerChannel);
    worker.receive("foo", (msg) => {
      return { bar: msg.foo };
    });
    expect(Object.keys(local._pendingCallbacks).length).toEqual(0); // eslint-disable-line no-underscore-dangle
    const result = await local.send("foo", { foo: "baz" });
    expect(Object.keys(local._pendingCallbacks).length).toEqual(0); // eslint-disable-line no-underscore-dangle
    expect(result).toEqual({ bar: "baz" });
  });
});
