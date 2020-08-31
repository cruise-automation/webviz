// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { vec3 } from "gl-matrix";
import React from "react";
import { GLTFScene, parseGLB, type Pose, type Scale, type CommonCommandProps } from "regl-worldview";

import carModelURL from "webviz-core/src/panels/ThreeDimensionalViz/commands/CarModel/carModel.glb";
import { type InteractionData } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";

async function loadCarModel() {
  const response = await fetch(carModelURL);
  if (!response.ok) {
    throw new Error(`unable to load car model: ${response.status}`);
  }
  const model = await parseGLB(await response.arrayBuffer());
  const nodes = [...model.json.nodes];

  // overwrite the translation component of the root node so the car's center is its rear axle
  const translation = [0, 0, 0];
  vec3.lerp(translation, model.json.accessors[1].min, model.json.accessors[1].max, 0.5);
  vec3.scale(translation, translation, -nodes[0].scale[0]);
  translation[1] += 56.075834;
  translation[2] += 136.19549;
  nodes[0] = { ...nodes[0], translation };

  return {
    ...model,
    json: {
      ...model.json,
      nodes,

      // change sampler minFilter to avoid blurry textures
      samplers: model.json.samplers.map((sampler) => ({
        ...sampler,
        minFilter: WebGLRenderingContext.LINEAR,
      })),
    },
  };
}

type Props = {|
  children: {|
    pose: Pose,
    scale?: Scale,
    alpha?: number,
    interactionData?: InteractionData,
  |},
  ...CommonCommandProps,
|};

// default scale is 0.01 because the model's units are centimeters
export default function CarModel({
  children: { pose, alpha = 1, scale = { x: 0.01, y: 0.01, z: 0.01 }, interactionData },
  layerIndex,
}: Props) {
  return (
    <GLTFScene layerIndex={layerIndex} model={loadCarModel}>
      {{ pose, alpha, scale, interactionData }}
    </GLTFScene>
  );
}
