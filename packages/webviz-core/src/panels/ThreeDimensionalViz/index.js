// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import hoistNonReactStatics from "hoist-non-react-statics";
import { omit } from "lodash";
import React, { type Node, useCallback } from "react";
import { hot } from "react-hot-loader/root";
import { useSelector } from "react-redux";
import { type CameraState } from "regl-worldview";

import { FrameCompatibilityDEPRECATED } from "./FrameCompatibility";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelContext from "webviz-core/src/components/PanelContext";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import helpContent from "webviz-core/src/panels/ThreeDimensionalViz/index.help.md";
import type { TopicSettingsCollection } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import {
  useComputedCameraState,
  getNewCameraStateOnFollowChange,
} from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import type { TopicGroupConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/types";
import { type TopicDisplayMode } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/TopicDisplayModeSelector";
import LayoutForTopicTreeV2 from "webviz-core/src/panels/ThreeDimensionalViz/TopicTreeV2/LayoutForTopicTreeV2";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import withTransforms from "webviz-core/src/panels/ThreeDimensionalViz/withTransforms";
import type { Frame, Topic } from "webviz-core/src/players/types";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { TRANSFORM_TOPIC, TRANSFORM_STATIC_TOPIC } from "webviz-core/src/util/globalConstants";

export type ThreeDimensionalVizConfig = {
  enableShortDisplayNames?: boolean,
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

  expandedKeys: string[],
  checkedKeys: string[],
  topicSettings: TopicSettingsCollection,
  autoSyncCameraState?: boolean,

  // legacy props
  hideMap?: ?boolean, // eslint-disable-line react/no-unused-prop-types
  useHeightMap?: ?boolean, // eslint-disable-line react/no-unused-prop-types
  follow?: boolean,
  topicGroups?: TopicGroupConfig[],
  checkedNodes?: string[],
  expandedNodes?: string[],
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
    config: { autoSyncCameraState, followOrientation, followTf },
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
        TRANSFORM_STATIC_TOPIC,
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
        configCameraState: prevCameraState,
        configFollowOrientation: prevFollowOrientation,
        configFollowTf: prevFollowTf,
        targetPose: prevTargetPose,
      } = callbackInputsRef.current;
      const newCameraState = getNewCameraStateOnFollowChange({
        prevCameraState,
        prevTargetPose,
        prevFollowTf,
        prevFollowOrientation,
        newFollowTf,
        newFollowOrientation,
      });
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

  return (
    <LayoutForTopicTreeV2
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
      targetPose={targetPose}
      transforms={transforms}
      setSubscriptions={onSetSubscriptions}
    />
  );
};

BaseRenderer.displayName = "ThreeDimensionalViz";
BaseRenderer.panelType = "3D Panel";
BaseRenderer.defaultConfig = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.defaultConfig;

export const Renderer = hoistNonReactStatics(React.forwardRef<Props, typeof BaseRenderer>(BaseRenderer), BaseRenderer);

export default hot(Panel<ThreeDimensionalVizConfig>(FrameCompatibilityDEPRECATED(withTransforms(Renderer), [])));
