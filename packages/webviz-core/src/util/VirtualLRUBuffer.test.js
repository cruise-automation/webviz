// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import VirtualLRUBuffer from "./VirtualLRUBuffer";

describe("VirtualLRUBuffer", () => {
  describe("constructor", () => {
    it("returns an instance with the requested bytes", () => {
      const vb = new VirtualLRUBuffer({ size: 50, blockSize: 10 });
      expect(vb.byteLength).toEqual(50);
    });
  });

  describe("#copyFrom", () => {
    it("lets you copy a buffer into a single block", () => {
      const vb = new VirtualLRUBuffer({ size: 25, blockSize: 10 });
      vb.copyFrom(Buffer.from(new Array(25).fill(0)), 0);
      vb.copyFrom(Buffer.from([1, 2, 3, 4]), 2);
      vb.copyFrom(Buffer.from([5, 6, 7, 8]), 12);
      //                <--------- block 1 -------->  <--------- block 2 -------->  <-- block 3 ->
      const expected = [0, 0, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      expect([...vb.slice(0, 10), ...vb.slice(10, 20), ...vb.slice(20, 25)]).toEqual(expected);
    });

    it("lets you copy a buffer spread over two blocks", () => {
      const vb = new VirtualLRUBuffer({ size: 25, blockSize: 10 });
      vb.copyFrom(Buffer.from(new Array(25).fill(0)), 0);
      vb.copyFrom(Buffer.from([1, 2, 3, 4]), 8);
      vb.copyFrom(Buffer.from([5, 6, 7, 8]), 18);
      //                <--------- block 1 -------->  <--------- block 2 -------->  <-- block 3 ->
      const expected = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 0, 0, 0];
      expect([...vb.slice(0, 10), ...vb.slice(10, 20), ...vb.slice(20, 25)]).toEqual(expected);
    });

    it("lets you copy a buffer spread over three blocks", () => {
      const vb = new VirtualLRUBuffer({ size: 25, blockSize: 10 });
      vb.copyFrom(Buffer.from(new Array(25).fill(0)), 0);
      vb.copyFrom(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5]), 8);
      //                <--------- block 1 -------->  <--------- block 2 -------->  <-- block 3 ->
      const expected = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 0, 0, 0];
      expect([...vb.slice(0, 10), ...vb.slice(10, 20), ...vb.slice(20, 25)]).toEqual(expected);
    });
  });

  describe("#hasData", () => {
    it("gets set when copying in data", () => {
      const vb = new VirtualLRUBuffer({ size: 25, blockSize: 10 });
      vb.copyFrom(Buffer.from([1, 2, 3, 4]), 2);
      expect(vb.hasData(0, 4)).toEqual(false);
      expect(vb.hasData(2, 6)).toEqual(true);
    });

    it("evicts old blocks if numberOfBlocks is set", () => {
      const vb = new VirtualLRUBuffer({ size: 25, blockSize: 10, numberOfBlocks: 1 });
      vb.copyFrom(Buffer.from([1, 2, 3, 4]), 2);
      expect(vb.hasData(2, 6)).toEqual(true);
      vb.copyFrom(Buffer.from([5, 6, 7, 8]), 12);
      expect(vb.hasData(2, 6)).toEqual(false);
      expect(vb.hasData(12, 16)).toEqual(true);
    });
  });

  describe("#slice", () => {
    // single block case covered above in .copyFrom tests.

    it("lets you slice a buffer spread over two blocks", () => {
      const vb = new VirtualLRUBuffer({ size: 25, blockSize: 10 });
      vb.copyFrom(Buffer.from([1, 2, 3, 4]), 8);
      vb.copyFrom(Buffer.from([5, 6, 7, 8]), 18);
      expect([...vb.slice(8, 12)]).toEqual([1, 2, 3, 4]);
      expect([...vb.slice(18, 22)]).toEqual([5, 6, 7, 8]);
    });

    it("lets you slice a buffer spread over three blocks", () => {
      const vb = new VirtualLRUBuffer({ size: 25, blockSize: 10 });
      vb.copyFrom(Buffer.from(new Array(25).fill(0)), 0);
      vb.copyFrom(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5]), 8);
      //                <--------- block 1 -------->  <--------- block 2 -------->  <-- block 3 ->
      const expected = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 0, 0, 0];
      expect([...vb.slice(0, 25)]).toEqual(expected);
    });
  });
});
