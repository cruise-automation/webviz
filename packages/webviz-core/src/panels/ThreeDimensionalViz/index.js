// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { vec3 } from "gl-matrix";
import hoistNonReactStatics from "hoist-non-react-statics";
import { omit } from "lodash";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import { useSelector } from "react-redux";
import { cameraStateSelectors, type CameraState, DEFAULT_CAMERA_STATE } from "regl-worldview";

import { FrameCompatibility } from "webviz-core/src/components/MessageHistory/FrameCompatibility";
import { useShallowMemo } from "webviz-core/src/components/MessageHistory/hooks";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import helpContent from "webviz-core/src/panels/ThreeDimensionalViz/index.help.md";
import Layout from "webviz-core/src/panels/ThreeDimensionalViz/Layout";
import type { TopicSettingsCollection } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import {
  getEquivalentOffsetsWithoutTarget,
  useComputedCameraState,
} from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import treeBuilder, { Selections } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/treeBuilder";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import withTransforms from "webviz-core/src/panels/ThreeDimensionalViz/withTransforms";
import type { Frame, Topic } from "webviz-core/src/players/types";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { TRANSFORM_TOPIC } from "webviz-core/src/util/globalConstants";

const { useState, useCallback, useEffect, useLayoutEffect } = React;

export type ThreeDimensionalVizConfig = {
  autoTextBackgroundColor?: boolean,
  checkedNodes: string[],
  expandedNodes: string[],
  cameraState: $Shape<CameraState>,
  followTf?: string | false,
  followOrientation?: boolean,
  topicSettings: TopicSettingsCollection,
  modifiedNamespaceTopics: string[],
  pinTopics: boolean,
  savedPropsVersion?: ?number, // eslint-disable-line react/no-unused-prop-types
  convexHullOpacity?: number,

  // legacy props
  hideMap?: ?boolean, // eslint-disable-line react/no-unused-prop-types
  useHeightMap?: ?boolean, // eslint-disable-line react/no-unused-prop-types
  follow?: boolean,
  flattenMarkers?: boolean,
  selectedPolygonEditFormat?: "json" | "yaml",
  showCrosshair?: boolean,
};

export type Props = {
  cleared?: boolean,
  config: ThreeDimensionalVizConfig,
  frame: Frame,
  helpContent: React.Node | string,
  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  setSubscriptions: (string[]) => void,
  topics: Topic[],
  transforms: Transforms,
};

const BaseRenderer = (props: Props, ref) => {
  const {
    cleared,
    config,
    frame,
    saveConfig,
    setSubscriptions,
    topics,
    transforms,
    config: {
      autoTextBackgroundColor,
      checkedNodes,
      convexHullOpacity,
      expandedNodes,
      followOrientation,
      followTf,
      modifiedNamespaceTopics,
      pinTopics,
      selectedPolygonEditFormat,
      showCrosshair,
      topicSettings,
    },
  } = props;
  const extensions = useSelector((state) => state.extensions);

  const currentTime = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => (activeData && activeData.currentTime) || { sec: 0, nsec: 0 }, [])
  );
  const isPlaying = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => !!(activeData && activeData.isPlaying), [])
  );

  const [selections, setSelections] = useState<Selections>(() => {
    // build a copy of the tree to determine which topics are initially active
    // subsequent updated will be done through Layout.js invoking `setSelections`
    const root = treeBuilder({
      checkedNodes,
      expandedNodes: [],
      modifiedNamespaceTopics: [],
      namespaces: [],
      topics,
      transforms: transforms.values(),
    });
    return root.getSelections();
  });

  const { cameraState, targetPose } = useComputedCameraState({
    currentCameraState: config.cameraState,
    followTf,
    followOrientation,
    transforms,
  });

  // update subscriptions whenever selected topics change, use deep compare to prevent updating when expanding/collapsing topics
  const memoizedSelectionTopics = useShallowMemo(selections.topics);
  useEffect(() => setSubscriptions(memoizedSelectionTopics), [memoizedSelectionTopics, setSubscriptions]);

  // update open source checked nodes
  useLayoutEffect(
    () => {
      const isOpenSource = checkedNodes.length === 1 && checkedNodes[0] === "name:Topics" && topics.length;
      if (isOpenSource) {
        const newCheckedNodes = isOpenSource ? checkedNodes.concat(topics.map((t) => t.name)) : checkedNodes;
        saveConfig({ checkedNodes: newCheckedNodes }, { keepLayoutInUrl: true });
      }
    },
    [checkedNodes, saveConfig, topics]
  );

  // use callbackInputsRef to make sure the input changes don't trigger `onFollowChange` or `onAlignXYAxis` to change
  const callbackInputsRef = React.useRef({
    cameraState,
    configCameraState: config.cameraState,
    targetPose,
    configFollowOrientation: config.followOrientation,
    configFollowTf: config.followTf,
  });
  callbackInputsRef.current = {
    cameraState,
    configCameraState: config.cameraState,
    targetPose,
    configFollowOrientation: config.followOrientation,
    configFollowTf: config.followTf,
  };
  const onFollowChange = useCallback(
    (newFollowTf?: string | false, newFollowOrientation?: boolean) => {
      const { configCameraState, configFollowOrientation, configFollowTf, targetPose } = callbackInputsRef.current;
      const newCameraState = { ...configCameraState };
      if (newFollowTf) {
        // When switching to follow orientation, adjust thetaOffset to preserve camera rotation.
        if (newFollowOrientation && !configFollowOrientation && targetPose) {
          const heading = cameraStateSelectors.targetHeading({ targetOrientation: targetPose.targetOrientation });
          newCameraState.targetOffset = vec3.rotateZ(
            [0, 0, 0],
            newCameraState.targetOffset || DEFAULT_CAMERA_STATE.targetOffset,
            [0, 0, 0],
            heading
          );
          newCameraState.thetaOffset -= heading;
        }
        // When following a frame for the first time, snap to the origin.
        if (!configFollowTf) {
          newCameraState.targetOffset = [0, 0, 0];
        }
      } else if (configFollowTf && targetPose) {
        // When unfollowing, preserve the camera position and orientation.
        Object.assign(
          newCameraState,
          getEquivalentOffsetsWithoutTarget(
            {
              targetOffset: configCameraState.targetOffset || DEFAULT_CAMERA_STATE.targetOffset,
              thetaOffset: configCameraState.thetaOffset || DEFAULT_CAMERA_STATE.thetaOffset,
            },
            targetPose,
            configFollowOrientation
          )
        );
      }
      saveConfig({ followTf: newFollowTf, followOrientation: newFollowOrientation, cameraState: newCameraState });
    },
    [saveConfig]
  );

  const onAlignXYAxis = useCallback(
    () =>
      saveConfig({
        followOrientation: false,
        cameraState: {
          ...omit(callbackInputsRef.current.cameraState, ["target", "targetOrientation"]),
          thetaOffset: 0,
        },
      }),
    [saveConfig]
  );

  const onCameraStateChange = useCallback(
    (newCameraState) =>
      saveConfig({ cameraState: omit(newCameraState, ["target", "targetOrientation"]) }, { keepLayoutInUrl: true }),
    [saveConfig]
  );

  // useImperativeHandle so consumer component (e.g.Follow stories) can call onFollowChange directly.
  React.useImperativeHandle(ref, (): any => ({ onFollowChange }));

  return (
    <Layout
      autoTextBackgroundColor={autoTextBackgroundColor}
      cameraState={cameraState}
      checkedNodes={checkedNodes}
      cleared={cleared}
      convexHullOpacity={convexHullOpacity}
      currentTime={currentTime}
      expandedNodes={expandedNodes}
      extensions={extensions}
      followOrientation={!!followOrientation}
      followTf={followTf}
      frame={frame}
      helpContent={helpContent}
      isPlaying={isPlaying}
      modifiedNamespaceTopics={modifiedNamespaceTopics}
      onAlignXYAxis={onAlignXYAxis}
      onCameraStateChange={onCameraStateChange}
      onFollowChange={onFollowChange}
      pinTopics={pinTopics}
      saveConfig={saveConfig}
      selectedPolygonEditFormat={selectedPolygonEditFormat || "yaml"}
      selections={selections}
      setSelections={setSelections}
      showCrosshair={!!showCrosshair}
      topics={topics}
      topicSettings={topicSettings}
      transforms={transforms}
    />
  );
};

BaseRenderer.displayName = "ThreeDimensionalViz";
BaseRenderer.panelType = "3D Panel";
BaseRenderer.defaultConfig = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.defaultConfig;

export const Renderer = hoistNonReactStatics(React.forwardRef<Props, typeof BaseRenderer>(BaseRenderer), BaseRenderer);

export default hot(
  Panel<ThreeDimensionalVizConfig>(
    FrameCompatibility(withTransforms(Renderer), [
      ...getGlobalHooks().perPanelHooks().ThreeDimensionalViz.topics,
      TRANSFORM_TOPIC,
    ])
  )
);
