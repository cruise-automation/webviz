// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { complement, intersect, isOverlapping } from "intervals-fn";
import { round } from "lodash";
import type { Callback, Filelike } from "rosbag";

import VirtualLRUBuffer, { type Range } from "./VirtualLRUBuffer";

// CachedFilelike is a `Filelike` that attempts to do as much caching of the file in memory as
// possible. It takes in 3 named arguments to its constructor:
// - fileReader: a `FileReader` instance (defined below). This essentially does the streamed
//     fetching of ranges from our file.
// - cacheSizeInBytes (optional): how many bytes we're allowed to cache. Defaults to infinite
//     caching (meaning that the cache will be as big as the file size). `cacheSizeInBytes` also
//     becomes the largest range of data that can be requested.
// - logFn (optional): a log function. Useful for logging in a particular format. Defaults to
//     `console.log`.
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
  open(): Promise<{| size: number |}>;
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

  // The current active connection, if there is one. `remainingRange.start` gets updated whenever
  // we receive new data, so it truly is the remaining range that it is going to download.
  _currentConnection: ?{| stream: FileStream, remainingRange: Range |};

  // A list of read requests and associated ranges for all read requests, in order.
  _readRequests: {| range: Range, callback: Callback<Buffer>, requestTime: number |}[] = [];

  // The range.end of the last read request that we resolved. Useful for reading ahead a bit.
  _lastResolvedCallbackEnd: ?number;

  // The last time we've encountered an error;
  _lastErrorTime: ?number;

  constructor(options: {| fileReader: FileReader, cacheSizeInBytes?: ?number, logFn?: (string) => void |}) {
    this._fileReader = options.fileReader;
    this._cacheSizeInBytes = options.cacheSizeInBytes || this._cacheSizeInBytes;
    this._logFn = options.logFn || this._logFn;
  }

  async open() {
    if (this._fileSize) {
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
    if (!this._fileSize) {
      throw new Error("CachedFilelike has not been opened");
    }
    return this._fileSize;
  }

  // Read a certain byte range, and get back a `Buffer` in `callback`.
  read(offset: number, length: number, callback: Callback<Buffer>) {
    const range = { start: offset, end: offset + length };
    this._logFn(`Requested ${rangeToString(range)}`);

    if (offset < 0 || range.end > this._fileSize || length <= 0) {
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
      cacheSizeInBytes: this._cacheSizeInBytes,
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
      // If we get two errors in a short timespan (100ms) then there is probably a serious error, so
      // we resolve all remaining callbacks with errors and close out.
      const lastErrorTime = this._lastErrorTime;
      if (lastErrorTime && Date.now() - lastErrorTime < 100) {
        this._logFn(`Connection @ ${rangeToString(range)} threw another error; closing: ${error.toString()}`);

        this._closed = true;
        if (this._currentConnection) {
          this._currentConnection.stream.destroy();
        }
        for (const request of this._readRequests) {
          request.callback(error);
        }
        return;
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

// Get the ranges in `bounds` that are NOT covered by `ranges`.
function missingRanges(bounds: Range, ranges: Range[]) {
  // `complement` works in unexpected ways when `ranges` has a range that exceeds `bounds`,
  // so we first clip `ranges` to `bounds`.
  return complement(bounds, intersect([bounds], ranges));
}

// This function contains the most complicated logic of the CachedFilelike. Based on a number of
// properties it determines if a new connection should be opened or not. It's isolated and exported
// to make it easier to reason about and to test.
export function getNewConnection(options: {|
  currentRemainingRange: ?Range, // The remaining range that the current connection (if any) is going to download.
  readRequestRange: ?Range, // The range of the read request that we're trying to satisfy.
  downloadedRanges: Range[], // Array of ranges that have been downloaded already.
  lastResolvedCallbackEnd: ?number, // The range.end of the last read request that we resolved. Useful for reading ahead a bit.
  cacheSizeInBytes: number, // The cache size. If equal to or larger than `fileSize` we will attempt to download the whole file.
  fileSize: number, // Size of the file.
  continueDownloadingThreshold: number, // Number of bytes we're willing to wait downloading before opening a new connection.
|}): ?Range {
  const { readRequestRange, currentRemainingRange, ...otherOptions } = options;
  if (readRequestRange) {
    return getNewConnectionWithExistingReadRequest({ readRequestRange, currentRemainingRange, ...otherOptions });
  } else if (!currentRemainingRange) {
    return getNewConnectionWithoutExistingConnection(otherOptions);
  }
}

export function getNewConnectionWithExistingReadRequest({
  currentRemainingRange,
  readRequestRange,
  downloadedRanges,
  lastResolvedCallbackEnd,
  cacheSizeInBytes,
  fileSize,
  continueDownloadingThreshold,
}: {|
  currentRemainingRange: ?Range,
  readRequestRange: Range,
  downloadedRanges: Range[],
  lastResolvedCallbackEnd: ?number,
  cacheSizeInBytes: number,
  fileSize: number,
  continueDownloadingThreshold: number,
|}): ?Range {
  // We have a requested range that we're trying to download.
  if (readRequestRange.end - readRequestRange.start > cacheSizeInBytes) {
    // This should have been caught way earlier, but just as a sanity check.
    throw new Error("Range exceeds cache size");
  }

  // Get the parts of the requested range that have not been downloaded yet.
  const notDownloadedRanges = missingRanges(readRequestRange, downloadedRanges);

  if (!notDownloadedRanges[0]) {
    // If there aren't any, then we should have never passed in `readRequestRange`.
    throw new Error("Range for the first read request is fully downloaded, so it should have been deleted");
  }

  // We want to start a new connection if:
  const startNewConnection =
    // 1. There is no current connection.
    !currentRemainingRange ||
    // 2. Or if there is no overlap between the current connection and the requested range.
    !isOverlapping(notDownloadedRanges, [currentRemainingRange]) ||
    // 3. Or if we'll reach the requested range at some point, but that would take too long.
    currentRemainingRange.start + continueDownloadingThreshold < notDownloadedRanges[0].start;

  if (!startNewConnection) {
    return;
  }
  if (cacheSizeInBytes >= fileSize) {
    // If we're trying to download the whole file, read all the way up to the next range that we have already downloaded.
    const range = { start: notDownloadedRanges[0].start, end: fileSize };
    return missingRanges(range, downloadedRanges)[0];
  }

  if (notDownloadedRanges[0].end === readRequestRange.end) {
    // If we're downloading to the end of our range, do some reading ahead while we're at it.
    // Note that we might have already downloaded parts of this range, but we don't know when
    // they get evicted, so for now we just the entire range again.
    // TODO(JP): In the future it might be good to mark the already downloaded bits as "recently
    // accessed" so they don't get evicted, and then not download them again.
    return { ...notDownloadedRanges[0], end: Math.min(readRequestRange.start + cacheSizeInBytes, fileSize) };
  }

  // Otherwise, start reading from the first non-downloaded byte.
  return notDownloadedRanges[0];
}

export function getNewConnectionWithoutExistingConnection({
  downloadedRanges,
  lastResolvedCallbackEnd,
  cacheSizeInBytes,
  fileSize,
}: {
  downloadedRanges: Range[],
  lastResolvedCallbackEnd: ?number,
  cacheSizeInBytes: number,
  fileSize: number,
}): ?Range {
  // If we don't have any read requests, and we also don't have an active connection, then start
  // reading ahead as much data as we can!
  let readAheadRange: ?Range;
  if (cacheSizeInBytes >= fileSize) {
    // If we have an unlimited cache, we want to read the entire file.
    readAheadRange = { start: 0, end: fileSize };
  } else if (lastResolvedCallbackEnd != null) {
    // Otherwise, if we have a limited cache, we want to read the data right after the last
    // read request, because usually read requests are sequential without gaps.
    readAheadRange = {
      start: lastResolvedCallbackEnd,
      end: Math.min(lastResolvedCallbackEnd + cacheSizeInBytes, fileSize),
    };
  }
  if (readAheadRange) {
    // If we have a range that we want to read ahead, then create a new connection for the range
    // within it that has not already been downloaded.
    return missingRanges(readAheadRange, downloadedRanges)[0];
  }
}
