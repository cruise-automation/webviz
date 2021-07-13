// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { Frame } from "webviz-core/src/players/types";
import type { TF } from "webviz-core/src/types/Messages";
import { isBobject, deepParse } from "webviz-core/src/util/binaryObjects";
import { TRANSFORM_STATIC_TOPIC, TRANSFORM_TOPIC } from "webviz-core/src/util/globalConstants";

export const makeTransformElement = (tf: TF) => ({
  childFrame: tf.child_frame_id,
  parentFrame: tf.header.frame_id,
  pose: { position: tf.transform.translation, orientation: tf.transform.rotation },
});

// Exported because transforms will be maintained both inside and outside the workers.
export function updateTransforms(
  existingTransforms: Transforms, // possibly mutated
  frame: Frame,
  cleared: boolean,
  // Hook override logic for frames for which we don't use the /tf topic.
  skipFrameId: ?string,
  consumePose: (Frame, Transforms) => void
): Transforms {
  const transforms = cleared ? new Transforms() : existingTransforms;
  consumePose(frame, transforms);

  const tfs = frame[TRANSFORM_TOPIC];
  if (tfs) {
    for (const { message } of tfs) {
      const parsedMessage = isBobject(message) ? deepParse(message) : message;
      for (const tf of parsedMessage.transforms) {
        if (tf.child_frame_id !== skipFrameId) {
          transforms.consume(makeTransformElement(tf));
        }
      }
    }
  }
  const tfs_static = frame[TRANSFORM_STATIC_TOPIC];
  if (tfs_static) {
    for (const { message } of tfs_static) {
      const parsedMessage = isBobject(message) ? deepParse(message) : message;
      for (const tf of parsedMessage.transforms) {
        transforms.consume(makeTransformElement(tf));
      }
    }
  }
  return transforms;
}
