// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { simplify } from "intervals-fn";
import { isEqual, sum, uniq } from "lodash";
import { TimeUtil, type Time } from "rosbag";
import uuid from "uuid";

import type {
  DataProvider,
  DataProviderDescriptor,
  ExtensionPoint,
  GetDataProvider,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
} from "webviz-core/src/dataProviders/types";
import filterMap from "webviz-core/src/filterMap";
import type { BobjectMessage } from "webviz-core/src/players/types";
import { inaccurateByteSize } from "webviz-core/src/util/binaryObjects";
import { getNewConnection } from "webviz-core/src/util/getNewConnection";
import { type Range, mergeNewRangeIntoUnsortedNonOverlappingList, missingRanges } from "webviz-core/src/util/ranges";
import sendNotification from "webviz-core/src/util/sendNotification";
import { fromNanoSec, subtractTimes, toNanoSec } from "webviz-core/src/util/time";

// I (JP) mostly just made these numbers up. It might be worth experimenting with different values
// for these, but it seems to work reasonably well in my tests.
export const MIN_MEM_CACHE_BLOCK_SIZE_NS = 0.1e9; // Messages are laid out in blocks with a fixed number of milliseconds.
// Preloading algorithms get too slow when there are too many blocks. For very long bags, use longer
// blocks. Adaptive block sizing is simpler than using a tree structure for immutable updates but
// less flexible, so we may want to move away from a single-level block structure in the future.
export const MAX_BLOCKS = 400;
const READ_AHEAD_NS = 3e9; // Number of nanoseconds to read ahead from the last `getMessages` call.
const DEFAULT_CACHE_SIZE_BYTES = 2.5e9; // Number of bytes that we aim to keep in the cache.
export const MAX_BLOCK_SIZE_BYTES = 50e6; // Number of bytes in a block before we show an error.

// For each memory block we store the actual messages (grouped by topic), and a total byte size of
// the underlying ArrayBuffers.
export type MemoryCacheBlock = $ReadOnly<{|
  messagesByTopic: $ReadOnly<{ [topic: string]: $ReadOnlyArray<BobjectMessage> }>,
  sizeInBytes: number,
|}>;

export type BlockCache = {|
  blocks: $ReadOnlyArray<?MemoryCacheBlock>,
  startTime: Time,
|};

const EMPTY_BLOCK: MemoryCacheBlock = { messagesByTopic: {}, sizeInBytes: 0 };

function getNormalizedTopics(topics: $ReadOnlyArray<string>): string[] {
  return uniq(topics).sort();
}

// Get the blocks to keep for the current cache purge, given the most recently accessed ranges, the
// blocks byte sizes, the minimum number of blocks to always keep, and the maximum cache size.
//
// Exported for tests.
export function getBlocksToKeep({
  recentBlockRanges,
  blockSizesInBytes,
  maxCacheSizeInBytes,
  badEvictionRange,
}: {|
  // The most recently requested block ranges, ordered from most recent to least recent.
  recentBlockRanges: Range[],
  // For each block, its size, if it exists. Note that it's allowed for a `recentBlockRange` to
  // not have all blocks actually available (i.e. a seek happened before the whole range was
  // downloaded).
  blockSizesInBytes: (?number)[],
  // The maximum cache size in bytes.
  maxCacheSizeInBytes: number,
  // A block index to avoid evicting blocks from near.
  badEvictionRange: ?Range,
|}): { blockIndexesToKeep: Set<number>, newRecentRanges: Range[] } {
  let cacheSizeInBytes = 0;
  const blockIndexesToKeep = new Set<number>();

  // Always keep the badEvictionRange
  if (badEvictionRange) {
    for (let blockIndex = badEvictionRange.start; blockIndex < badEvictionRange.end; ++blockIndex) {
      const sizeInBytes = blockSizesInBytes[blockIndex];
      if (sizeInBytes != null && !blockIndexesToKeep.has(blockIndex)) {
        blockIndexesToKeep.add(blockIndex);
        cacheSizeInBytes += sizeInBytes;
      }
    }
  }

  // Go through all the ranges, from most to least recent.
  for (let blockRangeIndex = 0; blockRangeIndex < recentBlockRanges.length; blockRangeIndex++) {
    const blockRange = recentBlockRanges[blockRangeIndex];

    // Work through blocks from highest priority to lowest. Break and discard low-priority blocks if
    // we exceed our memory budget.
    const { startIndex, endIndex, increment } = getBlocksToKeepDirection(blockRange, badEvictionRange?.start);
    for (let blockIndex = startIndex; blockIndex !== endIndex; blockIndex += increment) {
      // If we don't have size, there are no blocks to keep!
      const sizeInBytes = blockSizesInBytes[blockIndex];
      if (sizeInBytes === undefined) {
        continue;
      }

      // Then always add the block. But only add to `cacheSizeInBytes` if we didn't already count it.
      if (!blockIndexesToKeep.has(blockIndex)) {
        blockIndexesToKeep.add(blockIndex);
        cacheSizeInBytes += sizeInBytes;
      }

      // Terminate if we have exceeded `maxCacheSizeInBytes`.
      if (cacheSizeInBytes > maxCacheSizeInBytes) {
        const newRecentRangesExcludingBadEvictionRange = [
          ...recentBlockRanges.slice(0, blockRangeIndex),
          increment > 0 ? { start: 0, end: blockIndex + 1 } : { start: blockIndex, end: blockRange.end },
        ];
        const newRecentRanges =
          badEvictionRange == null
            ? newRecentRangesExcludingBadEvictionRange
            : mergeNewRangeIntoUnsortedNonOverlappingList(badEvictionRange, newRecentRangesExcludingBadEvictionRange);
        return {
          blockIndexesToKeep,
          // Adjust the oldest `newRecentRanges`.
          newRecentRanges,
        };
      }
    }
  }
  return { blockIndexesToKeep, newRecentRanges: recentBlockRanges };
}

// Helper to identify which end of a block range is most appropriate to evict when there is an open
// read request.
// Note: This function would work slightly better if it took a `badEvictionRange` instead of a
// `badEvictionLocation`, but it's more complex and only manifests in quite uncommon use-cases.
function getBlocksToKeepDirection(
  blockRange: Range,
  badEvictionLocation: ?number
): { startIndex: number, endIndex: number, increment: number } {
  if (
    badEvictionLocation != null &&
    Math.abs(badEvictionLocation - blockRange.start) < Math.abs(badEvictionLocation - blockRange.end)
  ) {
    // Read request is closer to the start of the block than the end. Keep blocks from the start
    // with highest priority.
    return { startIndex: blockRange.start, endIndex: blockRange.end, increment: 1 };
  }
  // In most cases, keep blocks from the end with highest priority.
  return { startIndex: blockRange.end - 1, endIndex: blockRange.start - 1, increment: -1 };
}

// Get the best place to start prefetching a block, given the uncached ranges and the cursor position.
// In order of preference, we would like to prefetch:
// - The leftmost uncached block to the right of the cursor, or
// - The leftmost uncached block to the left of the cursor, if one does not exist to the right.
//
// Exported for tests.
export function getPrefetchStartPoint(uncachedRanges: Range[], cursorPosition: number): number {
  uncachedRanges.sort((a, b) => {
    if (a.start < cursorPosition !== b.start < cursorPosition) {
      // On different sides of the cursor. `a` comes first if it's to the right.
      return a.start < cursorPosition ? 1 : -1;
    }
    return a.start - b.start;
  });
  return uncachedRanges[0].start;
}

// This fills up the memory with messages from an underlying DataProvider. The messages have to be
// unparsed ROS messages. The messages are evicted from this in-memory cache based on some constants
// defined at the top of this file.
export default class MemoryCacheDataProvider implements DataProvider {
  _id: string;
  _provider: DataProvider;
  _extensionPoint: ExtensionPoint;

  // The actual blocks that contain the messages. Blocks have a set "width" in terms of nanoseconds
  // since the start time of the bag. If a block has some messages for a topic, then by definition
  // it has *all* messages for that topic and timespan.
  _blocks: $ReadOnlyArray<?MemoryCacheBlock>;

  // The start time of the bag. Used for computing from and to nanoseconds since the start.
  _startTime: Time;

  // The topics that we were most recently asked to load.
  // This is always set by the last `getMessages` call.
  _preloadTopics: string[] = [];

  // Total length of the data in nanoseconds. Used to compute progress with.
  _totalNs: number;

  // The current "connection", which represents the range that we're downloading.
  _currentConnection: ?{| id: string, topics: string[], remainingBlockRange: Range |};

  // The read requests we've received via `getMessages`.
  _readRequests: {|
    timeRange: Range, // Actual range of messages, in nanoseconds since `this._startTime`.
    blockRange: Range, // The range of blocks.
    topics: string[],
    resolve: (GetMessagesResult) => void,
  |}[] = [];

  // Recently requested ranges of blocks, sorted by most recent to least recent. There should never
  // be any overlapping ranges. Ranges *are* allowed to cover blocks that haven't been downloaded
  // (yet).
  _recentBlockRanges: Range[] = [];

  // The end time of the last callback that we've resolved. This is useful for preloading new data
  // around this time.
  _lastResolvedCallbackEnd: ?number;

  // When we log a "block too large" error, we only want to do that once, to prevent
  // spamming errors.
  _loggedTooLargeError: boolean = false;

  // If we're configured to use an unlimited cache, we try to just load as much as possible and
  // never evict anything.
  _cacheSizeBytes: number;

  _readAheadBlocks: number;
  _memCacheBlockSizeNs: number;

  constructor(
    { id, unlimitedCache }: {| id: string, unlimitedCache?: boolean |},
    children: DataProviderDescriptor[],
    getDataProvider: GetDataProvider
  ) {
    this._id = id;
    this._cacheSizeBytes = unlimitedCache ? Infinity : DEFAULT_CACHE_SIZE_BYTES;
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to MemoryCacheDataProvider: ${children.length}`);
    }
    this._provider = getDataProvider(children[0]);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this._extensionPoint = extensionPoint;

    const result = await this._provider.initialize({ ...extensionPoint, progressCallback: () => {} });
    this._startTime = result.start;
    this._totalNs = toNanoSec(subtractTimes(result.end, result.start)) + 1; // +1 since times are inclusive.
    this._memCacheBlockSizeNs = Math.ceil(Math.max(MIN_MEM_CACHE_BLOCK_SIZE_NS, this._totalNs / MAX_BLOCKS));
    this._readAheadBlocks = Math.ceil(READ_AHEAD_NS / this._memCacheBlockSizeNs);
    if (this._totalNs > Number.MAX_SAFE_INTEGER * 0.9) {
      throw new Error("Time range is too long to be supported");
    }
    this._blocks = new Array(Math.ceil(this._totalNs / this._memCacheBlockSizeNs));
    this._updateProgress();

    return result;
  }

  async getMessages(startTime: Time, endTime: Time, subscriptions: GetMessagesTopics): Promise<GetMessagesResult> {
    // We might have a new set of topics.
    const topics = getNormalizedTopics(subscriptions.bobjects || []);
    this._preloadTopics = topics;

    // Push a new entry to `this._readRequests`, and call `this._updateState()`.
    const timeRange = {
      start: toNanoSec(subtractTimes(startTime, this._startTime)),
      end: toNanoSec(subtractTimes(endTime, this._startTime)) + 1, // `Range` defines `end` as exclusive.
    };
    const blockRange = {
      start: Math.floor(timeRange.start / this._memCacheBlockSizeNs),
      end: Math.floor((timeRange.end - 1) / this._memCacheBlockSizeNs) + 1, // `Range` defines `end` as exclusive.
    };
    return new Promise((resolve) => {
      this._readRequests.push({ timeRange, blockRange, topics, resolve });
      this._updateState();
    });
  }

  close(): Promise<void> {
    delete this._currentConnection; // Make sure that the current "connection" loop stops executing.
    return this._provider.close();
  }

  // We're primarily interested in the topics for the first outstanding read request, and after that
  // we're interested in preloading topics (based on the *last* read request).
  _getCurrentTopics(): string[] {
    if (this._readRequests[0]) {
      return this._readRequests[0].topics;
    }
    return this._preloadTopics;
  }

  _resolveFinishedReadRequests() {
    this._readRequests = this._readRequests.filter(({ timeRange, blockRange, topics, resolve }) => {
      if (topics.length === 0) {
        resolve({ bobjects: [], parsedMessages: undefined, rosBinaryMessages: undefined });
        return false;
      }

      // If any of the requested blocks are not fully downloaded yet, bail out.
      for (let blockIndex = blockRange.start; blockIndex < blockRange.end; blockIndex++) {
        const block = this._blocks[blockIndex];
        if (!block) {
          return true;
        }
        for (const topic of topics) {
          if (!block.messagesByTopic[topic]) {
            return true;
          }
        }
      }

      // Now that we know we have the blocks and messages, read them, and filter out just the
      // messages for the requested time range and topics.
      const messages = [];
      for (let blockIndex = blockRange.start; blockIndex < blockRange.end; blockIndex++) {
        const block = this._blocks[blockIndex];
        if (!block) {
          throw new Error("Block should have been available, but it was not");
        }
        for (const topic of topics) {
          const messagesFromBlock = block.messagesByTopic[topic];
          if (!messagesFromBlock) {
            throw new Error("Block messages should have been available, but they were not");
          }
          for (const message of messagesFromBlock) {
            const messageTime = toNanoSec(subtractTimes(message.receiveTime, this._startTime));
            if (timeRange.start /* inclusive */ <= messageTime && messageTime < timeRange.end /* exclusive */) {
              messages.push(message);
            }
          }
        }
      }
      resolve({
        bobjects: messages.sort((a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime)),
        parsedMessages: undefined,
        rosBinaryMessages: undefined,
      });
      this._lastResolvedCallbackEnd = blockRange.end;

      return false;
    });
  }

  // Gets called any time our "connection", read requests, or topics change.
  _updateState() {
    // First, see if there are any read requests that we can resolve now.
    this._resolveFinishedReadRequests();

    if (this._currentConnection && !isEqual(this._currentConnection.topics, this._getCurrentTopics())) {
      // If we have a different set of topics, stop the current "connection", and refresh everything.
      delete this._currentConnection;
    }

    // Then see if we need to set a new connection based on the new connection and read requests state.
    this._maybeRunNewConnections();
  }

  _getNewConnection() {
    const connectionForReadRange = getNewConnection({
      currentRemainingRange: this._currentConnection ? this._currentConnection.remainingBlockRange : undefined,
      readRequestRange: this._readRequests[0] ? this._readRequests[0].blockRange : undefined,
      downloadedRanges: this._getDownloadedBlockRanges(),
      lastResolvedCallbackEnd: this._lastResolvedCallbackEnd,
      cacheSize: this._readAheadBlocks,
      fileSize: this._blocks.length,
      continueDownloadingThreshold: 10, // Somewhat arbitrary number to not create new connections all the time.
    });
    if (connectionForReadRange) {
      return connectionForReadRange;
    }
    const cacheBytesUsed = sum(filterMap(this._blocks, (block) => block && block.sizeInBytes));
    if (!this._currentConnection && cacheBytesUsed < this._cacheSizeBytes) {
      // All read requests have been served, but we have free cache space available. Cache something
      // useful if possible.
      return this._getPrefetchRange();
    }
    // Either a good connection is already in progress, or we've served all connections and have
    // nothing useful to prefetch.
  }

  _getPrefetchRange() {
    const bounds = { start: 0, end: this._blocks.length };
    const uncachedRanges = missingRanges(bounds, this._getDownloadedBlockRanges());
    if (!uncachedRanges.length) {
      return; // We have loaded the whole file.
    }

    const prefetchStart = getPrefetchStartPoint(uncachedRanges, this._lastResolvedCallbackEnd || 0);
    // Just request a single block. We know there's at least one there, and we don't want to cause
    // blocks that are actually useful to be evicted because of our prefetching. We could consider
    // a "low priority" connection that aborts as soon as there's memory pressure.
    return { start: prefetchStart, end: prefetchStart + 1 };
  }

  async _maybeRunNewConnections() {
    while (true) {
      const newConnection = this._getNewConnection();
      if (!newConnection) {
        // All read requests done and nothing to prefetch, or there is a good connection already in
        // progress.
        break;
      }
      const connectionSuccess = await this._setConnection(newConnection).catch((err) => {
        sendNotification(
          `MemoryCacheDataProvider connection ${this._currentConnection ? this._currentConnection.id : ""}`,
          err ? err.message : "<unknown error>",
          "app",
          "error"
        );
      });
      if (!connectionSuccess) {
        // Connection interrupted, or otherwise unsuccessful.
        break;
      }
      // See if there are any more read requests we should field.
    }
  }

  // Replace the current connection with a new one, spanning a certain range of blocks. Return whether we
  // completed successfully, or whether we were interrupted by another connection.
  async _setConnection(blockRange: Range): Promise<boolean> {
    if (!this._getCurrentTopics().length) {
      delete this._currentConnection;
      return true;
    }

    const id = uuid.v4();
    this._currentConnection = { id, topics: this._getCurrentTopics(), remainingBlockRange: blockRange };

    // Merge the new `blockRange` into `_recentBlockRanges`, which upholds the invariant that
    // these ranges are never overlapping.
    this._recentBlockRanges = mergeNewRangeIntoUnsortedNonOverlappingList(blockRange, this._recentBlockRanges);

    const isCurrent = () => {
      return this._currentConnection && this._currentConnection.id === id;
    };

    // Just loop infinitely, but break if the connection is not current any more.
    while (true) {
      const currentConnection = this._currentConnection;
      if (!currentConnection || !isCurrent()) {
        return false;
      }

      const currentBlockIndex = currentConnection.remainingBlockRange.start;
      // Only request topics that we don't already have.
      const topics = this._blocks[currentBlockIndex]
        ? currentConnection.topics.filter(
            (topic) => !this._blocks[currentBlockIndex] || !this._blocks[currentBlockIndex].messagesByTopic[topic]
          )
        : currentConnection.topics;

      // Get messages from the underlying provider.
      const startTime = TimeUtil.add(this._startTime, fromNanoSec(currentBlockIndex * this._memCacheBlockSizeNs));
      const endTime = TimeUtil.add(
        this._startTime,
        fromNanoSec(Math.min(this._totalNs, (currentBlockIndex + 1) * this._memCacheBlockSizeNs) - 1) // endTime is inclusive.
      );
      const messages = topics.length
        ? await this._provider.getMessages(startTime, endTime, { bobjects: topics })
        : { rosBinaryMessages: undefined, bobjects: [], parsedMessages: undefined };
      const { bobjects, rosBinaryMessages, parsedMessages } = messages;
      if (rosBinaryMessages != null || parsedMessages != null) {
        const types = Object.keys(messages)
          .filter((type) => messages[type] != null)
          .join("\n");
        sendNotification("MemoryCacheDataProvider got bad message types", types, "app", "error");
        // Do not retry.
        return false;
      }

      // If we're not current any more, discard the messages, because otherwise we might write duplicate messages.
      if (!isCurrent()) {
        return false;
      }

      const existingBlock = this._blocks[currentBlockIndex] || EMPTY_BLOCK;
      const messagesByTopic = { ...existingBlock.messagesByTopic };
      let sizeInBytes = existingBlock.sizeInBytes;
      // Fill up the block with messages.
      for (const topic of topics) {
        messagesByTopic[topic] = [];
      }
      for (const bobjectMessage of bobjects || []) {
        messagesByTopic[bobjectMessage.topic].push(bobjectMessage);
        const { message } = bobjectMessage;
        sizeInBytes += message instanceof ArrayBuffer ? message.byteLength : inaccurateByteSize(message);
      }

      if (sizeInBytes > MAX_BLOCK_SIZE_BYTES && !this._loggedTooLargeError) {
        this._loggedTooLargeError = true;
        const sizes = [];
        for (const topic of Object.keys(messagesByTopic)) {
          let size = 0;
          for (const bobjectMessage of messagesByTopic[topic]) {
            const { message } = bobjectMessage;
            size += message instanceof ArrayBuffer ? message.byteLength : inaccurateByteSize(message);
          }
          const roundedSize = Math.round(size / 1e6);
          if (roundedSize > 0) {
            sizes.push(`- ${topic}: ${roundedSize}MB`);
          }
        }
        sendNotification(
          "Very large block found",
          `A very large block (${Math.round(this._memCacheBlockSizeNs / 1e6)}ms) was found: ${Math.round(
            sizeInBytes / 1e6
          )}MB. Too much data can cause performance problems and even crashes. Please fix this where the data is being generated.\n\nBreakdown of large topics:\n${sizes
            .sort()
            .join("\n")}`,
          "user",
          "warn"
        );
      }
      this._blocks = this._blocks
        .slice(0, currentBlockIndex)
        .concat([{ messagesByTopic, sizeInBytes }], this._blocks.slice(currentBlockIndex + 1));

      // Now `this._recentBlockRanges` and `this._blocks` have been updated, so we can resolve
      // requests, purge the cache and report progress.
      this._resolveFinishedReadRequests();
      this._purgeOldBlocks();
      this._updateProgress();

      // Check *again* if we're not current any more, because now we're going to update connection
      // information.
      if (!isCurrent()) {
        return false;
      }

      if (currentBlockIndex >= blockRange.end - 1) {
        // If we're at the end of the range, we're done.
        break;
      }
      // Otherwise, update the `remainingBlockRange`.
      this._currentConnection = {
        ...this._currentConnection,
        remainingBlockRange: { start: currentBlockIndex + 1, end: blockRange.end },
      };
    }
    // Connection successfully completed.
    delete this._currentConnection;
    return true;
  }

  // For the relevant downloaded ranges, we look at `this._blocks` and the most relevant topics.
  _getDownloadedBlockRanges(): Range[] {
    const topics: string[] = this._getCurrentTopics();
    return simplify(
      filterMap(this._blocks, (block, blockIndex) => {
        if (!block) {
          return;
        }
        for (const topic of topics) {
          if (!block.messagesByTopic[topic]) {
            return;
          }
        }
        return { start: blockIndex, end: blockIndex + 1 };
      })
    );
  }

  _purgeOldBlocks() {
    if (this._cacheSizeBytes === Infinity) {
      return;
    }

    // If we have open read requests, we really don't want to evict blocks in the first one because
    // we're actively trying to fill it.
    // If we don't have open read requests, don't evict blocks in the read-ahead range (ahead of the
    // playback cursor) because we'll automatically try to refetch that data immediately after.
    let badEvictionRange = this._readRequests[0]?.blockRange;
    if (!badEvictionRange && this._lastResolvedCallbackEnd != null) {
      badEvictionRange = {
        start: this._lastResolvedCallbackEnd,
        end: this._lastResolvedCallbackEnd + this._readAheadBlocks,
      };
    }

    // Call the getBlocksToKeep helper.
    const { blockIndexesToKeep, newRecentRanges } = getBlocksToKeep({
      recentBlockRanges: this._recentBlockRanges,
      blockSizesInBytes: this._blocks.map((block) => (block ? block.sizeInBytes : undefined)),
      maxCacheSizeInBytes: this._cacheSizeBytes,
      badEvictionRange,
    });

    // Update our state.
    this._recentBlockRanges = newRecentRanges;
    const newBlocks = new Array(this._blocks.length);
    for (let blockIndex = 0; blockIndex < this._blocks.length; blockIndex++) {
      if (this._blocks[blockIndex] && blockIndexesToKeep.has(blockIndex)) {
        newBlocks[blockIndex] = this._blocks[blockIndex];
      }
    }
    this._blocks = newBlocks;
  }

  _updateProgress() {
    this._extensionPoint.progressCallback({
      fullyLoadedFractionRanges: this._getDownloadedBlockRanges().map((range) => ({
        // Convert block ranges into fractions.
        start: range.start / this._blocks.length,
        end: range.end / this._blocks.length,
      })),
      messageCache: {
        blocks: this._blocks,
        startTime: this._startTime,
      },
    });
  }

  setCacheSizeBytesInTests(cacheSizeBytes: number) {
    this._cacheSizeBytes = cacheSizeBytes;
  }
}
