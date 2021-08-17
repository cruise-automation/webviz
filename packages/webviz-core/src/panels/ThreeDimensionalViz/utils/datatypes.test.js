// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getStructuralDatatypes } from "./datatypes";

describe("getStructuralDatatypes", () => {
  it("detects radar point cloud datatypes", () => {
    expect(
      getStructuralDatatypes({
        radarPoint: {
          fields: [
            { name: "range", type: "float32" },
            { name: "azimuth_angle_0", type: "float32" },
            { name: "elevation_angle", type: "float32" },
            { name: "radial_vel", type: "float32" },
          ],
        },
        notRadarPoint: {
          fields: [
            { name: "range", type: "float32" },
            { name: "azimuth_angle_0", type: "float32" },
            { name: "elevation_angle", type: "float32" },
            { name: "radial_vel", type: "float32", isArray: true },
          ],
        },
        pointCloud: { fields: [{ type: "radarPoint", name: "points", isArray: true }] },
        pointsNotArray: { fields: [{ type: "radarPoint", name: "points" }] },
        pointsWrongType: { fields: [{ type: "notRadarPoint", name: "points", isArray: true }] },
      })
    ).toEqual({ pointCloud: "radarPointCloud" });
  });
});
