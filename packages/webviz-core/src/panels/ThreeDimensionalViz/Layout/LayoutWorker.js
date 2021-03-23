// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useMemo } from "react";
import { type CameraState, type Polygon, DrawPolygons } from "regl-worldview";
import type { Time } from "rosbag";
import shallowequal from "shallowequal";

import type { RenderResult } from "./types";
import type { GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { getIconName } from "webviz-core/src/panels/ThreeDimensionalViz/commands/OverlayProjector";
import { type LinkedGlobalVariables } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import { LayoutWorkerDataReceiver } from "webviz-core/src/panels/ThreeDimensionalViz/Layout/WorkerDataRpc";
import { type MeasurePoints } from "webviz-core/src/panels/ThreeDimensionalViz/MeasureMarker";
import SceneBuilder, {
  type SelectedNamespacesByTopic,
  type TopicSettingsCollection,
} from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import type { ThreeDimensionalVizHooks } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/types";
import useSceneBuilderAndTransformsData from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/useSceneBuilderAndTransformsData";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import TransformsBuilder from "webviz-core/src/panels/ThreeDimensionalViz/TransformsBuilder";
import { type GLTextMarker } from "webviz-core/src/panels/ThreeDimensionalViz/utils/searchTextUtils";
import { updateTransforms } from "webviz-core/src/panels/ThreeDimensionalViz/utils/transformsUtils";
import World from "webviz-core/src/panels/ThreeDimensionalViz/World";
import WorldContext, { type WorldContextType } from "webviz-core/src/panels/ThreeDimensionalViz/WorldContext";
import type { Frame, Topic } from "webviz-core/src/players/types";
import { deepParse, isBobject } from "webviz-core/src/util/binaryObjects";
import { TRANSFORM_TOPIC } from "webviz-core/src/util/globalConstants";
import { useShallowMemo, useChangeDetector } from "webviz-core/src/util/hooks";
import render from "webviz-core/src/util/NoopReactRenderer";
import Rpc from "webviz-core/src/util/Rpc";
import { setupWorker } from "webviz-core/src/util/RpcWorkerUtils";

export type OffscreenCanvas = HTMLCanvasElement;

type WorldRendererState = $ReadOnly<{|
  cameraState: CameraState,
  cleared: boolean,
  frame: Frame,
  isPlaying: boolean,
  isDemoMode: boolean,
  autoTextBackgroundColor: boolean,
  colorOverrideMarkerMatchers: any,
  currentTime: Time,
  diffModeEnabled: boolean,
  flattenMarkers: boolean,
  globalVariables: GlobalVariables,
  highlightMarkerMatchers: any,
  linkedGlobalVariables: LinkedGlobalVariables,
  playerId: string,
  rootTf: string,
  searchTextOpen: boolean,
  searchText: string,
  searchTextMatches: GLTextMarker[],
  selectedMatchIndex: number,
  selectedNamespacesByTopic: SelectedNamespacesByTopic,
  selectedTopics: Topic[],
  settingsByKey: TopicSettingsCollection,
  showCrosshair: boolean,
  transforms: Transforms, // TODO: Instantiate in WorldRenderer
  polygons: Polygon[],
  measurePoints: MeasurePoints,
  worldContextValue: WorldContextType,
|}>;

type WorldRendererCallbacks = $ReadOnly<{|
  setState: (WorldRendererState) => void,
  onMouseEvent: ({ e: any, mouseEventName: string }) => Promise<any>,
|}>;

type WorldInterfaceProps = $ReadOnly<{|
  canvas: OffscreenCanvas,
  registerCallbacks: (callbacks: WorldRendererCallbacks) => void,
  hooks: ThreeDimensionalVizHooks,
  onClick: any,
  onDoubleClick: any,
  onMouseDown: any,
  onMouseMove: any,
  onMouseUp: any,
  setOverlayIcons: any,
  setSearchTextMatches: any,
  setAvailableNsAndErrors: any,
|}>;

// Sets up props/state and communication callbacks between react and the imperative worker code.
function ReactWorldInterface(props: WorldInterfaceProps) {
  const worldRef = React.useRef();
  const [state, setState] = React.useState<?WorldRendererState>();
  const onMouseEvent = React.useCallback(({ e, mouseEventName }: { e: any, mouseEventName: string }) => {
    const world = worldRef.current;
    if (!world) {
      return Promise.reject("Not initialized");
    }

    return new Promise((resolve) => {
      // Make a fake mouse event so Worldview can handle it correctly
      world.handleOffscreenMouseEvent(
        {
          ...e,
          target: {
            ...props.canvas,
            getBoundingClientRect: () => ({
              top: e.clientTop,
              left: e.clientLeft,
            }),
          },
          persist: () => {},
          isPropagationStopped: () => false,
          resolve,
        },
        mouseEventName
      );
    });
  }, [props.canvas]);

  React.useEffect(() => {
    props.registerCallbacks({ setState, onMouseEvent });
  }, [props.registerCallbacks, setState, onMouseEvent, props]);

  if (!state) {
    return null;
  }
  return <WorldRenderer worldRef={worldRef} {...{ ...state, ...props }} />;
}

type WorldRendererProps = {|
  ...WorldInterfaceProps,
  ...WorldRendererState,
  worldRef: { current: any },
|};

function useMapElement(sceneBuilder: SceneBuilder, props: WorldRendererProps) {
  const { MapComponent } = props.hooks;
  const memoizedScene = useShallowMemo(sceneBuilder.getScene());
  const mapNamespaces = useShallowMemo(props.selectedNamespacesByTopic["/metadata"] ?? []);
  // TODO(steel): pass `debug` from main thread
  return React.useMemo(
    () =>
      MapComponent && (
        <MapComponent
          extensions={mapNamespaces}
          scene={memoizedScene}
          debug={false}
          perspective={!!props.cameraState.perspective}
          isDemoMode={props.isDemoMode}
        />
      ),
    [MapComponent, props.cameraState.perspective, props.isDemoMode, mapNamespaces, memoizedScene]
  );
}

function WorldRenderer(props: WorldRendererProps) {
  const {
    hooks,
    cleared,
    playerId,
    flattenMarkers,
    selectedNamespacesByTopic,
    settingsByKey,
    selectedTopics,
    globalVariables,
    linkedGlobalVariables,
    highlightMarkerMatchers,
    colorOverrideMarkerMatchers,
    currentTime,
    transforms,
    rootTf,
    frame,
    setAvailableNsAndErrors,
  } = props;

  const { sceneBuilder, transformsBuilder } = useMemo(
    () => ({
      sceneBuilder: new SceneBuilder(hooks),
      transformsBuilder: new TransformsBuilder(),
    }),
    [hooks]
  );

  if (cleared) {
    sceneBuilder.clear();
  }

  useMemo(() => {
    sceneBuilder.setPlayerId(playerId);
    sceneBuilder.setTransforms(transforms, rootTf);
    sceneBuilder.setFlattenMarkers(!!flattenMarkers);
    sceneBuilder.setSelectedNamespacesByTopic(selectedNamespacesByTopic);
    sceneBuilder.setSettingsByKey(settingsByKey);
    sceneBuilder.setTopics(selectedTopics);
    sceneBuilder.setGlobalVariables({ globalVariables, linkedGlobalVariables });
    sceneBuilder.setHighlightedMatchers(highlightMarkerMatchers);
    sceneBuilder.setColorOverrideMatchers(colorOverrideMarkerMatchers);
    sceneBuilder.setFrame(frame);
    sceneBuilder.setCurrentTime(currentTime);
    sceneBuilder.render();

    // update the transforms and set the selected ones to render
    transformsBuilder.setTransforms(transforms, rootTf);
    transformsBuilder.setSelectedTransforms(selectedNamespacesByTopic[TRANSFORM_TOPIC] || []);
  }, [
    colorOverrideMarkerMatchers,
    currentTime,
    flattenMarkers,
    frame,
    globalVariables,
    highlightMarkerMatchers,
    linkedGlobalVariables,
    playerId,
    rootTf,
    sceneBuilder,
    selectedNamespacesByTopic,
    selectedTopics,
    settingsByKey,
    transforms,
    transformsBuilder,
  ]);

  const staticallyAvailableNamespacesByTopic = useMemo(() => hooks.getStaticallyAvailableNamespacesByTopic(), [hooks]);
  const { availableNamespacesByTopic, sceneErrorsByKey } = useSceneBuilderAndTransformsData({
    playerId,
    sceneBuilder,
    staticallyAvailableNamespacesByTopic,
    transforms,
  });

  if (useChangeDetector([availableNamespacesByTopic, sceneErrorsByKey], true)) {
    setAvailableNsAndErrors(availableNamespacesByTopic, sceneErrorsByKey);
  }

  const mapElement = useMapElement(sceneBuilder, props);
  return (
    <WorldContext.Provider value={props.worldContextValue}>
      <World
        ref={props.worldRef}
        autoTextBackgroundColor={!!props.autoTextBackgroundColor}
        cameraState={props.cameraState}
        isPlaying={!!props.isPlaying}
        isDemoMode={props.isDemoMode}
        diffModeEnabled={props.diffModeEnabled}
        searchTextOpen={props.searchTextOpen}
        searchText={props.searchText}
        searchTextMatches={props.searchTextMatches}
        selectedMatchIndex={props.selectedMatchIndex}
        setSearchTextMatches={props.setSearchTextMatches}
        showCrosshair={props.showCrosshair}
        markerProviders={[sceneBuilder, transformsBuilder]}
        {...props}>
        {mapElement}
        <DrawPolygons>{props.polygons}</DrawPolygons>
      </World>
    </WorldContext.Provider>
  );
}

class LayoutWorker {
  canvas: OffscreenCanvas;
  hooks: any;
  playerId: string;
  hasChangedPlayerId: boolean;
  transforms: Transforms;
  rendererCallbacks: WorldRendererCallbacks;
  searchTextMatches: GLTextMarker[];
  availableTfs: any[];

  constructor(canvas, hooks, rpc) {
    this.canvas = canvas;
    this.hooks = hooks;
    this.playerId = "";
    this.hasChangedPlayerId = true;
    this.transforms = new Transforms();
    this.searchTextMatches = [];
    this.availableTfs = [];
    let iconDrawables = [];
    render(
      <ReactWorldInterface
        registerCallbacks={(callbacks) => {
          this.rendererCallbacks = callbacks;
        }}
        hooks={this.hooks}
        canvas={canvas}
        onClick={this._mouseEventHandler("onClick")}
        onDoubleClick={this._mouseEventHandler("onDoubleClick")}
        onMouseDown={this._mouseEventHandler("onMouseDown")}
        onMouseMove={this._mouseEventHandler("onMouseMove")}
        onMouseUp={this._mouseEventHandler("onMouseUp")}
        setOverlayIcons={({ renderItems, sceneBuilderDrawables }) => {
          iconDrawables = sceneBuilderDrawables;
          return rpc.send<void>("updateOverlayIcons", renderItems);
        }}
        setSearchTextMatches={this.setSearchTextMatches}
        setAvailableNsAndErrors={(availableNamespacesByTopic, errorsByTopic) =>
          rpc.send<void>("onAvailableNsAndErrors", { availableNamespacesByTopic, errorsByTopic })
        }
      />
    );
    new LayoutWorkerDataReceiver(rpc, this.renderFrame);
    rpc.receive("onMouseEvent", this.onMouseEvent);
    rpc.receive("getIconData", (name) => {
      const icon = iconDrawables.find((i) => getIconName(i) === name);
      if (!icon) {
        return;
      }
      const originalMessage = isBobject(icon.interactionData?.originalMessage)
        ? deepParse(icon.interactionData.originalMessage)
        : icon.interactionData.originalMessage;
      return { ...icon, interactionData: { ...icon.interactionData, originalMessage } };
    });
  }

  setSearchTextMatches = (markers: GLTextMarker[]) => {
    this.searchTextMatches = markers;
  };

  onMouseEvent = (props) => {
    return this.rendererCallbacks.onMouseEvent(props);
  };

  renderFrame = ({
    cleared,
    rootTf,
    playerId,
    flattenMarkers,
    frame,
    selectedNamespacesByTopic,
    settingsByKey,
    selectedTopics,
    globalVariables,
    linkedGlobalVariables,
    highlightMarkerMatchers,
    colorOverrideMarkerMatchers,
    currentTime,
    width,
    height,
    cameraState,
    isPlaying,
    isDemoMode,
    autoTextBackgroundColor,
    diffModeEnabled,
    searchTextOpen,
    searchText,
    selectedMatchIndex,
    showCrosshair,
    polygons,
    measurePoints,
    worldContextValue,
  }: $ReadOnly<{
    cleared: boolean,
    rootTf: string,
    playerId: string,
    flattenMarkers: boolean,
    frame: Frame,
    selectedNamespacesByTopic: SelectedNamespacesByTopic,
    settingsByKey: TopicSettingsCollection,
    selectedTopics: Topic[],
    globalVariables: GlobalVariables,
    linkedGlobalVariables: LinkedGlobalVariables,
    highlightMarkerMatchers: any,
    colorOverrideMarkerMatchers: any,
    currentTime: Time,
    width: number,
    height: number,
    cameraState: CameraState,
    isPlaying: boolean,
    isDemoMode: boolean,
    autoTextBackgroundColor: boolean,
    diffModeEnabled: boolean,
    searchTextOpen: boolean,
    searchText: string,
    selectedMatchIndex: number,
    showCrosshair: boolean,
    polygons: Polygon[],
    measurePoints: MeasurePoints,
    worldContextValue: WorldContextType,
  }>): RenderResult => {
    this.hasChangedPlayerId = !shallowequal(this.playerId, playerId);
    this.playerId = playerId;

    this.transforms = updateTransforms(
      this.transforms,
      frame,
      cleared,
      this.hooks.skipTransformFrame?.frameId,
      this.hooks.consumePose
    );

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.clientWidth = width;
    this.canvas.clientHeight = height;

    this.rendererCallbacks.setState({
      cameraState,
      cleared,
      colorOverrideMarkerMatchers,
      currentTime,
      flattenMarkers,
      frame,
      globalVariables,
      highlightMarkerMatchers,
      isPlaying,
      isDemoMode,
      linkedGlobalVariables,
      autoTextBackgroundColor,
      diffModeEnabled,
      playerId,
      rootTf,
      searchTextOpen,
      searchText,
      searchTextMatches: this.searchTextMatches,
      selectedMatchIndex,
      selectedNamespacesByTopic,
      selectedTopics,
      settingsByKey,
      showCrosshair,
      transforms: this.transforms,
      polygons,
      measurePoints,
      worldContextValue,
    });

    return {
      searchTextMatches: this.searchTextMatches,
    };
  };

  _mouseEventHandler = (eventName: string) => (e: any, args: any) => {
    const { clientX, clientY, resolve, ctrlKey } = e;
    const payload = { eventName, ev: { clientX, clientY, ctrlKey }, args };
    if (eventName === "onMouseUp") {
      // Worldview creates an additional `onClick` event if the mouse did not move in
      // between `mouseDown`/`mouseUp` events. In that case, we want to defer the
      // resolution for `onMouseUp` since `onClick` might include selected objects
      // and should be one resolving the promise.
      setTimeout(() => resolve(payload), 0);
    } else {
      resolve(payload);
    }
  };
}

export default function initLayoutWorker(hooks: ThreeDimensionalVizHooks) {
  if (global.postMessage && !global.onmessage) {
    const rpc = new Rpc(global);
    setupWorker(rpc);

    rpc.receive("initialize", ({ canvas }: { canvas: OffscreenCanvas }) => {
      new LayoutWorker(canvas, hooks, rpc);
    });
  }
}
