// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isRangeCoveredByRanges } from "./ranges";

describe("ranges", () => {
  describe("isRangeCoveredByRanges", () => {
    it("returns true if there is a range that fully contains the queryRange", () => {
      expect(
        isRangeCoveredByRanges({ start: 5, end: 7 }, [
          { start: 0, end: 1 },
          { start: 4, end: 10 },
          { start: 12, end: 20 },
        ])
      ).toEqual(true);
      expect(isRangeCoveredByRanges({ start: 5, end: 7 }, [{ start: 5, end: 7 }])).toEqual(true);
    });

    it("returns false if there is no range that fully contains the queryRange", () => {
      expect(isRangeCoveredByRanges({ start: 5, end: 7 }, [{ start: 0, end: 1 }])).toEqual(false);
      expect(isRangeCoveredByRanges({ start: 5, end: 7 }, [{ start: 3, end: 6 }, { start: 7, end: 10 }])).toEqual(
        false
      );
    });
  });
});
