// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import buffer from "buffer";

import CachedFilelike, { type FileReader, type FileStream } from "./CachedFilelike";
import delay from "webviz-core/shared/delay";

class InMemoryFileReader implements FileReader {
  _buffer: Buffer;

  constructor(bufferObj: Buffer) {
    this._buffer = bufferObj;
  }

  async open() {
    return { size: this._buffer.byteLength };
  }

  fetch(offset: number, length: number): FileStream {
    return {
      on: (type, callback) => {
        if (type === "data") {
          setTimeout(() => callback(this._buffer.slice(offset, offset + length)));
        }
      },
      destroy() {},
    };
  }
}

describe("CachedFilelike", () => {
  describe("#size", () => {
    it("returns the size from the underlying FileReader", async () => {
      const fileReader = new InMemoryFileReader(buffer.Buffer.from([0, 1, 2, 3]));
      const cachedFileReader = new CachedFilelike({ fileReader, logFn: () => {} });
      await cachedFileReader.open();
      expect(cachedFileReader.size()).toEqual(4);
    });

    it("does not throw when the size is 0", async () => {
      const fileReader = new InMemoryFileReader(buffer.Buffer.from([]));
      const cachedFileReader = new CachedFilelike({ fileReader, logFn: () => {} });
      await cachedFileReader.open();
      expect(cachedFileReader.size()).toEqual(0);
    });
  });

  describe("#read", () => {
    it("returns data from the underlying FileReader", (done) => {
      const fileReader = new InMemoryFileReader(buffer.Buffer.from([0, 1, 2, 3]));
      const cachedFileReader = new CachedFilelike({ fileReader, logFn: () => {} });
      cachedFileReader.read(1, 2, (error, data) => {
        if (!data) {
          throw new Error("Missing `data`");
        }
        expect([...data]).toEqual([1, 2]);
        done();
      });
    });

    it("returns an error in the callback if the FileReader keeps returning errors", (done) => {
      const fileReader = new InMemoryFileReader(buffer.Buffer.from([0, 1, 2, 3]));
      let interval, destroyed;
      jest.spyOn(fileReader, "fetch").mockImplementation(() => {
        return {
          on: (type, callback) => {
            if (type === "error") {
              interval = setInterval(() => callback(new Error("Dummy error")), 20);
            }
          },
          destroy() {
            clearInterval(interval);
            destroyed = true;
          },
        };
      });
      const cachedFileReader = new CachedFilelike({ fileReader, logFn: () => {} });
      cachedFileReader.read(1, 2, (error, _data) => {
        expect(error).not.toEqual(undefined);
        expect(destroyed).toEqual(true);
        done();
      });
    });

    it("keeps reconnecting when keepReconnectingCallback is set", async () => {
      const fileReader = new InMemoryFileReader(buffer.Buffer.from([0, 1, 2, 3]));
      let interval, dataCallback, destroyed;
      let stopSendingErrors = false;
      jest.spyOn(fileReader, "fetch").mockImplementation(() => {
        return {
          on: (type, callback) => {
            if (type === "data") {
              dataCallback = callback;
            }
            if (type === "error") {
              interval = setInterval(() => {
                if (!stopSendingErrors) {
                  return callback(new Error("Dummy error"));
                }
              }, 2);
            }
          },
          destroy() {
            clearInterval(interval);
            destroyed = true;
          },
        };
      });

      const keepReconnectingCallback = jest.fn();
      const cachedFileReader = new CachedFilelike({ fileReader, logFn: () => {}, keepReconnectingCallback });

      const readerPromise = new Promise((resolve, reject) => {
        cachedFileReader.read(1, 2, (error, data) => {
          if (data) {
            resolve(data);
          } else {
            reject(error);
          }
        });
      });

      await delay(10);
      expect(keepReconnectingCallback.mock.calls).toEqual([[true]]);

      stopSendingErrors = true;
      if (!dataCallback) {
        throw new Error("dataCallback not set");
      }
      dataCallback(buffer.Buffer.from([1, 2]));
      const data = await readerPromise;
      expect(keepReconnectingCallback.mock.calls).toEqual([[true], [false]]);
      expect([...data]).toEqual([1, 2]);
      expect(destroyed).toBe(true);
    });

    it("returns an empty buffer when requesting size 0 (does not throw an error)", (done) => {
      const fileReader = new InMemoryFileReader(buffer.Buffer.from([0, 1, 2, 3]));
      const cachedFileReader = new CachedFilelike({ fileReader, logFn: () => {} });
      cachedFileReader.read(1, 0, (error, data) => {
        if (!data) {
          throw new Error("Missing `data`");
        }
        expect([...data]).toEqual([]);
        done();
      });
    });
  });
});
