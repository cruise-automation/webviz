// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import hoistNonReactStatics from "hoist-non-react-statics";
import { omit, debounce, isEqual } from "lodash";
import React, { useCallback, useMemo, useState, useRef } from "react";
import { hot } from "react-hot-loader/root";
import { type CameraState } from "regl-worldview";

import { FrameCompatibilityDEPRECATED } from "./FrameCompatibility";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelContext from "webviz-core/src/components/PanelContext";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import Layout from "webviz-core/src/panels/ThreeDimensionalViz/Layout";
import type { ColorOverrideBySourceIdxByVariable } from "webviz-core/src/panels/ThreeDimensionalViz/Layout";
import type { TopicSettingsCollection } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import {
  useTransformedCameraState,
  getNewCameraStateOnFollowChange,
} from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import { type TopicDisplayMode } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/TopicViewModeSelector";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import useTransformsNear from "webviz-core/src/panels/ThreeDimensionalViz/Transforms/useTransformsNear";
import type { Frame, Topic } from "webviz-core/src/players/types";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { useChangeDetector } from "webviz-core/src/util/hooks";

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
  // The message path syntax path to the static URDF transforms.
  // Currently set in the config but not editable in any UI.
  staticTransformPath?: string,
  sphericalRangeScale?: number,
  searchText?: string,
};
export type Save3DConfig = SaveConfig<ThreeDimensionalVizConfig>;

export type Props = {
  cleared?: boolean,
  config: ThreeDimensionalVizConfig,
  frame: Frame,
  saveConfig: Save3DConfig,
  setSubscriptions: (subscriptions: string[]) => void,
  topics: Topic[],
  transforms?: Transforms, // Provided in one story
};

const DEFAULT_TIME = { sec: 0, nsec: 0 };

const BaseRenderer = (props: Props, ref) => {
  const {
    cleared,
    config,
    frame,
    saveConfig,
    setSubscriptions,
    topics,
    config: { autoSyncCameraState, followOrientation, followTf },
  } = props;
  const { updatePanelConfig } = React.useContext(PanelContext) || {};

  const { currentTime, isPlaying } = useMessagePipeline(
    useCallback(
      ({ playerState: { activeData } }) => ({
        currentTime: (activeData && activeData.currentTime) || DEFAULT_TIME,
        isPlaying: !!(activeData && activeData.isPlaying),
      }),
      []
    )
  );

  // We use useState to store the cameraState instead of using config directly in order to
  // speed up the pan/rotate performance of the 3D panel. This allows us to update the cameraState
  // immediately instead of setting the new cameraState by dispatching a saveConfig.
  // eslint-disable-next-line prefer-const
  let [configCameraState, setConfigCameraState] = useState(config.cameraState);
  if (useChangeDetector([config.cameraState], false) && !isEqual(config.cameraState, configCameraState)) {
    // Sometimes camera state updates come by the slow path. Use the config value if that happens,
    // because _other_ config values might be updated at the same time, and we don't want to render
    // inconsistent local state.
    configCameraState = config.cameraState;
    setConfigCameraState(config.cameraState);
  }

  const transformElements = useTransformsNear(currentTime, config.staticTransformPath);
  const calculatedTransforms = useMemo(() => new Transforms(transformElements), [transformElements]);
  const transforms = props.transforms ?? calculatedTransforms;
  const { transformedCameraState, targetPose } = useTransformedCameraState({
    configCameraState,
    followTf,
    followOrientation,
    transforms,
  });

  const onSetSubscriptions = useCallback((subscriptions: string[]) => {
    setSubscriptions([
      ...getGlobalHooks().perPanelHooks().ThreeDimensionalViz.additionalSubscriptions,
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
BaseRenderer.shortcuts = [
  {
    description: "Toggle between 2D and 3D mode",
    keys: ["3"],
  },
  {
    description: "Move the camera forward / left / backward / right",
    keys: ["w", "a", "s", "d"],
  },
  {
    description: "Zoom in and out",
    keys: ["z", "x"],
  },
  {
    description: "Open topic tree",
    keys: ["t"],
  },
  {
    description: "Hold ctrl key and click on the canvas to start drawing polygons",
    keys: ["ctrl"],
  },
  {
    description: "Move the camera position parallel to the ground",
    keys: ["left", "drag"],
  },
  {
    description: "Pan and rotate the camera",
    keys: ["right", "drag"],
  },
];

export const Renderer = hoistNonReactStatics(React.forwardRef<Props, typeof BaseRenderer>(BaseRenderer), BaseRenderer);

export default hot(Panel<ThreeDimensionalVizConfig>(FrameCompatibilityDEPRECATED(Renderer, [])));
