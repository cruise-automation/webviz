// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// this type mirrors the MessageChannel and MessagePort APIs which are available on
// instances of web-workers and shared-workers respectively, as well as avaiable on
// 'global' within them.
export interface Channel {
  postMessage(data: any, transfer?: any[]): void;
  onmessage: null | ((ev: MessageEvent) => mixed);
}

// Flow complains when some variables are declared with the above interface type, but
// not when given this non-interface type...
export type ChannelImpl = {
  postMessage(data: any, transfer?: any[]): void,
  onmessage: null | ((ev: MessageEvent) => mixed),
};

const RESPONSE = "$$RESPONSE";
const ERROR = "$$ERROR";

// helper function to create linked channels for testing
export function createLinkedChannels(): { local: Channel, remote: Channel } {
  const local: ChannelImpl = {
    onmessage: null,

    postMessage(data: any, _transfer?: Array<ArrayBuffer>) {
      const ev = new MessageEvent("message", { data });
      // eslint-disable-next-line no-use-before-define
      if (remote.onmessage) {
        remote.onmessage(ev); // eslint-disable-line no-use-before-define
      }
    },
    terminate: () => {},
  };

  const remote: ChannelImpl = {
    onmessage: null,

    postMessage(data: any, _transfer?: Array<ArrayBuffer>) {
      const ev = new MessageEvent("message", { data });
      if (local.onmessage) {
        local.onmessage(ev);
      }
    },
    terminate: () => {},
  };
  return { local, remote };
}

// This class allows you to hook up bi-directional async calls across web-worker
// boundaries where a single call to or from a worker can 'wait' on the response.
// Errors in receivers are propigated back to the caller as a rejection.
// It also supports returning transferrables over the web-worker postMessage api,
// which was the main shortcomming with the worker-rpc npm module.
// To attach rpc to an instance of a worker in the main thread:
//   const rpc = new Rpc(workerInstace);
// To attach rpc within an a web worker:
//   const rpc = new Rpc(global);
// Check out the tests for more examples.
export default class Rpc {
  static transferrables = "$$TRANSFERRABLES";
  _channel: Channel;
  _messageId: number = 0;
  _pendingCallbacks: { [number]: (any) => void } = {};
  _receivers: Map<string, (any) => any> = new Map();

  constructor(channel: Channel) {
    this._channel = channel;
    if (this._channel.onmessage) {
      throw new Error("channel.onmessage is already set. Can only use one Rpc instance per channel.");
    }
    this._channel.onmessage = this._onChannelMessage;
  }

  _onChannelMessage = (ev: MessageEvent) => {
    const { id, topic, data } = (ev.data: any);
    if (topic === RESPONSE) {
      this._pendingCallbacks[id](ev.data);
      delete this._pendingCallbacks[id];
      return;
    }
    // invoke the receive handler in a promise so if it throws synchronously we can reject
    new Promise((resolve) => {
      const handler = this._receivers.get(topic);
      if (!handler) {
        throw new Error(`no receiver registered for ${topic}`);
      }
      // This works both when `handler` returns a value or a Promise.
      resolve(handler(data));
    })
      .then((result) => {
        if (!result) {
          return this._channel.postMessage({ topic: RESPONSE, id });
        }
        const transferrables = result[Rpc.transferrables];
        delete result[Rpc.transferrables];
        const message = {
          topic: RESPONSE,
          id,
          data: result,
        };
        this._channel.postMessage(message, transferrables);
      })
      .catch((err) => {
        const message = {
          topic: RESPONSE,
          id,
          data: {
            [ERROR]: true,
            name: err.name,
            message: err.message,
            stack: err.stack,
          },
        };
        this._channel.postMessage(message);
      });
  };

  // send a message across the rpc boundary to a receiver on the other side
  // this returns a promise for the receiver's response.  If there is no registered
  // receiver for the given topic, this method throws
  send<TResult>(topic: string, data: any, transfer?: any[]): Promise<TResult> {
    const id = this._messageId++;
    const message = { topic, id, data };
    const result = new Promise((resolve, reject) => {
      this._pendingCallbacks[id] = (info) => {
        if (info.data && info.data[ERROR]) {
          const error = new Error(info.data.message);
          error.name = info.data.name;
          error.stack = info.data.stack;
          reject(error);
        } else {
          resolve(info.data);
        }
      };
    });
    this._channel.postMessage(message, transfer);
    return result;
  }

  // register a receiver for a given message on a topic
  // only one receiver can be registered per topic and currently
  // 'deregistering' a receiver is not supported since this is not common
  receive<T, TOut>(topic: string, handler: (T) => TOut) {
    if (this._receivers.has(topic)) {
      throw new Error(`Receiver already registered for topic: ${topic}`);
    }
    this._receivers.set(topic, handler);
  }
}
