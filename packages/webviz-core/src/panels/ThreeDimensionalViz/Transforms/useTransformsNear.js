// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { minBy, sortedLastIndexBy } from "lodash";
import memoizeWeak from "memoize-weak";
import * as React from "react";
import { type Time } from "rosbag";

import type { TransformElement } from ".";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import useBlocksByTopicWithFallback, {
  type BlocksForTopics,
} from "webviz-core/src/PanelAPI/useBlocksByTopicWithFallback";
import { makeTransformElement } from "webviz-core/src/panels/ThreeDimensionalViz/Transforms/utils";
import type { TypedMessage } from "webviz-core/src/players/types";
import type { BinaryTfMessage, BinaryTransformStamped } from "webviz-core/src/types/BinaryMessages";
import { deepParse } from "webviz-core/src/util/binaryObjects";
import { $TF_STATIC, $TF } from "webviz-core/src/util/globalConstants";
import { toSec } from "webviz-core/src/util/time";

const {
  skipTransformFrame,
  useDynamicTransformsData,
  useStaticTransformsData,
} = getGlobalHooks().perPanelHooks().ThreeDimensionalViz;

const NO_HOOK_TRANSFORMS = [];

type ProcessedBlock = { [frameId: string]: BinaryTransformStamped[] };

// Index a ROS block's TF data by child_frame_id
const getTransformElementBlock = memoizeWeak(
  (tfMessages: TypedMessage<BinaryTfMessage>[], framesToIgnore: Set<string>): ProcessedBlock => {
    const transformsByFrameId = {};
    for (const tfMessage of tfMessages) {
      for (const transform of tfMessage.message.transforms()) {
        const childFrameId = transform.child_frame_id();
        if (framesToIgnore.has(childFrameId)) {
          continue;
        }
        const frameTransforms = (transformsByFrameId[childFrameId] = transformsByFrameId[childFrameId] ?? []);
        frameTransforms.push(transform);
      }
    }
    return transformsByFrameId;
  }
);

type FrameIndex = { [frameId: string]: BinaryTransformStamped[][] };
// Index all transform data from all blocks by child_frame_id
const getBlockFrameIndex = (blocks: BlocksForTopics, framesToIgnore: Set<string>): FrameIndex => {
  const ret = {};
  for (const block of blocks) {
    [block[$TF], block[$TF_STATIC]]
      .filter(Boolean)
      .map((topicBlock) => getTransformElementBlock(topicBlock, framesToIgnore))
      .forEach((processedBlock) => {
        Object.keys(processedBlock).forEach((childFrameId) => {
          const frameBlocks = (ret[childFrameId] = ret[childFrameId] ?? []);
          frameBlocks.push(processedBlock[childFrameId]);
        });
      });
  }
  return ret;
};

// Find the ROS transforms in the indexed blocks with header stamps closest to the input timestamp.
// Notes:
// - frameBlocks and all contained arrays must be non-empty.
// - sortedLastIndexBy expects `value` to have the same type as the elements of `array`, but that
//   doesn't quite work for us, so we use `any` and make the callback work for both types.
// - toSec might lose precision here, but we probably don't need it to be exact.
// - The "nearest" transform might be after `timeSecs`. Ideally we'd interpolate/extrapolate, but
//   there probably isn't a philosophical issue with looking into the future a bit.
const findNearestTransformInBlocks = (
  frameBlocks: BinaryTransformStamped[][],
  timeSecs: number
): BinaryTransformStamped => {
  const candidateNearestTransforms = [];
  // Find the index of the first block whose first element is >= `time`.
  // If such a block exists, its first transform might be nearest to `time`.
  const firstBlockAfterIndex = sortedLastIndexBy(frameBlocks, (timeSecs: any), (block) =>
    typeof block === "number" ? block : toSec(deepParse(block[0].header().stamp()))
  );
  candidateNearestTransforms.push(frameBlocks[firstBlockAfterIndex]?.[0]); // maybe null

  // In the block before (if it exists), find the index of the first transform >= `time`.
  // That message and the one before it (either may not exist) might be nearest to `time`.
  const blockBefore = frameBlocks[firstBlockAfterIndex - 1] ?? [];
  const firstMessageAfterIndex = sortedLastIndexBy(blockBefore, (timeSecs: any), (tf) =>
    typeof tf === "number" ? tf : toSec(deepParse(tf.header().stamp()))
  );
  candidateNearestTransforms.push(blockBefore[firstMessageAfterIndex]); // maybe null
  candidateNearestTransforms.push(blockBefore[firstMessageAfterIndex - 1]); // not null

  // Filter out nulls, and find the closest.
  return minBy(candidateNearestTransforms.filter(Boolean), (tf) =>
    Math.abs(timeSecs - toSec(deepParse(tf.header().stamp())))
  );
};

// Exported for tests.
export const findNearestTransformElementInBlocks = (
  frameBlocks: BinaryTransformStamped[][],
  timeSecs: number
): TransformElement => makeTransformElement(deepParse(findNearestTransformInBlocks(frameBlocks, timeSecs)));

const useDynamicTransformsNear = (time: Time, framesToIgnore: Set<string>): $ReadOnlyArray<TransformElement> => {
  const blocks = useBlocksByTopicWithFallback([$TF_STATIC, $TF]);
  const blockFrameIndex = React.useMemo(() => getBlockFrameIndex(blocks, framesToIgnore), [blocks, framesToIgnore]);
  const timeSecs = toSec(time);
  return React.useMemo(
    () =>
      Object.keys(blockFrameIndex).map((frameId) =>
        findNearestTransformElementInBlocks(blockFrameIndex[frameId], timeSecs)
      ),
    [blockFrameIndex, timeSecs]
  );
};

// Given a timestamp, find relevant transforms. Assumes transforms with a given frame id have
// monotonically increasing header stamps.
const useTransformsNear = (time: Time, staticTransformPath: ?string): TransformElement[] => {
  const hookStaticTransforms: TransformElement[] = useStaticTransformsData(staticTransformPath);
  const framesToIgnore = React.useMemo(
    () =>
      new Set(
        hookStaticTransforms
          .map((t) => t.childFrame)
          .concat(skipTransformFrame?.frameId)
          .filter(Boolean)
      ),
    [hookStaticTransforms]
  );
  const hookDynamicTransforms = useDynamicTransformsData() ?? NO_HOOK_TRANSFORMS;
  const dynamicTransforms = useDynamicTransformsNear(time, framesToIgnore);
  return React.useMemo(() => dynamicTransforms.concat(hookStaticTransforms, hookDynamicTransforms), [
    dynamicTransforms,
    hookStaticTransforms,
    hookDynamicTransforms,
  ]);
};

export default useTransformsNear;
