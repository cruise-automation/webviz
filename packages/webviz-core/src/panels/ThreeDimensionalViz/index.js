// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import hoistNonReactStatics from "hoist-non-react-statics";
import { omit, debounce } from "lodash";
import React, { type Node, useCallback, useMemo, useState, useRef, useEffect } from "react";
import { hot } from "react-hot-loader/root";
import { type CameraState } from "regl-worldview";

import { FrameCompatibilityDEPRECATED } from "./FrameCompatibility";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelContext from "webviz-core/src/components/PanelContext";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import helpContent from "webviz-core/src/panels/ThreeDimensionalViz/index.help.md";
import type { TopicSettingsCollection } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import {
  useTransformedCameraState,
  getNewCameraStateOnFollowChange,
} from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import Layout from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/Layout";
import type { ColorOverrideBySourceIdxByVariable } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/Layout";
import { type TopicDisplayMode } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/TopicViewModeSelector";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import withTransforms from "webviz-core/src/panels/ThreeDimensionalViz/withTransforms";
import type { Frame, Topic } from "webviz-core/src/players/types";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { TRANSFORM_TOPIC, TRANSFORM_STATIC_TOPIC } from "webviz-core/src/util/globalConstants";

// The amount of time to wait before dispatching the saveConfig action to save the cameraState into the layout
export const CAMERA_STATE_UPDATE_DEBOUNCE_DELAY_MS = 250;

export type ThreeDimensionalVizConfig = {
  enableShortDisplayNames?: boolean,
  autoTextBackgroundColor?: boolean,
  cameraState: $Shape<CameraState>,
  followTf?: string | false,
  followOrientation?: boolean,
  modifiedNamespaceTopics?: string[],
  pinTopics: boolean,
  diffModeEnabled: boolean,
  topicDisplayMode?: TopicDisplayMode,
  flattenMarkers?: boolean,
  selectedPolygonEditFormat?: "json" | "yaml",
  showCrosshair?: boolean,

  expandedKeys: string[],
  checkedKeys: string[],
  settingsByKey: TopicSettingsCollection,
  autoSyncCameraState?: boolean,
  colorOverrideBySourceIdxByVariable?: ColorOverrideBySourceIdxByVariable,
  disableAutoOpenClickedObject?: boolean,
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
  const { updatePanelConfig } = React.useContext(PanelContext) || {};

  const currentTime = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => (activeData && activeData.currentTime) || { sec: 0, nsec: 0 }, [])
  );
  const isPlaying = useMessagePipeline(
    useCallback(({ playerState: { activeData } }) => !!(activeData && activeData.isPlaying), [])
  );

  // We use useState to store the cameraState instead of using config directly in order to
  // speed up the pan/rotate performance of the 3D panel. This allows us to update the cameraState
  // immediately instead of setting the new cameraState by dispatching a saveConfig.
  const [configCameraState, setConfigCameraState] = useState(config.cameraState);
  useEffect(() => setConfigCameraState(config.cameraState), [config]);

  const { transformedCameraState, targetPose } = useTransformedCameraState({
    configCameraState,
    followTf,
    followOrientation,
    transforms,
  });

  const onSetSubscriptions = useCallback((subscriptions: string[]) => {
    setSubscriptions([
      ...getGlobalHooks().perPanelHooks().ThreeDimensionalViz.topics,
      TRANSFORM_TOPIC,
      TRANSFORM_STATIC_TOPIC,
      ...subscriptions,
    ]);
  }, [setSubscriptions]);

  // use callbackInputsRef to make sure the input changes don't trigger `onFollowChange` or `onAlignXYAxis` to change
  const callbackInputsRef = useRef({
    transformedCameraState,
    configCameraState,
    targetPose,
    configFollowOrientation: config.followOrientation,
    configFollowTf: config.followTf,
  });
  callbackInputsRef.current = {
    transformedCameraState,
    configCameraState,
    targetPose,
    configFollowOrientation: config.followOrientation,
    configFollowTf: config.followTf,
  };
  const onFollowChange = useCallback((newFollowTf?: string | false, newFollowOrientation?: boolean) => {
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
  }, [saveConfig]);

  const onAlignXYAxis = useCallback(
    () =>
      saveConfig({
        followOrientation: false,
        cameraState: {
          ...omit(callbackInputsRef.current.transformedCameraState, ["target", "targetOrientation"]),
          thetaOffset: 0,
        },
      }),
    [saveConfig]
  );

  const saveCameraState = useCallback((newCameraStateObj) => saveConfig({ cameraState: newCameraStateObj }), [
    saveConfig,
  ]);
  const saveCameraStateDebounced = useMemo(() => debounce(saveCameraState, CAMERA_STATE_UPDATE_DEBOUNCE_DELAY_MS), [
    saveCameraState,
  ]);

  const onCameraStateChange = useCallback((newCameraState) => {
    const newCurrentCameraState = omit(newCameraState, ["target", "targetOrientation"]);
    setConfigCameraState(newCurrentCameraState);

    // If autoSyncCameraState is enabled, we can't wait for the debounce and need to call updatePanelConfig right away
    if (autoSyncCameraState) {
      updatePanelConfig("3D Panel", (oldConfig) => ({ ...oldConfig, cameraState: newCurrentCameraState }));
    } else {
      saveCameraStateDebounced(newCurrentCameraState);
    }
  }, [autoSyncCameraState, saveCameraStateDebounced, updatePanelConfig]);

  // useImperativeHandle so consumer component (e.g.Follow stories) can call onFollowChange directly.
  React.useImperativeHandle(ref, (): any => ({ onFollowChange }));

  return (
    <Layout
      cameraState={transformedCameraState}
      config={config}
      cleared={cleared}
      currentTime={currentTime}
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
