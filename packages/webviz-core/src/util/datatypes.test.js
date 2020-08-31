// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { basicDatatypes, getTransitiveSubsetForDatatypes } from "./datatypes";

describe("getTransitiveSubsetForDatatypes ", () => {
  it("works for an empty set of types", () => {
    expect(getTransitiveSubsetForDatatypes(basicDatatypes, [])).toEqual({});
  });

  it("works for type with no children", () => {
    expect(Object.keys(getTransitiveSubsetForDatatypes(basicDatatypes, ["std_msgs/Header"]))).toEqual([
      "std_msgs/Header",
    ]);
  });

  it("works for types with children", () => {
    expect(new Set(Object.keys(getTransitiveSubsetForDatatypes(basicDatatypes, ["geometry_msgs/Pose"])))).toEqual(
      new Set(["geometry_msgs/Pose", "geometry_msgs/Point", "geometry_msgs/Quaternion"])
    );
  });

  it("works when some input types have children and others don't", () => {
    expect(
      new Set(Object.keys(getTransitiveSubsetForDatatypes(basicDatatypes, ["geometry_msgs/Pose", "std_msgs/Header"])))
    ).toEqual(new Set(["geometry_msgs/Pose", "geometry_msgs/Point", "geometry_msgs/Quaternion", "std_msgs/Header"]));
  });

  it("throws for unknown datatypes", () => {
    expect(() => getTransitiveSubsetForDatatypes(basicDatatypes, ["nonstd_msgs/Asdf"])).toThrow(
      "Definition missing for type nonstd_msgs/Asdf"
    );
  });
});
