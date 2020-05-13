// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getNonOverlappingLabels } from "webviz-core/src/components/SliderWithTicks";

describe("getNonOverlappingLabels", () => {
  const label = {
    text: "foo",
    value: 0,
  };
  const measuredLabels = [
    {
      ...label,
      tickWidth: 30,
    },
    {
      ...label,
      tickWidth: 40,
    },
    {
      ...label,
      tickWidth: 20,
    },
    {
      ...label,
      tickWidth: 100,
    },
  ];

  it("always returns at least 2 labels", () => {
    expect(getNonOverlappingLabels(measuredLabels, 10).length).toEqual(2);
  });

  it("keeps all the labels if it has room", () => {
    expect(getNonOverlappingLabels(measuredLabels, 1000).length).toEqual(4);
  });

  it("removes overlapping labels", () => {
    expect(getNonOverlappingLabels(measuredLabels, 100).length).toEqual(2);
  });
});
