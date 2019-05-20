// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import buffer from "buffer";

import CachedFilelike, { type FileReader, type FileStream } from "./CachedFilelike";

class InMemoryFileReader implements FileReader {
  _buffer: Buffer;

  constructor(buffer: Buffer) {
    this._buffer = buffer;
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
      cachedFileReader.read(1, 2, (error, data) => {
        expect(error).not.toEqual(undefined);
        expect(destroyed).toEqual(true);
        done();
      });
    });
  });
});
