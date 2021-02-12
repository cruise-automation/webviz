// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getArrayView, PrimitiveArrayView, getReverseWrapperArrayView } from "./ArrayViews";

describe("ArrayViews", () => {
  describe("BinaryArrayView", () => {
    describe("length", () => {
      it("works with arrays of zero length", () => {
        const storage = new Int32Array([]);
        const dataView = new DataView(storage.buffer);
        const getter = (i) => dataView.getInt32(i, true);

        const ArrayView = getArrayView<number>(getter, 4);
        const arrayView = new ArrayView(0, 0);
        expect(arrayView.length()).toBe(0);
      });

      it("works with arrays of positive length", () => {
        const storage = new Int32Array([1, 2, 3]);
        const dataView = new DataView(storage.buffer);
        const getter = (i) => dataView.getInt32(i, true);

        const ArrayView = getArrayView<number>(getter, 4);
        expect(new ArrayView(0, 3).length()).toBe(3);
        expect(new ArrayView(4, 2).length()).toBe(2);
        expect(new ArrayView(4, 1).length()).toBe(1);
        expect(new ArrayView(8, 1).length()).toBe(1);
        expect(new ArrayView(12, 0).length()).toBe(0);
      });
    });

    describe("get", () => {
      it("gets values in-bounds", () => {
        const storage = new Int32Array([1, 2, 3]);
        const dataView = new DataView(storage.buffer);
        const getter = (i) => dataView.getInt32(i, true);

        const ArrayView = getArrayView<number>(getter, 4);
        expect(new ArrayView(0, 3).get(0)).toBe(1);
        expect(new ArrayView(0, 3).get(2)).toBe(3);

        expect(new ArrayView(4, 1).get(0)).toBe(2);
        expect(new ArrayView(8, 1).get(0)).toBe(3);
      });

      it("does not bounds-check", () => {
        const storage = new Int32Array([1, 2, 3]);
        const dataView = new DataView(storage.buffer);
        const getter = (i) => dataView.getInt32(i, true);

        const ArrayView = getArrayView<number>(getter, 4);
        expect(new ArrayView(0, 1).get(2)).toBe(3);
        // Accessing out of bounds of the whole buffer will throw, though.
        expect(() => new ArrayView(0, 3).get(4)).toThrow();
      });
    });

    describe("iteration", () => {
      it("works with arrays of zero length", () => {
        const storage = new Int32Array([]);
        const dataView = new DataView(storage.buffer);
        const getter = (i) => dataView.getInt32(i, true);

        const ArrayView = getArrayView<number>(getter, 4);
        const arrayView = new ArrayView(0, 0);
        expect([...arrayView]).toEqual([]);
      });

      it("works with arrays of positive length", () => {
        const storage = new Int32Array([1, 2, 3]);
        const dataView = new DataView(storage.buffer);
        const getter = (i) => dataView.getInt32(i, true);

        const ArrayView = getArrayView<number>(getter, 4);
        expect([...new ArrayView(0, 3)]).toEqual([1, 2, 3]);
        expect([...new ArrayView(4, 2)]).toEqual([2, 3]);
        expect([...new ArrayView(4, 1)]).toEqual([2]);
        expect([...new ArrayView(8, 1)]).toEqual([3]);
        expect([...new ArrayView(12, 0)]).toEqual([]);
      });
    });
  });

  describe("utility methods", () => {
    it("array spreads", () => {
      const storage = new Int32Array([1, 2, 3]);
      const dataView = new DataView(storage.buffer);
      const getter = (i) => dataView.getInt32(i, true);

      const ArrayView = getArrayView<number>(getter, 4);
      expect([...new ArrayView(0, 3)]).toEqual([1, 2, 3]);
    });
    it("find", () => {
      const storage = new Int32Array([1, 2, 3]);
      const dataView = new DataView(storage.buffer);
      const getter = (i) => dataView.getInt32(i, true);

      const ArrayView = getArrayView<number>(getter, 4);
      expect(new ArrayView(0, 3).find((val) => val === 3)).toEqual(3);
    });
  });

  describe("array wrappers", () => {
    describe("PrimitiveArrayView", () => {
      describe("utility methods", () => {
        it("array spreads", () => {
          const arr = [1, 2, 3];
          const primitiveArrayView = new PrimitiveArrayView(arr);
          expect([...primitiveArrayView]).toEqual(arr);
        });
        it("find", () => {
          const arr = [1, 2, 3];
          const primitiveArrayView = new PrimitiveArrayView(arr);
          expect(primitiveArrayView.find((val) => val === 3)).toEqual(3);
        });
      });
    });
    describe("getReverseWrapperArrayView", () => {
      describe("utility methods", () => {
        const arr = [1, 2, 3];
        class DummyClass {
          val: number;
          constructor(val) {
            this.val = val;
          }
        }

        it("array spreads", () => {
          const ReverseWrapperArrayView = getReverseWrapperArrayView<number>(DummyClass);
          // $FlowFixMe - ReverseWrapperArrayView is not technically correctly typed.
          const reverseWrapperArrayView = new ReverseWrapperArrayView(arr);
          expect([...reverseWrapperArrayView]).toEqual(arr.map((val) => new DummyClass(val)));
        });
        it("find", () => {
          const ReverseWrapperArrayView = getReverseWrapperArrayView<number>(DummyClass);
          // $FlowFixMe - ReverseWrapperArrayView is not technically correctly typed.
          const reverseArrayWrapperView = new ReverseWrapperArrayView(arr);
          expect(
            reverseArrayWrapperView.find((val) => {
              // $FlowFixMe - ReverseWrapperArrayView is not technically correctly typed.
              return val?.val === 1;
            })
          ).toEqual(new DummyClass(1));
        });
      });
    });
  });
});
