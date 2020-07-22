// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { vec3 } from "gl-matrix";
import React, { type Node } from "react";
import { Arrows, pointToVec3, vec3ToPoint, orientationToVec4, type Arrow } from "regl-worldview";

import CarModel from "./CarModel";

type Props = {
  children: Arrow[],
};

export default React.memo<Props>(function PoseMarkers({ children }: Props): Node[] {
  const models = [];
  const markers = [];
  children.forEach((marker, i) => {
    if (marker.settings && marker.settings.useCarModel) {
      const { pose, settings, interactionData } = marker;
      models.push(<CarModel key={i}>{{ pose, alpha: settings.alpha || 1, interactionData }}</CarModel>);
    } else {
      const { settings } = marker;
      if (settings && settings.color) {
        marker = { ...marker, color: settings.color };
      }

      if (settings && settings.size) {
        marker = {
          ...marker,
          scale: {
            x: settings.size.shaftWidth || marker.scale.x,
            y: settings.size.headWidth || marker.scale.y,
            z: settings.size.headLength || marker.scale.z,
          },
        };
      }

      const pos = pointToVec3(marker.pose.position);
      const orientation = orientationToVec4(marker.pose.orientation);
      const dir = vec3.transformQuat([0, 0, 0], [1, 0, 0], orientation);
      // the total length of the arrow is 4.7, we move the tail backwards by 0.88 (prev implementation)
      const tipPoint = vec3.scaleAndAdd([0, 0, 0], pos, dir, 3.82);
      const tailPoint = vec3.scaleAndAdd([0, 0, 0], pos, dir, -0.88);
      markers.push({ ...marker, points: [vec3ToPoint(tailPoint), vec3ToPoint(tipPoint)] });
    }
  });

  return models.concat(<Arrows key="arrows">{markers}</Arrows>);
});
