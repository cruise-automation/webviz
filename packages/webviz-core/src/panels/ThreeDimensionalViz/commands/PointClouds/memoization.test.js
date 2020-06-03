// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { POINT_CLOUD_MESSAGE } from "./fixture/pointCloudData";
import { memoizedMarker, updateMarkerCache } from "./memoization";
import type { MemoizedMarker } from "./types";

describe("<PointClouds />", () => {
  describe("marker memoization", () => {
    it("returns memoized object", () => {
      let cache = new Map<Uint8Array, MemoizedMarker>();
      const marker = { ...POINT_CLOUD_MESSAGE };
      cache = updateMarkerCache(cache, [marker]);
      const memoized1 = memoizedMarker(cache, marker);
      cache = updateMarkerCache(cache, [marker]);
      const memoized2 = memoizedMarker(cache, marker);
      expect(memoized1).toBe(memoized2);
    });

    it("returns memoized object after adding new markers", () => {
      let cache = new Map<Uint8Array, MemoizedMarker>();
      const marker1 = { ...POINT_CLOUD_MESSAGE };
      cache = updateMarkerCache(cache, [marker1]);
      const memoized1 = memoizedMarker(cache, marker1);
      const marker2 = { ...POINT_CLOUD_MESSAGE };
      cache = updateMarkerCache(cache, [marker1, marker2]);
      const memoized2 = memoizedMarker(cache, marker1);
      expect(memoized1).toBe(memoized2);
    });

    it("returns null object when marker has been removed from cache", () => {
      let cache = new Map<Uint8Array, MemoizedMarker>();
      const marker = { ...POINT_CLOUD_MESSAGE };
      cache = updateMarkerCache(cache, [marker]);
      let memoized = memoizedMarker(cache, marker);
      expect(memoized).not.toBeUndefined();
      cache = updateMarkerCache(cache, []);
      memoized = memoizedMarker(cache, marker);
      expect(memoized).toBeUndefined();
    });

    it("returns memoized object when settings are the same", () => {
      let cache = new Map<Uint8Array, MemoizedMarker>();
      const marker = { ...POINT_CLOUD_MESSAGE };
      cache = updateMarkerCache(cache, [
        {
          ...marker,
          settings: { colorMode: { mode: "flat", flatColor: "#ffffff" } },
        },
      ]);
      const memoized1 = memoizedMarker(cache, marker);
      cache = updateMarkerCache(cache, [
        {
          ...marker,
          settings: { colorMode: { mode: "flat", flatColor: "#ffffff" } },
        },
      ]);
      const memoized2 = memoizedMarker(cache, marker);
      expect(memoized1).toBe(memoized2);
    });

    it("returns different objects for different settings", () => {
      let cache = new Map<Uint8Array, MemoizedMarker>();
      const marker = { ...POINT_CLOUD_MESSAGE };
      cache = updateMarkerCache(cache, [
        {
          ...marker,
          settings: { colorMode: { mode: "flat", flatColor: "#ffffff" } },
        },
      ]);
      const memoized1 = memoizedMarker(cache, marker);
      cache = updateMarkerCache(cache, [
        {
          ...marker,
          settings: { colorMode: { mode: "flat", flatColor: "#ff0000" } },
        },
      ]);
      const memoized2 = memoizedMarker(cache, marker);
      expect(memoized1).not.toBe(memoized2);
    });

    it("returns different objects when hitmap colors are defined", () => {
      let cache = new Map<Uint8Array, MemoizedMarker>();
      const marker = { ...POINT_CLOUD_MESSAGE };
      cache = updateMarkerCache(cache, [
        {
          ...marker,
          settings: { colorMode: { mode: "flat", flatColor: "#ffffff" } },
        },
      ]);
      const memoized1 = memoizedMarker(cache, marker);
      cache = updateMarkerCache(cache, [
        {
          ...marker,
          settings: { colorMode: { mode: "flat", flatColor: "#ffffff" } },
          hitmapColors: [1, 2, 3, 4, 5, 6],
        },
      ]);
      const memoized2 = memoizedMarker(cache, marker);
      expect(memoized1).not.toBe(memoized2);
    });
    it("returns memoized object when same hitmap colors are defined", () => {
      let cache = new Map<Uint8Array, MemoizedMarker>();
      const marker = {
        ...POINT_CLOUD_MESSAGE,
        settings: { colorMode: { mode: "flat", flatColor: "#ffffff" } },
        hitmapColors: [1, 2, 3, 4, 5, 6],
      };
      cache = updateMarkerCache(cache, [marker]);
      const memoized1 = memoizedMarker(cache, marker);
      cache = updateMarkerCache(cache, [marker]);
      const memoized2 = memoizedMarker(cache, marker);
      expect(memoized1).toBe(memoized2);
    });
  });
});
