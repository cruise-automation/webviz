// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { cloneDeep } from "lodash";
import React from "react";
import type { Color } from "regl-worldview";

import type { ThreeDimensionalVizConfig } from "webviz-core/src/panels/ThreeDimensionalViz";
import { markerProps, generateMarkers } from "webviz-core/src/panels/ThreeDimensionalViz/stories/indexUtils.stories";
import type { FixtureExampleData } from "webviz-core/src/panels/ThreeDimensionalViz/stories/storyComponents";
import { FixtureExample } from "webviz-core/src/panels/ThreeDimensionalViz/stories/storyComponents";

const fixtureData = {
  topics: {
    "/smoothed_localized_pose": { name: "/smoothed_localized_pose", datatype: "geometry_msgs/PoseStamped" },
    "/viz_markers": { name: "/viz_markers", datatype: "visualization_msgs/MarkerArray" },
  },
  frame: {
    "/viz_markers": [
      {
        topic: "/viz_markers",
        receiveTime: { sec: 1534827954, nsec: 199901839 },
        message: {
          markers: [],
        },
      },
    ],
  },
};
Object.keys(markerProps).forEach((markerType, idx) => {
  const markerProp = markerProps[markerType];
  const markers = generateMarkers(markerProp, idx, markerType);
  fixtureData.frame["/viz_markers"][0].message.markers.push(...markers);
});

export function MarkerStory(
  props: {
    data?: FixtureExampleData,
    initialConfigOverride?: $Shape<ThreeDimensionalVizConfig>,
    overrideColor?: ?Color,
    onMount?: (?HTMLDivElement) => void,
  } = {}
) {
  const { data, overrideColor, onMount, initialConfigOverride } = props;

  return (
    <FixtureExample
      onMount={onMount}
      data={data ?? cloneDeep(fixtureData)}
      initialConfig={{
        checkedKeys: ["name:(Uncategorized)", "name:Topics", "t:/smoothed_localized_pose", "t:/viz_markers"],
        settingsByKey: { "t:/viz_markers": { overrideColor } },
        followTf: undefined,
        cameraState: {
          distance: 85,
          thetaOffset: -0.5,
          perspective: true,
        },
        colorOverrideBySourceIdxByVariable: {
          qux_idx: [{ active: true, color: { r: 1, g: 0.3, b: 0.1, a: 1 } }],
          foo: [{ active: true, color: { r: 0.2, g: 0.4, b: 1, a: 1 } }],
        },
        ...initialConfigOverride,
      }}
    />
  );
}
