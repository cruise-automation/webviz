// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  getDiffBySource,
  BASE_COLOR,
  SOURCE_1_COLOR,
  SOURCE_2_COLOR,
  BASE_COLOR_RGBA,
  SOURCE_1_COLOR_RGBA,
  SOURCE_2_COLOR_RGBA,
} from "./diffModeUtils";
import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";

const marker = (topic: string): Interactive<any> => {
  return {
    id: "foo",
    ns: "bar",
    interactionData: {
      topic,
      originalMessage: {},
    },
  };
};

const markers = {
  arrow: [marker("arrows")],
  cube: [],
  cubeList: [],
  cylinder: [],
  filledPolygon: [],
  glText: [],
  grid: [],
  instancedLineList: [],
  laserScan: [],
  linedConvexHull: [],
  lineList: [marker("foo"), marker(`${SECOND_SOURCE_PREFIX}/foo`)],
  lineStrip: [],
  pointcloud: [marker(`${SECOND_SOURCE_PREFIX}/foo`)],
  points: [],
  poseMarker: [],
  sphere: [],
  sphereList: [],
  text: [],
  triangleList: [],
};

describe("getDiffBySource", () => {
  it("generate three render passes with markers from both sources", () => {
    const passes = getDiffBySource(markers);
    expect(passes.length).toBe(3);
    expect(passes[0]).toStrictEqual({
      arrow: [
        {
          ...marker("arrows"),
          colors: [],
          color: SOURCE_1_COLOR_RGBA,
          depth: {
            enable: true,
            mask: true,
          },
          blend: {
            enable: true,
            func: {
              src: "constant color",
              dst: "src alpha",
            },
            color: SOURCE_1_COLOR,
          },
        },
      ],
      cube: [],
      cubeList: [],
      cylinder: [],
      filledPolygon: [],
      glText: [],
      grid: [],
      instancedLineList: [],
      laserScan: [],
      linedConvexHull: [],
      lineList: [
        {
          ...marker("foo"),
          colors: [],
          color: SOURCE_1_COLOR_RGBA,
          depth: {
            enable: true,
            mask: true,
          },
          blend: {
            enable: true,
            func: {
              src: "constant color",
              dst: "src alpha",
            },
            color: SOURCE_1_COLOR,
          },
        },
      ],
      lineStrip: [],
      pointcloud: [],
      points: [],
      poseMarker: [],
      sphere: [],
      sphereList: [],
      text: [],
      triangleList: [],
    });
    expect(passes[1]).toStrictEqual({
      arrow: [],
      cube: [],
      cubeList: [],
      cylinder: [],
      filledPolygon: [],
      glText: [],
      grid: [],
      instancedLineList: [],
      laserScan: [],
      linedConvexHull: [],
      lineList: [
        {
          ...marker(`${SECOND_SOURCE_PREFIX}/foo`),
          colors: [],
          color: BASE_COLOR_RGBA,
          depth: {
            enable: false,
          },
          blend: {
            enable: true,
            func: {
              src: "constant color",
              dst: "zero",
            },
            color: BASE_COLOR,
          },
        },
      ],
      lineStrip: [],
      pointcloud: [
        {
          ...marker(`${SECOND_SOURCE_PREFIX}/foo`),
          colors: [],
          color: BASE_COLOR_RGBA,
          depth: {
            enable: false,
          },
          blend: {
            enable: true,
            func: {
              src: "constant color",
              dst: "zero",
            },
            color: BASE_COLOR,
          },
        },
      ],
      points: [],
      poseMarker: [],
      sphere: [],
      sphereList: [],
      text: [],
      triangleList: [],
    });
    expect(passes[2]).toStrictEqual({
      arrow: [],
      cube: [],
      cubeList: [],
      cylinder: [],
      filledPolygon: [],
      glText: [],
      grid: [],
      instancedLineList: [],
      laserScan: [],
      linedConvexHull: [],
      lineList: [
        {
          ...marker(`${SECOND_SOURCE_PREFIX}/foo`),
          colors: [],
          color: SOURCE_2_COLOR_RGBA,
          depth: {
            enable: true,
          },
          blend: {
            enable: true,
            func: {
              src: "constant color",
              dst: "one",
            },
            color: SOURCE_2_COLOR,
          },
        },
      ],
      lineStrip: [],
      pointcloud: [
        {
          ...marker(`${SECOND_SOURCE_PREFIX}/foo`),
          colors: [],
          color: SOURCE_2_COLOR_RGBA,
          depth: {
            enable: true,
          },
          blend: {
            enable: true,
            func: {
              src: "constant color",
              dst: "one",
            },
            color: SOURCE_2_COLOR,
          },
        },
      ],
      points: [],
      poseMarker: [],
      sphere: [],
      sphereList: [],
      text: [],
      triangleList: [],
    });
  });
});
