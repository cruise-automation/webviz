// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { vec3 } from "gl-matrix";
import hoistNonReactStatics from "hoist-non-react-statics";
import { omit } from "lodash";
import React, { type Node, useCallback } from "react";
import { hot } from "react-hot-loader/root";
import { useSelector } from "react-redux";
import { cameraStateSelectors, type CameraState, DEFAULT_CAMERA_STATE } from "regl-worldview";

import { FrameCompatibilityDEPRECATED } from "./FrameCompatibility";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelContext from "webviz-core/src/components/PanelContext";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import helpContent from "webviz-core/src/panels/ThreeDimensionalViz/index.help.md";
import Layout from "webviz-core/src/panels/ThreeDimensionalViz/Layout";
import type { TopicSettingsCollection } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import {
  getEquivalentOffsetsWithoutTarget,
  useComputedCameraState,
} from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import LayoutForTopicGroups from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/LayoutForTopicGroups";
import type { TopicGroupConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/types";
import { type TopicDisplayMode } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/TopicDisplayModeSelector";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import withTransforms from "webviz-core/src/panels/ThreeDimensionalViz/withTransforms";
import type { Frame, Topic } from "webviz-core/src/players/types";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { TRANSFORM_TOPIC } from "webviz-core/src/util/globalConstants";

export type ThreeDimensionalVizConfig = {
  enableShortDisplayNames?: boolean,
  enableTopicTree?: ?boolean,
  autoTextBackgroundColor?: boolean,
  cameraState: $Shape<CameraState>,
  followTf?: string | false,
  followOrientation?: boolean,
  modifiedNamespaceTopics?: string[],
  pinTopics: boolean,
  savedPropsVersion?: ?number, // eslint-disable-line react/no-unused-prop-types
  topicDisplayMode?: TopicDisplayMode,
  flattenMarkers?: boolean,
  selectedPolygonEditFormat?: "json" | "yaml",
  showCrosshair?: boolean,

  topicGroups?: TopicGroupConfig[],
  // TODO(Audrey): remove the 4 props below once topic groups is released
  // props to be replaced by topicGroups
  expandedNodes: string[],
  checkedNodes: string[],
  topicSettings: TopicSettingsCollection,
  // override topic group feature flag for screenshot test
  testShowTopicTree?: boolean,

  // legacy props
  hideMap?: ?boolean, // eslint-disable-line react/no-unused-prop-types
  useHeightMap?: ?boolean, // eslint-disable-line react/no-unused-prop-types
  follow?: boolean,
  autoSyncCameraState?: boolean,
};
export type Save3DConfig = SaveConfig<ThreeDimensionalVizConfig>;

export type Props = {
  cleared?: boolean,
  config: ThreeDimensionalVizConfig,
  frame: Frame,
  helpContent: Node | string,
  saveConfig: Save3DConfig,
  setSubscriptions: (subscriptions: string[]) => void,
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
    config: { autoSyncCameraState, followOrientation, followTf, testShowTopicTree },
  } = props;
  const extensions = useSelector((state) => state.extensions);
  const { updatePanelConfig } = React.useContext(PanelContext) || {};

  const currentTime = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => (activeData && activeData.currentTime) || { sec: 0, nsec: 0 }, [])
  );
  const isPlaying = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => !!(activeData && activeData.isPlaying), [])
  );

  const { cameraState, targetPose } = useComputedCameraState({
    currentCameraState: config.cameraState,
    followTf,
    followOrientation,
    transforms,
  });

  const onSetSubscriptions = useCallback(
    (subscriptions: string[]) => {
      setSubscriptions([
        ...getGlobalHooks().perPanelHooks().ThreeDimensionalViz.topics,
        TRANSFORM_TOPIC,
        ...subscriptions,
      ]);
    },
    [setSubscriptions]
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
      const {
        configCameraState,
        configFollowOrientation,
        configFollowTf,
        targetPose: currentTargetPose,
      } = callbackInputsRef.current;
      const newCameraState = { ...configCameraState };
      if (newFollowTf) {
        // When switching to follow orientation, adjust thetaOffset to preserve camera rotation.
        if (newFollowOrientation && !configFollowOrientation && currentTargetPose) {
          const heading = cameraStateSelectors.targetHeading({
            targetOrientation: currentTargetPose.targetOrientation,
          });
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
      } else if (configFollowTf && currentTargetPose) {
        // When unfollowing, preserve the camera position and orientation.
        Object.assign(
          newCameraState,
          getEquivalentOffsetsWithoutTarget(
            {
              targetOffset: configCameraState.targetOffset || DEFAULT_CAMERA_STATE.targetOffset,
              thetaOffset: configCameraState.thetaOffset || DEFAULT_CAMERA_STATE.thetaOffset,
            },
            currentTargetPose,
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
    (newCameraState) => {
      const newCameraStateObj = omit(newCameraState, ["target", "targetOrientation"]);
      if (autoSyncCameraState) {
        updatePanelConfig("3D Panel", (oldConfig) => ({ ...oldConfig, cameraState: newCameraStateObj }));
      } else {
        saveConfig({ cameraState: newCameraStateObj }, { keepLayoutInUrl: true });
      }
    },
    [autoSyncCameraState, saveConfig, updatePanelConfig]
  );

  // useImperativeHandle so consumer component (e.g.Follow stories) can call onFollowChange directly.
  React.useImperativeHandle(ref, (): any => ({ onFollowChange }));
  let enableTopicGrouping = !config.enableTopicTree;
  if (testShowTopicTree != null) {
    enableTopicGrouping = false;
  }
  // Default to topic tree in production if the config for `enableTopicTree` is not already set.
  if (config.enableTopicTree == null && process.env.NODE_ENV === "production") {
    enableTopicGrouping = false;
  }

  return (
    <>
      {enableTopicGrouping ? (
        <LayoutForTopicGroups
          cameraState={cameraState}
          config={config}
          cleared={cleared}
          currentTime={currentTime}
          extensions={extensions}
          followOrientation={!!followOrientation}
          followTf={followTf}
          frame={frame}
          helpContent={helpContent}
          isPlaying={isPlaying}
          onAlignXYAxis={onAlignXYAxis}
          onCameraStateChange={onCameraStateChange}
          onFollowChange={onFollowChange}
          saveConfig={saveConfig}
          topics={topics}
          transforms={transforms}
          setSubscriptions={onSetSubscriptions}
        />
      ) : (
        <Layout
          cameraState={cameraState}
          config={config}
          cleared={cleared}
          currentTime={currentTime}
          extensions={extensions}
          followOrientation={!!followOrientation}
          followTf={followTf}
          frame={frame}
          helpContent={helpContent}
          isPlaying={isPlaying}
          onAlignXYAxis={onAlignXYAxis}
          onCameraStateChange={onCameraStateChange}
          onFollowChange={onFollowChange}
          saveConfig={saveConfig}
          topics={topics}
          transforms={transforms}
          setSubscriptions={onSetSubscriptions}
        />
      )}
    </>
  );
};

BaseRenderer.displayName = "ThreeDimensionalViz";
BaseRenderer.panelType = "3D Panel";
BaseRenderer.defaultConfig = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.defaultConfig;

export const Renderer = hoistNonReactStatics(React.forwardRef<Props, typeof BaseRenderer>(BaseRenderer), BaseRenderer);

export default hot(Panel<ThreeDimensionalVizConfig>(FrameCompatibilityDEPRECATED(withTransforms(Renderer), [])));
