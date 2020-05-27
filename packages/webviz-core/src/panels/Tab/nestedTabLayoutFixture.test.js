// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

const nestedTabLayoutFixture = {
  topics: [],
  datatypes: {},
  frame: {},
  layout: {
    direction: "column",
    first: {
      direction: "row",
      first: "Tab!Left",
      second: "Tab!Right",
      splitPercentage: 50,
    },
    second: "Tab!Bottom",
    splitPercentage: 75,
  },
  savedProps: {
    "Tab!RightInner": {
      activeTabIdx: 1,
      tabs: [
        {
          title: "Inactive Plots",
          layout: null,
        },
        {
          title: "Child Plots",
          layout: {
            first: {
              first: "Audio!A",
              second: "Audio!B",
              direction: "column",
            },
            second: {
              first: "Audio!C",
              second: "Audio!D",
              direction: "column",
            },
            direction: "row",
          },
        },
      ],
    },
    "Tab!Left": {
      activeTabIdx: 0,
      tabs: [
        {
          title: "Left",
          layout: {
            first: "Global!A",
            second: {
              first: "ImageViewPanel!A",
              second: {
                first: "ImageViewPanel!B",
                second: "ImageViewPanel!C",
                direction: "row",
                splitPercentage: 50,
              },
              direction: "row",
              splitPercentage: 33.3,
            },
            direction: "column",
            splitPercentage: 75,
          },
        },
      ],
    },
    "Tab!Right": {
      activeTabIdx: 0,
      tabs: [
        {
          title: "Right",
          layout: "Tab!RightInner",
        },
      ],
    },
    "Tab!Bottom": {
      activeTabIdx: 0,
      tabs: [
        {
          title: "Bottom",
          layout: "GlobalVariableSliderPanel!A",
        },
      ],
    },
  },
};

export default nestedTabLayoutFixture;
