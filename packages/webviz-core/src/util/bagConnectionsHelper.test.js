// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { bagConnectionsToDatatypes, bagConnectionsToTopics } from "./bagConnectionsHelper";

describe("bagConnectionsToDatatypes", () => {
  it("extracts one big list from multiple connections", () => {
    expect(
      bagConnectionsToDatatypes([
        {
          topic: "/some/topic/with/points",
          type: "something/points",
          messageDefinition: `
            Point[] points
            ============
            MSG: geometry_msgs/Point
            float64 x
          `,
        },
        {
          topic: "/some/topic/with/two_points",
          type: "something/two_points",
          messageDefinition: `
            Point point1
            Point point2
            ============
            MSG: geometry_msgs/Point
            float64 x
          `,
        },
      ])
    ).toEqual({
      "something/points": { fields: [{ name: "points", type: "geometry_msgs/Point", isArray: true, isComplex: true }] },
      "something/two_points": {
        fields: [
          { name: "point1", type: "geometry_msgs/Point", isArray: false, isComplex: true },
          { name: "point2", type: "geometry_msgs/Point", isArray: false, isComplex: true },
        ],
      },
      "geometry_msgs/Point": { fields: [{ name: "x", type: "float64", isArray: false, isComplex: false }] },
    });
  });
});

describe("bagConnectionsToTopics", () => {
  it("extracts one big list from multiple connections (even with duplicate topics)", () => {
    expect(
      bagConnectionsToTopics(
        [
          {
            topic: "/some/topic/with/points",
            type: "something/points",
            messageDefinition: "",
            md5sum: "",
          },
          {
            topic: "/some/topic/with/points",
            type: "something/points",
            messageDefinition: "",
            md5sum: "",
          },
          {
            topic: "/some/topic/with/two_points",
            type: "something/two_points",
            messageDefinition: "",
            md5sum: "",
          },
        ],
        []
      )
    ).toEqual([
      {
        name: "/some/topic/with/points",
        datatype: "something/points",
        numMessages: 0,
      },
      {
        name: "/some/topic/with/two_points",
        datatype: "something/two_points",
        numMessages: 0,
      },
    ]);
  });
});
