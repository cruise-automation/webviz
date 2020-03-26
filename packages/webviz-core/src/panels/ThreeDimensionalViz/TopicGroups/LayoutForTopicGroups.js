// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import React, {
  type Node,
  useMemo,
  useRef,
  useState,
  useReducer,
  useCallback,
  useLayoutEffect,
  useEffect,
} from "react";
import KeyListener from "react-key-listener";
import {
  PolygonBuilder,
  DrawPolygons,
  type CameraState,
  type ReglClickInfo,
  type MouseEventObject,
  type Polygon,
} from "regl-worldview";
import { type Time } from "rosbag";

import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import { Item } from "webviz-core/src/components/Menu";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import filterMap from "webviz-core/src/filterMap";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import useDataSourceInfo from "webviz-core/src/PanelAPI/useDataSourceInfo";
import DebugStats from "webviz-core/src/panels/ThreeDimensionalViz/DebugStats";
import { POLYGON_TAB_TYPE, type DrawingTabType } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools";
import MeasuringTool, { type MeasureInfo } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools/MeasuringTool";
import { type Save3DConfig, type ThreeDimensionalVizConfig } from "webviz-core/src/panels/ThreeDimensionalViz/index";
import { InteractionContextMenu } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import LayoutToolbar from "webviz-core/src/panels/ThreeDimensionalViz/LayoutToolbar";
import SceneBuilder from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import { useSearchText } from "webviz-core/src/panels/ThreeDimensionalViz/SearchText";
import { getUpdatedGlobalVariablesBySelectedObject } from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import TopicGroups from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/TopicGroups";
import { migratePanelConfigToTopicGroupConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsMigrations";
import { getSelectionsFromTopicGroupConfig } from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsUtils";
import { TOPIC_DISPLAY_MODES } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/TopicDisplayModeSelector";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import TransformsBuilder from "webviz-core/src/panels/ThreeDimensionalViz/TransformsBuilder";
import World from "webviz-core/src/panels/ThreeDimensionalViz/World";
import type { Frame, Topic } from "webviz-core/src/players/types";
import type { Extensions } from "webviz-core/src/reducers/extensions";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import { useShallowMemo } from "webviz-core/src/util/hooks";
import { videoRecordingMode } from "webviz-core/src/util/inAutomatedRunMode";
import { topicsByTopicName } from "webviz-core/src/util/selectors";

type EventName = "onDoubleClick" | "onMouseMove" | "onMouseDown" | "onMouseUp";
export type ClickedPosition = { clientX: number, clientY: number };

export type LayoutToolbarSharedProps = {|
  cameraState: $Shape<CameraState>,
  followOrientation: boolean,
  followTf?: string | false,
  onAlignXYAxis: () => void,
  onCameraStateChange: (CameraState) => void,
  onFollowChange: (followTf?: string | false, followOrientation?: boolean) => void,
  saveConfig: Save3DConfig,
  transforms: Transforms,
  isPlaying?: boolean,
|};

export type LayoutTopicSettingsSharedProps = {|
  transforms: Transforms,
  topics: Topic[],
  saveConfig: Save3DConfig,
|};

type Props = {|
  ...LayoutToolbarSharedProps,
  ...LayoutTopicSettingsSharedProps,
  children?: Node,
  cleared?: boolean,
  currentTime: Time,
  extensions: Extensions,
  frame?: Frame,
  helpContent: Node | string,
  isPlaying?: boolean,
  config: ThreeDimensionalVizConfig,
  saveConfig: Save3DConfig,
  setSubscriptions: (subscriptions: string[]) => void,
  topics: Topic[],
  transforms: Transforms,
|};

type SelectedObjectState = {
  clickedPosition: ClickedPosition,
  selectedObject: ?MouseEventObject, // to be set when clicked a single object or selected one of the clicked topics from the context menu
  selectedObjects: MouseEventObject[],
};

export type EditTopicState = { tooltipPosX: number, topic: Topic };

export default function LayoutForTopicGroups({
  cameraState,
  children,
  cleared,
  currentTime,
  extensions,
  followOrientation,
  followTf,
  frame,
  helpContent,
  isPlaying,
  onAlignXYAxis,
  onCameraStateChange,
  onFollowChange,
  saveConfig,
  topics,
  transforms,
  setSubscriptions,
  config,
  config: {
    autoTextBackgroundColor,
    enableShortDisplayNames,
    expandedNodes,
    checkedNodes,
    flattenMarkers,
    modifiedNamespaceTopics,
    pinTopics,
    selectedPolygonEditFormat = "yaml",
    showCrosshair,
    autoSyncCameraState,
    topicDisplayMode = TOPIC_DISPLAY_MODES.SHOW_TREE.value,
    topicSettings,
    topicGroups,
  },
}: Props) {
  const containerRef = useRef<?HTMLDivElement>();
  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  const { globalVariables, setGlobalVariables } = useGlobalVariables();
  const [debug, setDebug] = useState(false);
  const [showTopicGroups, setShowTopicGroups] = useState<boolean>(false);
  const [polygonBuilder, setPolygonBuilder] = useState(() => new PolygonBuilder());
  const [measureInfo, setMeasureInfo] = useState<MeasureInfo>({
    measureState: "idle",
    measurePoints: { start: undefined, end: undefined },
  });

  const searchTextProps = useSearchText();
  const { searchTextOpen, searchText, setSearchTextMatches, searchTextMatches, selectedMatchIndex } = searchTextProps;

  const migrateToTopicGroupConfig = useCallback(
    (topicGroupDisplayName?: string) => {
      const migratedTopicGroupConfig = migratePanelConfigToTopicGroupConfig({
        topicGroupDisplayName,
        checkedNodes,
        topicSettings,
        modifiedNamespaceTopics,
      });
      // Append newly migrated topic group config to existing config
      saveConfig({ topicGroups: (topicGroups || []).concat(migratedTopicGroupConfig) });
    },
    [checkedNodes, modifiedNamespaceTopics, saveConfig, topicGroups, topicSettings]
  );

  const [_, forceUpdate] = useReducer((x) => x + 1, 0); // used for updating DrawPolygon during mouse move
  const measuringElRef = useRef<?MeasuringTool>(null);
  const [drawingTabType, setDrawingTabType] = useState<?DrawingTabType>(undefined);
  const [selectedObjectState, setSelectedObjectState] = useState<?SelectedObjectState>(undefined);
  const selectedObject = selectedObjectState && selectedObjectState.selectedObject;

  useLayoutEffect(
    () => {
      if (!selectedObject) {
        return;
      }
      const newGlobalVariables = getUpdatedGlobalVariablesBySelectedObject(selectedObject, linkedGlobalVariables);
      if (newGlobalVariables) {
        setGlobalVariables(newGlobalVariables);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps, only update global variables when selectedObject changes
    [selectedObject]
  );

  // initialize the SceneBuilder and TransformsBuilder
  const { sceneBuilder, transformsBuilder } = useMemo(
    () => ({
      sceneBuilder: new SceneBuilder(),
      transformsBuilder: new TransformsBuilder(),
    }),
    []
  );

  const { selectedTopicNames, selectedNamespacesByTopic, selectedTopicSettingsByTopic } = useMemo(
    () => getSelectionsFromTopicGroupConfig(topicGroups || []),
    [topicGroups]
  );

  // update subscriptions whenever selected topics change, use deep compare to prevent updating when expanding/collapsing topics
  const memoizedSelectedTopics = useShallowMemo(selectedTopicNames);
  useEffect(() => setSubscriptions(memoizedSelectedTopics), [memoizedSelectedTopics, setSubscriptions]);
  const { playerId } = useDataSourceInfo();

  const rootTf = useMemo(
    () => {
      // TODO(Audrey): add tests for the clearing behavior
      if (cleared) {
        sceneBuilder.clear();
      }
      if (!frame) {
        return;
      }
      const rootTfID = transforms.rootOfTransform(
        followTf || getGlobalHooks().perPanelHooks().ThreeDimensionalViz.rootTransformFrame
      ).id;

      sceneBuilder.setPlayerId(playerId);
      sceneBuilder.setTransforms(transforms, rootTfID);
      sceneBuilder.setFlattenMarkers(!!flattenMarkers);
      sceneBuilder.setSelectedNamespacesByTopic(selectedNamespacesByTopic);
      sceneBuilder.setTopicSettings(selectedTopicSettingsByTopic);

      // toggle scene builder topics based on visible topic nodes in the tree
      const topicsByName = topicsByTopicName(topics);
      const selectedTopics = filterMap(memoizedSelectedTopics, (name) => topicsByName[name]);
      sceneBuilder.setTopics(selectedTopics);

      sceneBuilder.setGlobalVariables(globalVariables);
      sceneBuilder.setFrame(frame);
      sceneBuilder.setCurrentTime(currentTime);
      sceneBuilder.render();

      // update the transforms and set the selected ones to render
      transformsBuilder.setTransforms(transforms, rootTfID);
      transformsBuilder.setSelectedTransforms(selectedNamespacesByTopic["/tf"] || []);

      return rootTfID;
    },
    [
      cleared,
      currentTime,
      flattenMarkers,
      followTf,
      frame,
      globalVariables,
      playerId,
      sceneBuilder,
      selectedNamespacesByTopic,
      memoizedSelectedTopics,
      selectedTopicSettingsByTopic,
      topics,
      transforms,
      transformsBuilder,
    ]
  );

  const handleDrawPolygons = useCallback(
    (eventName: EventName, ev: MouseEvent, args: ?ReglClickInfo) => {
      polygonBuilder[eventName](ev, args);
      forceUpdate();
    },
    [polygonBuilder]
  );

  // use callbackInputsRef to prevent unnecessary callback changes
  const callbackInputsRef = useRef({
    cameraState,
    debug,
    drawingTabType,
    handleDrawPolygons,
    showTopicGroups,
    saveConfig,
    selectedObjectState,
    topics,
    autoSyncCameraState: !!autoSyncCameraState,
  });
  callbackInputsRef.current = {
    cameraState,
    debug,
    drawingTabType,
    handleDrawPolygons,
    showTopicGroups,
    saveConfig,
    selectedObjectState,
    topics,
    autoSyncCameraState: !!autoSyncCameraState,
  };

  const handleEvent = useCallback((eventName: EventName, ev: MouseEvent, args: ?ReglClickInfo) => {
    if (!args) {
      return;
    }
    const {
      drawingTabType: currentDrawingTabType,
      handleDrawPolygons: currentHandleDrawPolygons,
    } = callbackInputsRef.current;
    // $FlowFixMe get around index signature error
    const measuringHandler = measuringElRef.current && measuringElRef.current[eventName];
    const measureActive = measuringElRef.current && measuringElRef.current.measureActive;
    if (measuringHandler && measureActive) {
      return measuringHandler(ev, args);
    } else if (currentDrawingTabType === POLYGON_TAB_TYPE) {
      currentHandleDrawPolygons(eventName, ev, args);
    }
  }, []);

  const {
    onClick,
    onControlsOverlayClick,
    onDoubleClick,
    onExitTopicGroupFocus,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onClearSelectedObject,
    onSelectObject,
    onSetPolygons,
    toggleCameraMode,
    toggleDebug,
  } = useMemo(
    () => {
      return {
        onClick: (ev: MouseEvent, args: ?ReglClickInfo) => {
          const selectedObjects = (args && args.objects) || [];
          const clickedPosition = { clientX: ev.clientX, clientY: ev.clientY };
          if (selectedObjects.length === 0) {
            setSelectedObjectState(undefined);
          } else if (selectedObjects.length === 1) {
            // select the object directly if there is only one
            setSelectedObjectState({ selectedObject: selectedObjects[0], selectedObjects, clickedPosition });
          } else {
            // open up context menu to select one object to show details
            setSelectedObjectState({ selectedObject: undefined, selectedObjects, clickedPosition });
          }
        },
        onControlsOverlayClick: (ev: SyntheticMouseEvent<HTMLDivElement>) => {
          if (!containerRef.current) {
            return;
          }
          const target = ((ev.target: any): HTMLElement);
          // Only close if the click target is inside the panel, e.g. don't close when dropdown menus rendered in portals are clicked
          if (containerRef.current.contains(target)) {
            setShowTopicGroups(false);
          }
        },
        onDoubleClick: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onDoubleClick", ev, args),
        onExitTopicGroupFocus: (ev) => {
          if (containerRef.current) {
            containerRef.current.focus();
          }
        },
        onMouseDown: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onMouseDown", ev, args),
        onMouseMove: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onMouseMove", ev, args),
        onMouseUp: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onMouseUp", ev, args),
        onClearSelectedObject: () => setSelectedObjectState(undefined),
        onSelectObject: (selectedObj: MouseEventObject) =>
          setSelectedObjectState({ ...callbackInputsRef.current.selectedObjectState, selectedObject: selectedObj }),
        onSetPolygons: (polygons: Polygon[]) => setPolygonBuilder(new PolygonBuilder(polygons)),
        toggleDebug: () => setDebug(!callbackInputsRef.current.debug),
        toggleCameraMode: () => {
          const { cameraState: currentCameraState, saveConfig: currentSaveConfig } = callbackInputsRef.current;
          currentSaveConfig({ cameraState: { ...currentCameraState, perspective: !currentCameraState.perspective } });
          if (measuringElRef.current && currentCameraState.perspective) {
            measuringElRef.current.reset();
          }
        },
      };
    },
    [handleEvent]
  );

  const glTextEnabled = useExperimentalFeature("glText");
  const keyDownHandlers = useMemo(
    () => {
      const handlers: { [key: string]: (e: KeyboardEvent) => void } = {
        "3": () => {
          toggleCameraMode();
        },
        Escape: (e) => {
          e.preventDefault();
          setDrawingTabType(null);
          searchTextProps.toggleSearchTextOpen(false);
          if (document.activeElement && document.activeElement === containerRef.current) {
            document.activeElement.blur();
          }
        },
        t: (e) => {
          e.preventDefault();
          // Unpin before enabling keyboard toggle open/close.
          if (pinTopics) {
            saveConfig({ pinTopics: false });
            return;
          }
          setShowTopicGroups(!showTopicGroups);
        },
      };

      if (glTextEnabled) {
        handlers.f = (e: KeyboardEvent) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            searchTextProps.toggleSearchTextOpen(true);
            if (!searchTextProps.searchInputRef || !searchTextProps.searchInputRef.current) {
              return;
            }
            searchTextProps.searchInputRef.current.select();
          }
        };
      }
      return handlers;
    },
    [glTextEnabled, pinTopics, saveConfig, searchTextProps, showTopicGroups, toggleCameraMode]
  );

  const isDrawing = useMemo(
    () => (measuringElRef.current && measuringElRef.current.measureActive) || drawingTabType === POLYGON_TAB_TYPE,
    [drawingTabType]
  );

  const markerProviders = useMemo(() => extensions.markerProviders.concat([sceneBuilder, transformsBuilder]), [
    extensions.markerProviders,
    sceneBuilder,
    transformsBuilder,
  ]);

  const cursorType = isDrawing ? "crosshair" : "";

  const { MapComponent, videoRecordingStyle } = useMemo(
    () => ({
      MapComponent: getGlobalHooks().perPanelHooks().ThreeDimensionalViz.MapComponent,
      videoRecordingStyle: { visibility: videoRecordingMode() ? "hidden" : "visible" },
    }),
    []
  );

  const memoizedScene = useShallowMemo(sceneBuilder.getScene());
  const mapNamespaces = useShallowMemo(selectedNamespacesByTopic["/metadata"] || []);
  const mapElement = useMemo(
    () =>
      MapComponent && (
        <MapComponent
          extensions={mapNamespaces}
          scene={memoizedScene}
          debug={debug}
          perspective={!!cameraState.perspective}
        />
      ),
    [MapComponent, cameraState.perspective, debug, mapNamespaces, memoizedScene]
  );

  const availableTfs = useShallowMemo(transforms.values().map(({ id }) => id));

  return (
    <div
      ref={containerRef}
      onClick={onControlsOverlayClick}
      tabIndex={-1}
      className={styles.container}
      style={{ cursor: cursorType }}
      data-test="layout-for-topic-groups">
      <KeyListener keyDownHandlers={keyDownHandlers} />
      <PanelToolbar
        floating
        helpContent={helpContent}
        menuContent={
          <>
            <Item
              tooltip="Markers with 0 as z-value in pose or points are updated to have the z-value of the flattened base frame."
              icon={flattenMarkers ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
              onClick={() => saveConfig({ flattenMarkers: !flattenMarkers })}>
              Flatten markers
            </Item>
            <Item
              tooltip="Automatically apply dark/light background color to text."
              icon={autoTextBackgroundColor ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
              onClick={() => saveConfig({ autoTextBackgroundColor: !autoTextBackgroundColor })}>
              Auto Text Background
            </Item>
            <Item
              tooltip="Show shorter topic display names in topic groups."
              icon={enableShortDisplayNames ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
              onClick={() => saveConfig({ enableShortDisplayNames: !enableShortDisplayNames })}>
              Short topic display names
            </Item>
          </>
        }
      />
      <div style={{ ...videoRecordingStyle, position: "relative", width: "100%", height: "100%" }}>
        <TopicGroups
          availableTfs={availableTfs}
          availableTopics={topics}
          containerHeight={containerRef.current?.clientHeight || 400}
          enableShortDisplayNames={!!enableShortDisplayNames}
          onExitTopicGroupFocus={onExitTopicGroupFocus}
          onMigrateToTopicGroupConfig={migrateToTopicGroupConfig}
          pinTopics={pinTopics}
          saveConfig={saveConfig}
          sceneBuilder={sceneBuilder}
          setShowTopicGroups={setShowTopicGroups}
          showTopicGroups={showTopicGroups}
          topicGroupsConfig={topicGroups || []}
        />
      </div>
      <div className={styles.world}>
        <World
          key={`${callbackInputsRef.current.autoSyncCameraState ? "synced" : "not-synced"}`}
          autoTextBackgroundColor={!!autoTextBackgroundColor}
          cameraState={cameraState}
          isPlaying={!!isPlaying}
          markerProviders={markerProviders}
          onCameraStateChange={onCameraStateChange}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          searchTextOpen={searchTextOpen}
          searchText={searchText}
          setSearchTextMatches={setSearchTextMatches}
          searchTextMatches={searchTextMatches}
          selectedMatchIndex={selectedMatchIndex}>
          {mapElement}
          {children}
          <DrawPolygons>{polygonBuilder.polygons}</DrawPolygons>
          <div style={videoRecordingStyle}>
            <LayoutToolbar
              cameraState={cameraState}
              debug={debug}
              drawingTabType={drawingTabType}
              followOrientation={followOrientation}
              followTf={followTf}
              interactionData={selectedObject && selectedObject.object && selectedObject.object.interactionData}
              isDrawing={isDrawing}
              isPlaying={isPlaying}
              measureInfo={measureInfo}
              measuringElRef={measuringElRef}
              onAlignXYAxis={onAlignXYAxis}
              onCameraStateChange={onCameraStateChange}
              autoSyncCameraState={!!autoSyncCameraState}
              onClearSelectedObject={onClearSelectedObject}
              onFollowChange={onFollowChange}
              onSetDrawingTabType={setDrawingTabType}
              onSetPolygons={onSetPolygons}
              onToggleCameraMode={toggleCameraMode}
              onToggleDebug={toggleDebug}
              polygonBuilder={polygonBuilder}
              saveConfig={saveConfig}
              selectedObject={selectedObject}
              selectedPolygonEditFormat={selectedPolygonEditFormat}
              setMeasureInfo={setMeasureInfo}
              showCrosshair={showCrosshair}
              transforms={transforms}
              rootTf={rootTf}
              {...searchTextProps}
            />
          </div>
          {selectedObjectState &&
            selectedObjectState.selectedObjects.length > 1 &&
            !selectedObjectState.selectedObject && (
              <InteractionContextMenu
                clickedPosition={selectedObjectState.clickedPosition}
                onSelectObject={onSelectObject}
                selectedObjects={selectedObjectState.selectedObjects}
              />
            )}
          {process.env.NODE_ENV !== "production" && !inScreenshotTests() && debug && <DebugStats />}
        </World>
      </div>
    </div>
  );
}
