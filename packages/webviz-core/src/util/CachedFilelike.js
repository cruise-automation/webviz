// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { round } from "lodash";
import type { Callback, Filelike } from "rosbag";

import { getNewConnection } from "./getNewConnection";
import { type Range } from "./ranges";
import VirtualLRUBuffer from "./VirtualLRUBuffer";

// CachedFilelike is a `Filelike` that attempts to do as much caching of the file in memory as
// possible. It takes in 3 named arguments to its constructor:
// - fileReader: a `FileReader` instance (defined below). This essentially does the streamed
//     fetching of ranges from our file.
// - cacheSizeInBytes (optional): how many bytes we're allowed to cache. Defaults to infinite
//     caching (meaning that the cache will be as big as the file size). `cacheSizeInBytes` also
//     becomes the largest range of data that can be requested.
// - logFn (optional): a log function. Useful for logging in a particular format. Defaults to
//     `console.log`.
// - keepReconnectingCallback (optional): if set, we assume that we want to keep retrying on connection
//     error, in which case the callback gets called with an update on whether we are currently
//     reconnecting. This is useful when the connection is expected to be spotty, e.g. when
//     running this code in a browser instead of on a server. If omitted, we will retry for a short
//     amount of time and then reject read requests.
//
// Under the hood this uses a `VirtualLRUBuffer`, which represents the entire file in memory, even
// though only parts of it may actually be stored in memory. It also manages evicting least recently
// used blocks from memory.
//
// We keep a list of byte ranges that have been requested, and their associated callbacks. Typically
// there will be only one such requested range at the time, as usually we need to parse some data
// first before we can read more. We keep one stream from the `fileReader` open at a time, and we
// serve the requested byte ranges in order.
//
// If there are currently no requested byte ranges, we try to intelligently load as much data as
// possible into memory, with a preference given to ranges immediately following the last requested
// byte range. If the cache spans the entire file size, we try to download the entire file.

export type FileStream = {
  on: (string, any) => void, // We only use "data" and "error".
  destroy: () => void,
};
export interface FileReader {
  open(): Promise<{ size: number }>;
  fetch(offset: number, length: number): FileStream;
  +recordBytesPerSecond?: (number) => void; // For logging / metrics.
}

const LOGGING_INTERVAL_IN_BYTES = 1024 * 1024 * 10; // Log every 10MiB to avoid cluttering the logs too much.
const CACHE_BLOCK_SIZE = 1024 * 1024 * 10; // 10MiB blocks.
// Don't start a new connection if we're 5MiB away from downloading the requested byte.
// TODO(JP): It would be better (but a bit more involved) to express this in seconds, and take into
// account actual download speed.
const CLOSE_ENOUGH_BYTES_TO_NOT_START_NEW_CONNECTION = 1024 * 1024 * 5;

export default class CachedFilelike implements Filelike {
  _fileReader: FileReader;
  _cacheSizeInBytes: number = Infinity;
  _fileSize: number;
  _virtualBuffer: VirtualLRUBuffer;
  _logFn: (string) => void = (msg) => console.log(msg);
  _closed: boolean = false;
  _keepReconnectingCallback: ?(reconnecting: boolean) => void;

  // The current active connection, if there is one. `remainingRange.start` gets updated whenever
  // we receive new data, so it truly is the remaining range that it is going to download.
  _currentConnection: ?{| stream: FileStream, remainingRange: Range |};

  // A list of read requests and associated ranges for all read requests, in order.
  _readRequests: {| range: Range, callback: Callback<Buffer>, requestTime: number |}[] = [];

  // The range.end of the last read request that we resolved. Useful for reading ahead a bit.
  _lastResolvedCallbackEnd: ?number;

  // The last time we've encountered an error;
  _lastErrorTime: ?number;

  constructor(options: {|
    fileReader: FileReader,
    cacheSizeInBytes?: ?number,
    logFn?: (string) => void,
    keepReconnectingCallback?: (reconnecting: boolean) => void,
  |}) {
    this._fileReader = options.fileReader;
    this._cacheSizeInBytes = options.cacheSizeInBytes || this._cacheSizeInBytes;
    this._logFn = options.logFn || this._logFn;
    this._keepReconnectingCallback = options.keepReconnectingCallback;
  }

  async open() {
    if (this._fileSize != null) {
      return;
    }
    const { size } = await this._fileReader.open();
    this._fileSize = size;
    if (this._cacheSizeInBytes >= size) {
      // If we have a cache limit that exceeds the file size, then we don't need to limit ourselves
      // to small blocks. This way `VirtualLRUBuffer#slice` will be faster since we'll almost always
      // not need to copy from multiple blocks into a new `Buffer` instance.
      this._virtualBuffer = new VirtualLRUBuffer({ size });
    } else {
      this._virtualBuffer = new VirtualLRUBuffer({
        size,
        blockSize: CACHE_BLOCK_SIZE,
        // Rather create too many blocks than too few (Math.ceil), and always add one block,
        // to allow for a read range not starting or ending perfectly at a block boundary.
        numberOfBlocks: Math.ceil(this._cacheSizeInBytes / CACHE_BLOCK_SIZE) + 2,
      });
    }
    this._logFn(`Opening file with size ${bytesToMiB(this._fileSize)}MiB`);
  }

  // Get the file size. Requires a call to `open()` or `read()` first.
  size() {
    if (this._fileSize == null) {
      throw new Error("CachedFilelike has not been opened");
    }
    return this._fileSize;
  }

  // Read a certain byte range, and get back a `Buffer` in `callback`.
  read(offset: number, length: number, callback: Callback<Buffer>) {
    if (length === 0) {
      callback(null, Buffer.allocUnsafe(0));
      return;
    }

    const range = { start: offset, end: offset + length };
    this._logFn(`Requested ${rangeToString(range)}`);

    if (offset < 0 || range.end > this._fileSize || length < 0) {
      throw new Error("CachedFilelike#read invalid input");
    }
    if (length > this._cacheSizeInBytes) {
      throw new Error(`Requested more data than cache size: ${length} > ${this._cacheSizeInBytes}`);
    }

    this.open().then(() => {
      this._readRequests.push({ range, callback, requestTime: Date.now() });
      this._updateState();
    });
  }

  // Gets called any time our connection or read requests change.
  _updateState() {
    if (this._closed) {
      return;
    }

    // First, see if there are any read requests that we can resolve now.
    this._readRequests = this._readRequests.filter(({ range, callback, requestTime }) => {
      if (!this._virtualBuffer.hasData(range.start, range.end)) {
        return true;
      }

      this._logFn(`Returned ${bytesToMiB(range.start)}-${bytesToMiB(range.end)}MiB in ${Date.now() - requestTime}ms`);
      this._lastResolvedCallbackEnd = range.end;
      const buffer = this._virtualBuffer.slice(range.start, range.end);

      // You can set READ_DELAY=<number> on the command line when testing locally to simulate a slow connection.
      let delay = 0;
      if (process.env.READ_DELAY && process.env.NODE_ENV !== "production") {
        delay = parseInt(process.env.READ_DELAY) || 1000;
      }
      setTimeout(() => callback(null, buffer), delay);

      return false;
    });

    // Then see if we need to set a new connection based on the new connection and read requests state.
    const newConnection = getNewConnection({
      currentRemainingRange: this._currentConnection ? this._currentConnection.remainingRange : undefined,
      readRequestRange: this._readRequests[0] ? this._readRequests[0].range : undefined,
      downloadedRanges: this._virtualBuffer.getRangesWithData(),
      lastResolvedCallbackEnd: this._lastResolvedCallbackEnd,
      cacheSize: this._cacheSizeInBytes,
      fileSize: this._fileSize,
      continueDownloadingThreshold: CLOSE_ENOUGH_BYTES_TO_NOT_START_NEW_CONNECTION,
    });
    if (newConnection) {
      this._setConnection(newConnection);
    }
  }

  // Replace the current connection with a new one, spanning a certain range.
  _setConnection(range: Range) {
    this._logFn(`Setting new connection @ ${rangeToString(range)}`);

    if (this._currentConnection) {
      // Destroy the current connection if there is one.
      const currentConnection = this._currentConnection;
      currentConnection.stream.destroy();
      this._logFn(`Destroyed current connection @ ${rangeToString(currentConnection.remainingRange)}`);
    }

    // Start the stream, and update the current connection state.
    const stream = this._fileReader.fetch(range.start, range.end);
    this._currentConnection = { stream, remainingRange: range };

    stream.on("error", (error: Error) => {
      const currentConnection = this._currentConnection;
      if (!currentConnection || stream !== currentConnection.stream) {
        return; // Ignore errors from old streams.
      }

      if (this._keepReconnectingCallback) {
        // If this callback is set, just keep retrying.
        if (!this._lastErrorTime) {
          // And if this is the first error, let the callback know.
          this._keepReconnectingCallback(true);
        }
      } else {
        // Otherwise, if we get two errors in a short timespan (100ms) then there is probably a
        // serious error, we resolve all remaining callbacks with errors and close out.
        const lastErrorTime = this._lastErrorTime;
        if (lastErrorTime && Date.now() - lastErrorTime < 100) {
          this._logFn(`Connection @ ${rangeToString(range)} threw another error; closing: ${error.toString()}`);

          this._closed = true;
          currentConnection.stream.destroy();
          for (const request of this._readRequests) {
            request.callback(error);
          }
          return;
        }
      }

      // When we encounter an error there is usually a bad connection or timeout or so, so just
      // mark the current connection as destroyed, and try again.
      this._logFn(`Connection @ ${rangeToString(range)} threw error; trying to continue: ${error.toString()}`);
      this._lastErrorTime = Date.now();
      delete this._currentConnection;
      this._updateState();
    });

    // Handle the data stream.
    const startTime = Date.now();
    let bytesRead = 0;
    let lastReportedBytesRead = 0;
    stream.on("data", (chunk: Buffer) => {
      const currentConnection = this._currentConnection;
      if (!currentConnection || stream !== currentConnection.stream) {
        return; // Ignore data from old streams.
      }

      if (this._lastErrorTime) {
        // If we had an error before, then that has clearly been resolved since we received some data.
        this._lastErrorTime = undefined;
        if (this._keepReconnectingCallback) {
          // And if we had a callback, let it know that the issue has been resolved.
          this._keepReconnectingCallback(false);
        }
      }

      // Copy the data into the VirtualLRUBuffer.
      this._virtualBuffer.copyFrom(chunk, currentConnection.remainingRange.start);
      bytesRead += chunk.byteLength;

      // Every now and then, do some logging of the current download speed.
      if (bytesRead - lastReportedBytesRead > LOGGING_INTERVAL_IN_BYTES) {
        lastReportedBytesRead = bytesRead;
        const sec = (Date.now() - startTime) / 1000;
        if (this._fileReader.recordBytesPerSecond) {
          this._fileReader.recordBytesPerSecond(bytesRead / sec);
        }

        const mibibytes = bytesToMiB(bytesRead);
        const speed = round(mibibytes / sec, 2);
        this._logFn(`Connection @ ${rangeToString(currentConnection.remainingRange)} downloading at ${speed} MiB/s`);
      }

      if (this._virtualBuffer.hasData(range.start, range.end)) {
        // If the requested range has been downloaded, we're done!
        this._logFn(`Connection @ ${rangeToString(currentConnection.remainingRange)} finished!`);
        stream.destroy();
        delete this._currentConnection;
      } else {
        // Otherwise, update `remainingRange`.
        this._currentConnection = { stream, remainingRange: { start: range.start + bytesRead, end: range.end } };
      }

      // Always call `_updateState` so it can decide to create new connections, resolve callbacks, etc.
      this._updateState();
    });
  }
}

// Some formatting functions.
function bytesToMiB(bytes: number) {
  return round(bytes / 1024 / 1024, 3);
}
function rangeToString(range: Range) {
  return `${bytesToMiB(range.start)}-${bytesToMiB(range.end)}MiB`;
}
