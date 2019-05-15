// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import buffer from "buffer";

import CachedFilelike, { getNewConnection, type FileReader, type FileStream } from "./CachedFilelike";

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

  describe("getNewConnection", () => {
    describe("when using a limited cache", () => {
      const defaults = {
        currentRemainingRange: undefined,
        readRequestRange: undefined,
        downloadedRanges: [],
        lastResolvedCallbackEnd: undefined,
        cacheSizeInBytes: 10,
        fileSize: 100,
        continueDownloadingThreshold: 5,
      };

      describe("when there is a read request", () => {
        it("throws when the range exceeds the cache size", () => {
          expect(() =>
            getNewConnection({
              ...defaults,
              readRequestRange: { start: 40, end: 60 },
            })
          ).toThrow("Range exceeds cache size");
        });

        it("throws when the read request range has been fully downloaded already", () => {
          expect(() =>
            getNewConnection({
              ...defaults,
              readRequestRange: { start: 40, end: 50 },
              downloadedRanges: [{ start: 40, end: 50 }],
            })
          ).toThrow("Range for the first read request is fully downloaded, so it should have been deleted");
        });

        describe("when there is an existing connection", () => {
          it("does not start a new connection when the current connection overlaps the read request range", () => {
            const newConnection = getNewConnection({
              ...defaults,
              currentRemainingRange: { start: 45, end: 55 },
              readRequestRange: { start: 40, end: 50 },
            });
            expect(newConnection).toEqual(undefined);
          });

          it("does not start a new connection when the current connection is close enough to the start of the read request range", () => {
            const newConnection = getNewConnection({
              ...defaults,
              currentRemainingRange: { start: 40, end: 50 },
              readRequestRange: { start: 45 /* 40 + continueDownloadingThreshold */, end: 55 },
            });
            expect(newConnection).toEqual(undefined);
          });

          it("does start a new connection when it would take too long to get to the read request range", () => {
            const newConnection = getNewConnection({
              ...defaults,
              currentRemainingRange: { start: 40, end: 50 },
              readRequestRange: { start: 46, end: 55 },
            });
            expect(newConnection).toEqual({ start: 46, end: 56 /* 46 + cacheSizeInBytes */ });
          });

          it("does not download already downloaded ranges", () => {
            const newConnection = getNewConnection({
              ...defaults,
              readRequestRange: { start: 40, end: 50 },
              downloadedRanges: [{ start: 45, end: 47 }],
            });
            expect(newConnection).toEqual({ start: 40, end: 45 });
          });
        });

        describe("when there is no existing connection", () => {
          it("starts a new connection when there is no existing one", () => {
            const newConnection = getNewConnection({
              ...defaults,
              readRequestRange: { start: 40, end: 45 },
            });
            expect(newConnection).toEqual({ start: 40, end: 50 /* read-ahead */ });
          });

          it("starts a new connection at the first non-downloaded bytes", () => {
            const newConnection = getNewConnection({
              ...defaults,
              readRequestRange: { start: 45, end: 55 },
              downloadedRanges: [{ start: 40, end: 50 }],
            });
            expect(newConnection).toEqual({ start: 50, end: 55 });
          });

          it("reads ahead a bit as long as it does not evict existing downloaded bytes that we requested", () => {
            const newConnection = getNewConnection({
              ...defaults,
              readRequestRange: { start: 48, end: 55 },
              downloadedRanges: [{ start: 40, end: 50 }],
            });
            expect(newConnection).toEqual({ start: 50, end: 58 /* readRequestRange.start + cacheSizeInBytes */ });
          });

          it("does not exceed file size in reading ahead", () => {
            const newConnection = getNewConnection({
              ...defaults,
              readRequestRange: { start: 95, end: 100 },
            });
            expect(newConnection).toEqual({ start: 95, end: 100 });
          });
        });
      });

      describe("when there is no read request", () => {
        it("does not start a new connection", () => {
          const newConnection = getNewConnection(defaults);
          expect(newConnection).toEqual(undefined);
        });

        describe("read-ahead", () => {
          it("starts a new connection based on the end position of the last resolved read request", () => {
            const newConnection = getNewConnection({ ...defaults, lastResolvedCallbackEnd: 15 });
            expect(newConnection).toEqual({ start: 15, end: 25 });
          });

          it("skips over already downloaded bytes", () => {
            const newConnection = getNewConnection({
              ...defaults,
              lastResolvedCallbackEnd: 15,
              downloadedRanges: [{ start: 10, end: 20 }],
            });
            expect(newConnection).toEqual({ start: 20, end: 25 });
          });

          it("creates no new connection when the read-ahead range has been fully downloaded", () => {
            const newConnection = getNewConnection({
              ...defaults,
              lastResolvedCallbackEnd: 15,
              downloadedRanges: [{ start: 10, end: 25 }],
            });
            expect(newConnection).toEqual(undefined);
          });
        });
      });
    });

    describe("when using an unlimited cache", () => {
      const defaults = {
        currentRemainingRange: undefined,
        readRequestRange: undefined,
        downloadedRanges: [],
        lastResolvedCallbackEnd: undefined,
        cacheSizeInBytes: 100, // Same or bigger than `fileSize`.
        fileSize: 100,
        continueDownloadingThreshold: 5,
      };

      describe("when there is a read request", () => {
        it("throws when the read request range has been fully downloaded already", () => {
          expect(() =>
            getNewConnection({
              ...defaults,
              readRequestRange: { start: 40, end: 50 },
              downloadedRanges: [{ start: 40, end: 50 }],
            })
          ).toThrow("Range for the first read request is fully downloaded, so it should have been deleted");
        });

        describe("when there is an existing connection", () => {
          it("does not start a new connection when the current connection overlaps the read request range", () => {
            const newConnection = getNewConnection({
              ...defaults,
              currentRemainingRange: { start: 40, end: 100 },
              readRequestRange: { start: 20, end: 50 },
            });
            expect(newConnection).toEqual(undefined);
          });

          it("does not start a new connection when the current connection is close enough to the start of the read request range", () => {
            const newConnection = getNewConnection({
              ...defaults,
              currentRemainingRange: { start: 40, end: 100 },
              readRequestRange: { start: 45 /* 40 + continueDownloadingThreshold */, end: 55 },
            });
            expect(newConnection).toEqual(undefined);
          });

          it("does start a new connection when it would take too long to get to the read request range", () => {
            const newConnection = getNewConnection({
              ...defaults,
              currentRemainingRange: { start: 40, end: 100 },
              readRequestRange: { start: 46, end: 55 },
            });
            expect(newConnection).toEqual({ start: 46, end: 100 });
          });

          it("does not download already downloaded ranges", () => {
            const newConnection = getNewConnection({
              ...defaults,
              readRequestRange: { start: 20, end: 50 },
              downloadedRanges: [{ start: 30, end: 40 }],
            });
            expect(newConnection).toEqual({ start: 20, end: 30 });
          });
        });

        describe("when there is no existing connection", () => {
          it("starts a new connection when there is no existing one", () => {
            const newConnection = getNewConnection({
              ...defaults,
              readRequestRange: { start: 40, end: 45 },
            });
            expect(newConnection).toEqual({ start: 40, end: 100 });
          });

          it("starts a new connection at the first non-downloaded bytes", () => {
            const newConnection = getNewConnection({
              ...defaults,
              readRequestRange: { start: 45, end: 55 },
              downloadedRanges: [{ start: 40, end: 50 }],
            });
            expect(newConnection).toEqual({ start: 50, end: 100 });
          });
        });
      });

      describe("when there is no read request", () => {
        it("starts downloading the entire file", () => {
          const newConnection = getNewConnection(defaults);
          expect(newConnection).toEqual({ start: 0, end: 100 });
        });

        it("does not download already downloaded ranges", () => {
          const newConnection = getNewConnection({ ...defaults, downloadedRanges: [{ start: 20, end: 30 }] });
          expect(newConnection).toEqual({ start: 0, end: 20 });
        });

        it("keeps downloading linearly from start to end", () => {
          const newConnection = getNewConnection({
            ...defaults,
            downloadedRanges: [{ start: 0, end: 30 }, { start: 50, end: 70 }],
          });
          expect(newConnection).toEqual({ start: 30, end: 50 });
        });
      });
    });
  });
});
