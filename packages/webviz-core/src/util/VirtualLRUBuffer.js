// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import buffer from "buffer";
import { simplify, substract, unify } from "intervals-fn";

import { isRangeCoveredByRanges, type Range } from "./ranges";

// VirtualLRUBuffer works similarly to a regular Node.js `Buffer`, but it has some additional features:
// 1. It can span buffers larger than `buffer.kMaxLength` (typically 2GiB).
// 2. It can take up much less memory when needed by evicting its least recently used ranges from
//    memory.
//
// This works by allocating multiple smaller buffers underneath, which we call "blocks". There are
// two main operations:
// - `VirtualLRUBuffer#slice`: works just like `Buffer#slice`, but stitches data together from the
//    underlying blocks. It throws an error when the underlying data is not currently set, so be
//    sure to check that first using `VirtualLRUBuffer#hasData`, because the underlying block might
//    have been evicted.
// - `VirtualLRUBuffer#copyFrom`: similar to `Buffer#copy`. Will set `VirtualLRUBuffer#hasData` to true
//    for the range that you copied in, until the data gets evicted through subsequent
//    `VirtualLRUBuffer#copyFrom` calls.
//
// As said above, you can use `VirtualLRUBuffer#hasData` to see if a range can be sliced out. You can
// also use `VirtualLRUBuffer#getRangesWithData` to get the full list of ranges for which data is set,
// as an array of `Range` objects with `start` (inclusive) and `end` (exclusive) numbers.
//
// Create a new instance by calling `new VirtualLRUBuffer({ size })`. By default this will not do any
// eviction, and so it will take up `size` bytes of memory.
//
// To limit the memory usage, you can pass in a additional options to the constructor: `blockSize`
// (in bytes) and `numberOfBlocks`. The least recently used block will get evicted when writing to
// an unallocated block using `VirtualLRUBuffer.copyFrom`.

export default class VirtualLRUBuffer {
  byteLength: number; // How many bytes does this buffer represent.
  _blocks: Buffer[] = []; // Actual `Buffer` for each block.
  // How many bytes is each block. This used to work up to 2GiB minus a byte, and now seems to crash
  // past 2GiB minus 4KiB. Default to 1GiB so we don't get caught out next time the limit drops.
  _blockSize: number = Math.trunc(buffer.kMaxLength / 2);
  _numberOfBlocks: number = Infinity; // How many blocks are we allowed to have at any time.
  _lastAccessedBlockIndices: number[] = []; // Indexes of blocks, from least to most recently accessed.
  _rangesWithData: Range[] = []; // Ranges for which we have data copied in (and have not been evicted).

  constructor(options: {| size: number, blockSize?: number, numberOfBlocks?: number |}) {
    this.byteLength = options.size;
    this._blockSize = options.blockSize || this._blockSize;
    this._numberOfBlocks = options.numberOfBlocks || this._numberOfBlocks;
  }

  // Check if the range between `start` (inclusive) and `end` (exclusive) fully contains data
  // copied in through `VirtualLRUBuffer#copyFrom`.
  hasData(start: number, end: number): boolean {
    return isRangeCoveredByRanges({ start, end }, this._rangesWithData);
  }

  // Get the minimal number of start-end pairs for which `VirtualLRUBuffer#hasData` will return true.
  // The array is sorted by `start`.
  getRangesWithData(): Range[] {
    return this._rangesWithData;
  }

  // Copy data from the `source` buffer to the byte at `targetStart` in the VirtualLRUBuffer.
  copyFrom(source: Buffer, targetStart: number): void {
    if (targetStart < 0 || targetStart >= this.byteLength) {
      throw new Error("VirtualLRUBuffer#copyFrom invalid input");
    }

    const range = { start: targetStart, end: targetStart + source.byteLength };

    // Walk through the blocks and copy the data over. If the input buffer is too large we will
    // currently just evict the earliest copied in data.
    // TODO(JP): We could throw an error in that case if this is causing a lot of trouble.
    let position = range.start;
    while (position < range.end) {
      const { blockIndex, positionInBlock, remainingBytesInBlock } = this._calculatePosition(position);
      source.copy(this._getBlock(blockIndex), positionInBlock, position - targetStart);
      position += remainingBytesInBlock;
    }

    this._rangesWithData = simplify(unify([range], this._rangesWithData));
  }

  // Get a slice of data. Throws if `VirtualLRUBuffer#hasData(start, end)` is false, so be sure to check
  // that first. Will use an efficient `Buffer#slice` instead of a copy if all the data happens to
  // be contained in one block.
  slice(start: number, end: number): Buffer {
    const size = end - start;
    if (start < 0 || end > this.byteLength || size <= 0 || size > buffer.kMaxLength) {
      throw new Error("VirtualLRUBuffer#slice invalid input");
    }
    if (!this.hasData(start, end)) {
      throw new Error("VirtualLRUBuffer#slice range has no data set");
    }

    const startPositionData = this._calculatePosition(start);
    if (size <= startPositionData.remainingBytesInBlock) {
      // If the entire range that we care about are contained in one block, do an efficient
      // `Buffer#slice` instead of copying data to a new Buffer.
      const { blockIndex, positionInBlock } = startPositionData;
      return this._getBlock(blockIndex).slice(positionInBlock, positionInBlock + size);
    }

    const result = buffer.Buffer.allocUnsafe(size);
    let position = start;
    while (position < end) {
      const { blockIndex, positionInBlock, remainingBytesInBlock } = this._calculatePosition(position);
      // Note that these calls to `_getBlock` will never cause any eviction, since we verified using
      // the `VirtualLRUBuffer#hasData` precondition that all these buffers exist already.
      this._getBlock(blockIndex).copy(result, position - start, positionInBlock);
      position += remainingBytesInBlock;
    }
    return result;
  }

  // Get a reference to a block, and mark it as most recently used. Might evict older blocks.
  _getBlock(index: number): Buffer {
    if (!this._blocks[index]) {
      // If a block is not allocated yet, do so.
      let size = this._blockSize;
      if ((index + 1) * this._blockSize > this.byteLength) {
        size = this.byteLength % this._blockSize; // Trim the last block to match the total size.
      }
      // It's okay to use `allocUnsafe` because we don't allow reading data from ranges that have
      // not explicitly be filled using `VirtualLRUBuffer#copyFrom`.
      this._blocks[index] = buffer.Buffer.allocUnsafe(size);
    }
    // Put the current index to the end of the list, while avoiding duplicates.
    this._lastAccessedBlockIndices = [...this._lastAccessedBlockIndices.filter((idx) => idx !== index), index];
    if (this._lastAccessedBlockIndices.length > this._numberOfBlocks) {
      // If we have too many blocks, remove the least recently used one.
      // Note that we don't reuse blocks, since other code might still hold a reference to it
      // via the `VirtualLRUBuffer#slice` method.
      // TODO(JP): It might be worth measuring if under typical use it's faster to reuse blocks and always
      // copy to a new buffer in `VirtualLRUBuffer#slice` (less garbage collection), or if the current method
      // is better (faster slicing).
      const deleteIndex = this._lastAccessedBlockIndices.shift();
      delete this._blocks[deleteIndex];
      // Remove the range that we evicted from `_rangesWithData`, since the range doesn't have data now.
      this._rangesWithData = simplify(
        substract(this._rangesWithData, [
          { start: deleteIndex * this._blockSize, end: (deleteIndex + 1) * this._blockSize },
        ])
      );
    }
    return this._blocks[index];
  }

  // For a given position, calculate `blockIndex` (which block is this position in);
  // `positionInBlock` (byte index of `position` within that block); and `remainingBytesInBlock`
  // (how many bytes are there in that block after that position).
  _calculatePosition(position: number) {
    if (position < 0 || position >= this.byteLength) {
      throw new Error("VirtualLRUBuffer#_calculatePosition invalid input");
    }
    const blockIndex = Math.floor(position / this._blockSize);
    const positionInBlock = position - blockIndex * this._blockSize;
    const remainingBytesInBlock = this._getBlock(blockIndex).byteLength - positionInBlock;
    return { blockIndex, positionInBlock, remainingBytesInBlock };
  }
}
