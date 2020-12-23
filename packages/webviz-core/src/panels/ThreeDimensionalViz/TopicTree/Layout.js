// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import { groupBy } from "lodash";
import React, { type Node, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Worldview,
  PolygonBuilder,
  DrawPolygons,
  type CameraState,
  type ReglClickInfo,
  type MouseEventObject,
  type Polygon,
} from "regl-worldview";
import { type Time } from "rosbag";
import { useDebouncedCallback } from "use-debounce";

import useTopicTree, { TopicTreeContext } from "./useTopicTree";
import Dimensions from "webviz-core/src/components/Dimensions";
import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import KeyListener from "webviz-core/src/components/KeyListener";
import { Item } from "webviz-core/src/components/Menu";
import Modal from "webviz-core/src/components/Modal";
import PanelContext from "webviz-core/src/components/PanelContext";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { RenderToBodyComponent } from "webviz-core/src/components/renderToBody";
import filterMap from "webviz-core/src/filterMap";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import useDataSourceInfo from "webviz-core/src/PanelAPI/useDataSourceInfo";
import { type Save3DConfig, type ThreeDimensionalVizConfig } from "webviz-core/src/panels/ThreeDimensionalViz";
import DebugStats from "webviz-core/src/panels/ThreeDimensionalViz/DebugStats";
import { POLYGON_TAB_TYPE, type DrawingTabType } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools";
import MeasuringTool, { type MeasureInfo } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools/MeasuringTool";
import { InteractionContextMenu, OBJECT_TAB_TYPE } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import LayoutToolbar from "webviz-core/src/panels/ThreeDimensionalViz/LayoutToolbar";
import SceneBuilder from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import { useSearchText } from "webviz-core/src/panels/ThreeDimensionalViz/SearchText";
import {
  type MarkerMatcher,
  ThreeDimensionalVizContext,
} from "webviz-core/src/panels/ThreeDimensionalViz/ThreeDimensionalVizContext";
import {
  type TargetPose,
  getInteractionData,
  getObject,
  getUpdatedGlobalVariablesBySelectedObject,
} from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import { ColorPickerSettingsPanel } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor/ColorPickerForTopicSettings";
import TopicSettingsModal from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/TopicSettingsModal";
import TopicTree from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/TopicTree";
import { TOPIC_DISPLAY_MODES } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/TopicViewModeSelector";
import useSceneBuilderAndTransformsData from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/useSceneBuilderAndTransformsData";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import TransformsBuilder from "webviz-core/src/panels/ThreeDimensionalViz/TransformsBuilder";
import World from "webviz-core/src/panels/ThreeDimensionalViz/World";
import type { Frame, Topic } from "webviz-core/src/players/types";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { Color } from "webviz-core/src/types/Messages";
import { getField } from "webviz-core/src/util/binaryObjects";
import { SECOND_SOURCE_PREFIX, TRANSFORM_TOPIC } from "webviz-core/src/util/globalConstants";
import { useShallowMemo } from "webviz-core/src/util/hooks";
import { inVideoRecordingMode } from "webviz-core/src/util/inAutomatedRunMode";
import { getTopicsByTopicName } from "webviz-core/src/util/selectors";
import { joinTopics } from "webviz-core/src/util/topicUtils";

const { sceneBuilderHooks } = getGlobalHooks().perPanelHooks().ThreeDimensionalViz;

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
  targetPose: ?TargetPose,
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
  frame?: Frame,
  helpContent: Node | string,
  isPlaying?: boolean,
  config: ThreeDimensionalVizConfig,
  saveConfig: Save3DConfig,
  setSubscriptions: (subscriptions: string[]) => void,
  topics: Topic[],
  transforms: Transforms,
|};

export type UserSelectionState = {
  // These objects are shown in the context menu
  clickedObjects: MouseEventObject[],
  // The x,y position used to position the context menu
  clickedPosition: ClickedPosition,
  // The object shown in the Interactions menu; also used to update global variables
  selectedObject: MouseEventObject | null,
};

export type EditTopicState = { tooltipPosX: number, topic: Topic };

type GlobalVariableName = string;
export type ColorOverride = {
  color: Color,
  active: boolean,
};
export type ColorOverrideBySourceIdxByVariable = {
  [GlobalVariableName]: ColorOverride[],
};

export default function Layout({
  cameraState,
  children,
  cleared,
  currentTime,
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
  targetPose,
  transforms,
  setSubscriptions,
  config: {
    autoTextBackgroundColor,
    checkedKeys,
    expandedKeys,
    flattenMarkers,
    modifiedNamespaceTopics,
    pinTopics,
    diffModeEnabled,
    selectedPolygonEditFormat = "yaml",
    showCrosshair,
    autoSyncCameraState,
    topicDisplayMode = TOPIC_DISPLAY_MODES.SHOW_ALL.value,
    settingsByKey,
    colorOverrideBySourceIdxByVariable,
    disableAutoOpenClickedObject,
  },
}: Props) {
  const [filterText, setFilterText] = useState(""); // Topic tree text for filtering to see certain topics.
  const containerRef = useRef<?HTMLDivElement>();
  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  const { globalVariables, setGlobalVariables } = useGlobalVariables();
  const [debug, setDebug] = useState(false);
  const [showTopicTree, setShowTopicTree] = useState<boolean>(false);
  const [polygonBuilder, setPolygonBuilder] = useState(() => new PolygonBuilder());
  const [measureInfo, setMeasureInfo] = useState<MeasureInfo>({
    measureState: "idle",
    measurePoints: { start: undefined, end: undefined },
  });
  const [currentEditingTopic, setCurrentEditingTopic] = useState<?Topic>(undefined);
  const [editingNamespace, setEditingNamespace] = useState<?{
    namespaceKey: string,
    namespaceColor: ?string,
  }>();

  const searchTextProps = useSearchText();
  const { searchTextOpen, searchText, setSearchTextMatches, searchTextMatches, selectedMatchIndex } = searchTextProps;
  // used for updating DrawPolygon during mouse move and scenebuilder namespace change.
  const [_, forceUpdate] = useReducer((x) => x + 1, 0);
  const measuringElRef = useRef<?MeasuringTool>(null);
  const [drawingTabType, setDrawingTabType] = useState<?DrawingTabType>(undefined);
  const [interactionsTabType, setInteractionsTabType] = useState<?DrawingTabType>(undefined);

  const [selectionState, setSelectionState] = useState<UserSelectionState>({
    clickedObjects: [],
    clickedPosition: { clientX: 0, clientY: 0 },
    selectedObject: null,
  });
  const { selectedObject, clickedObjects, clickedPosition } = selectionState;

  // Since the highlightedMarkerMatchers are updated by mouse events, we wait
  // a short amount of time to prevent excessive re-rendering of the 3D panel
  const [hoveredMarkerMatchers, setHoveredMarkerMatchers] = useState<MarkerMatcher[]>([]);
  const [setHoveredMarkerMatchersDebounced] = useDebouncedCallback(setHoveredMarkerMatchers, 100);

  const isDrawing = useMemo(() => measureInfo.measureState !== "idle" || drawingTabType === POLYGON_TAB_TYPE, [
    drawingTabType,
    measureInfo.measureState,
  ]);

  // initialize the SceneBuilder and TransformsBuilder
  const { sceneBuilder, transformsBuilder } = useMemo(
    () => ({
      sceneBuilder: new SceneBuilder(sceneBuilderHooks),
      transformsBuilder: new TransformsBuilder(),
    }),
    []
  );

  // Ensure that we show new namespaces and errors any time scenebuilder adds them.
  useMemo(() => {
    sceneBuilder.setOnForceUpdate(forceUpdate);
  }, [sceneBuilder, forceUpdate]);

  const {
    blacklistTopicsSet,
    topicTreeConfig,
    staticallyAvailableNamespacesByTopic,
    supportedMarkerDatatypesSet,
    defaultTopicSettings,
    uncategorizedGroupName,
  } = useMemo(
    () => ({
      blacklistTopicsSet: new Set(getGlobalHooks().perPanelHooks().ThreeDimensionalViz.BLACKLIST_TOPICS),
      supportedMarkerDatatypesSet: new Set(
        Object.values(getGlobalHooks().perPanelHooks().ThreeDimensionalViz.SUPPORTED_MARKER_DATATYPES)
      ),
      topicTreeConfig: getGlobalHooks()
        .startupPerPanelHooks()
        .ThreeDimensionalViz.getDefaultTopicTree(),
      staticallyAvailableNamespacesByTopic: getGlobalHooks()
        .startupPerPanelHooks()
        .ThreeDimensionalViz.getStaticallyAvailableNamespacesByTopic(),
      defaultTopicSettings: getGlobalHooks()
        .startupPerPanelHooks()
        .ThreeDimensionalViz.getDefaultSettings(),
      uncategorizedGroupName: getGlobalHooks().perPanelHooks().ThreeDimensionalViz.ungroupedNodesCategory,
    }),
    []
  );

  const { availableNamespacesByTopic, sceneErrorsByKey: sceneErrorsByTopicKey } = useSceneBuilderAndTransformsData({
    sceneBuilder,
    staticallyAvailableNamespacesByTopic,
    transforms,
  });

  // Use deep compare so that we only regenerate rootTreeNode when topics change.
  const memoizedTopics = useShallowMemo(topics);
  // Only show topics with supported datatype and that are not blacklisted as available in topic tree.
  const topicTreeTopics = useMemo(
    () =>
      memoizedTopics.filter(
        (topic) => supportedMarkerDatatypesSet.has(topic.datatype) && !blacklistTopicsSet.has(topic.name)
      ),
    [blacklistTopicsSet, memoizedTopics, supportedMarkerDatatypesSet]
  );

  const topicTreeData = useTopicTree({
    availableNamespacesByTopic,
    checkedKeys,
    defaultTopicSettings,
    expandedKeys,
    filterText,
    modifiedNamespaceTopics: modifiedNamespaceTopics || [],
    providerTopics: topicTreeTopics,
    saveConfig,
    sceneErrorsByTopicKey,
    topicDisplayMode,
    settingsByKey,
    topicTreeConfig,
    uncategorizedGroupName,
  });
  const {
    allKeys,
    derivedCustomSettingsByKey,
    getIsNamespaceCheckedByDefault,
    getIsTreeNodeVisibleInScene,
    getIsTreeNodeVisibleInTree,
    hasFeatureColumn,
    onNamespaceOverrideColorChange,
    rootTreeNode,
    sceneErrorsByKey,
    selectedNamespacesByTopic,
    selectedTopicNames,
    shouldExpandAllKeys,
    visibleTopicsCountByKey,
    toggleNamespaceChecked,
  } = topicTreeData;

  useEffect(() => setSubscriptions(selectedTopicNames), [selectedTopicNames, setSubscriptions]);
  const { playerId } = useDataSourceInfo();

  // If a user selects a marker or hovers over a TopicPicker row, highlight relevant markers
  const highlightMarkerMatchers = useMemo(() => {
    if (isDrawing) {
      return [];
    }
    if (hoveredMarkerMatchers.length > 0) {
      return hoveredMarkerMatchers;
    }
    // Highlight the selected object if the interactionsTab popout is open
    if (selectedObject && !!interactionsTabType) {
      const marker = getObject(selectedObject);
      const topic = getInteractionData(selectedObject)?.topic;
      return marker && topic
        ? [
            {
              topic,
              checks: [
                {
                  markerKeyPath: ["id"],
                  value: getField(marker, "id"),
                },
                {
                  markerKeyPath: ["ns"],
                  value: getField(marker, "ns"),
                },
              ],
            },
          ]
        : [];
    }
    return [];
  }, [hoveredMarkerMatchers, interactionsTabType, isDrawing, selectedObject]);

  const colorOverrideMarkerMatchers = useMemo(() => {
    // Transform linkedGlobalVariables and overridesByGlobalVariable into markerMatchers for SceneBuilder
    const linkedGlobalVariablesByName = groupBy(linkedGlobalVariables, ({ name }) => name);
    return Object.keys(colorOverrideBySourceIdxByVariable || {}).reduce((_activeColorOverrideMatchers, name) => {
      return (colorOverrideBySourceIdxByVariable?.[name] || []).flatMap((override, i) =>
        override?.active
          ? [
              ..._activeColorOverrideMatchers,
              ...(linkedGlobalVariablesByName[name] || []).map(({ topic, markerKeyPath }) => {
                const baseTopic = topic.replace(SECOND_SOURCE_PREFIX, "");
                return {
                  topic: i === 0 ? baseTopic : joinTopics(SECOND_SOURCE_PREFIX, baseTopic),
                  checks: [
                    {
                      markerKeyPath,
                      value: globalVariables[name],
                    },
                  ],
                  color: override.color,
                };
              }),
            ]
          : _activeColorOverrideMatchers
      );
    }, []);
  }, [colorOverrideBySourceIdxByVariable, globalVariables, linkedGlobalVariables]);

  const rootTf = useMemo(
    () =>
      frame &&
      transforms.rootOfTransform(followTf || getGlobalHooks().perPanelHooks().ThreeDimensionalViz.rootTransformFrame)
        .id,
    [frame, transforms, followTf]
  );

  useMemo(() => {
    // TODO(Audrey): add tests for the clearing behavior
    if (cleared) {
      sceneBuilder.clear();
    }
    if (!frame || !rootTf) {
      return;
    }
    // Toggle scene builder topics based on visible topic nodes in the tree
    const topicsByTopicName = getTopicsByTopicName(topics);
    const selectedTopics = filterMap(selectedTopicNames, (name) => topicsByTopicName[name]);

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
    cleared,
    frame,
    topics,
    selectedTopicNames,
    sceneBuilder,
    playerId,
    transforms,
    rootTf,
    flattenMarkers,
    selectedNamespacesByTopic,
    settingsByKey,
    globalVariables,
    linkedGlobalVariables,
    highlightMarkerMatchers,
    colorOverrideMarkerMatchers,
    currentTime,
    transformsBuilder,
  ]);

  const handleDrawPolygons = useCallback((eventName: EventName, ev: MouseEvent, args: ?ReglClickInfo) => {
    polygonBuilder[eventName](ev, args);
    forceUpdate();
  }, [polygonBuilder]);

  // use callbackInputsRef to prevent unnecessary callback changes
  const callbackInputsRef = useRef({
    cameraState,
    debug,
    drawingTabType,
    handleDrawPolygons,
    showTopicTree,
    saveConfig,
    selectionState,
    topics,
    autoSyncCameraState: !!autoSyncCameraState,
    isDrawing,
  });
  callbackInputsRef.current = {
    cameraState,
    debug,
    drawingTabType,
    handleDrawPolygons,
    showTopicTree,
    saveConfig,
    selectionState,
    topics,
    autoSyncCameraState: !!autoSyncCameraState,
    isDrawing,
  };

  const setColorOverrideBySourceIdxByVariable = useCallback((_colorOverrideBySourceIdxByVariable) => {
    callbackInputsRef.current.saveConfig({ colorOverrideBySourceIdxByVariable: _colorOverrideBySourceIdxByVariable });
  }, []);

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

  const updateGlobalVariablesFromSelection = useCallback((newSelectedObject: MouseEventObject) => {
    if (newSelectedObject) {
      const newGlobalVariables = getUpdatedGlobalVariablesBySelectedObject(newSelectedObject, linkedGlobalVariables);
      if (newGlobalVariables) {
        setGlobalVariables(newGlobalVariables);
      }
    }
  }, [linkedGlobalVariables, setGlobalVariables]);

  // Auto open/close the tab when the selectedObject changes as long as
  // we aren't drawing or the disableAutoOpenClickedObject setting is enabled.
  const updateInteractionsTabVisibility = useCallback((newSelectedObject: ?MouseEventObject) => {
    if (!isDrawing) {
      const shouldBeOpen = newSelectedObject && !disableAutoOpenClickedObject;
      setInteractionsTabType(shouldBeOpen ? OBJECT_TAB_TYPE : null);
    }
  }, [disableAutoOpenClickedObject, isDrawing]);

  const selectObject = useCallback((newSelectedObject: ?MouseEventObject) => {
    setSelectionState({ ...callbackInputsRef.current.selectionState, selectedObject: newSelectedObject });
    updateInteractionsTabVisibility(newSelectedObject);
    updateGlobalVariablesFromSelection(newSelectedObject);
  }, [updateInteractionsTabVisibility, updateGlobalVariablesFromSelection]);

  const {
    onClick,
    onControlsOverlayClick,
    onDoubleClick,
    onExitTopicTreeFocus,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onSetPolygons,
    toggleCameraMode,
    toggleDebug,
  } = useMemo(() => {
    return {
      onClick: (ev: MouseEvent, args: ?ReglClickInfo) => {
        // Don't set any clicked objects when measuring distance or drawing polygons.
        if (callbackInputsRef.current.isDrawing) {
          return;
        }
        const newClickedObjects = (args && args.objects) || [];
        const newClickedPosition = { clientX: ev.clientX, clientY: ev.clientY };
        const newSelectedObject = newClickedObjects.length === 1 ? newClickedObjects[0] : null;

        // Select the object directly if there is only one or open up context menu if there are many.
        setSelectionState({
          ...callbackInputsRef.current.selectionState,
          clickedObjects: newClickedObjects,
          clickedPosition: newClickedPosition,
        });
        selectObject(newSelectedObject);
      },
      onControlsOverlayClick: (ev: SyntheticMouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) {
          return;
        }
        const target = ((ev.target: any): HTMLElement);
        // Only close if the click target is inside the panel, e.g. don't close when dropdown menus rendered in portals are clicked
        if (containerRef.current.contains(target)) {
          setShowTopicTree(false);
        }
      },
      onDoubleClick: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onDoubleClick", ev, args),
      onExitTopicTreeFocus: () => {
        if (containerRef.current) {
          containerRef.current.focus();
        }
      },
      onMouseDown: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onMouseDown", ev, args),
      onMouseMove: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onMouseMove", ev, args),
      onMouseUp: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onMouseUp", ev, args),
      onSetPolygons: (polygons: Polygon[]) => setPolygonBuilder(new PolygonBuilder(polygons)),
      toggleDebug: () => setDebug(!callbackInputsRef.current.debug),
      toggleCameraMode: () => {
        const { cameraState: currentCameraState, saveConfig: currentSaveConfig } = callbackInputsRef.current;
        const newPerspective = !currentCameraState.perspective;
        currentSaveConfig({ cameraState: { ...currentCameraState, perspective: newPerspective } });
        if (measuringElRef.current && currentCameraState.perspective) {
          measuringElRef.current.reset();
        }
        // Automatically enable/disable map height based on 3D/2D mode
        const mapHeightEnabled = (selectedNamespacesByTopic["/metadata"] || []).includes("height");
        if (mapHeightEnabled !== newPerspective) {
          toggleNamespaceChecked({
            topicName: "/metadata",
            namespace: "height",
            columnIndex: 0,
          });
        }
      },
    };
  }, [handleEvent, selectObject, selectedNamespacesByTopic, toggleNamespaceChecked]);

  // When the TopicTree is hidden, focus the <World> again so keyboard controls continue to work
  const worldRef = useRef<?typeof Worldview>(null);
  useEffect(() => {
    if (!showTopicTree && worldRef.current) {
      worldRef.current.focus();
    }
  }, [showTopicTree]);

  const keyDownHandlers = useMemo(() => {
    const handlers: { [key: string]: (e: KeyboardEvent) => void } = {
      "3": () => {
        toggleCameraMode();
      },
      Escape: (e) => {
        e.preventDefault();
        setShowTopicTree(false);
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
        setShowTopicTree((shown) => !shown);
      },
      f: (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          searchTextProps.toggleSearchTextOpen(true);
          if (!searchTextProps.searchInputRef || !searchTextProps.searchInputRef.current) {
            return;
          }
          searchTextProps.searchInputRef.current.select();
        }
      },
    };
    return handlers;
  }, [pinTopics, saveConfig, searchTextProps, toggleCameraMode]);

  const markerProviders = useMemo(() => [sceneBuilder, transformsBuilder], [sceneBuilder, transformsBuilder]);

  const cursorType = isDrawing ? "crosshair" : "";
  const { isHovered } = useContext(PanelContext) || {};
  const isDemoMode = useExperimentalFeature("demoMode");
  const isHidden = isDemoMode && !isHovered;
  const DemoModeComponent = getGlobalHooks().getDemoModeComponent();

  const { MapComponent, videoRecordingStyle } = useMemo(
    () => ({
      MapComponent: getGlobalHooks().perPanelHooks().ThreeDimensionalViz.MapComponent,
      videoRecordingStyle: { visibility: inVideoRecordingMode() ? "hidden" : "visible" },
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
          isDemoMode={isDemoMode}
        />
      ),
    [MapComponent, cameraState.perspective, debug, isDemoMode, mapNamespaces, memoizedScene]
  );

  // Memoize the threeDimensionalVizContextValue to avoid returning a new object every time
  const threeDimensionalVizContextValue = useMemo(
    () => ({
      setColorOverrideBySourceIdxByVariable,
      setHoveredMarkerMatchers: setHoveredMarkerMatchersDebounced,
      colorOverrideBySourceIdxByVariable: colorOverrideBySourceIdxByVariable || {},
    }),
    [colorOverrideBySourceIdxByVariable, setColorOverrideBySourceIdxByVariable, setHoveredMarkerMatchersDebounced]
  );

  return (
    <ThreeDimensionalVizContext.Provider value={threeDimensionalVizContextValue}>
      <TopicTreeContext.Provider value={topicTreeData}>
        <div
          ref={containerRef}
          onClick={onControlsOverlayClick}
          tabIndex={-1}
          className={styles.container}
          style={{ cursor: cursorType }}
          data-test="3dviz-layout">
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
              </>
            }
          />
          <div style={{ position: "absolute", width: "100%", height: "100%" }}>
            {isDemoMode && DemoModeComponent && <DemoModeComponent />}
            <div style={{ ...videoRecordingStyle, position: "relative", width: "100%", height: "100%" }}>
              {(!isDemoMode || (isDemoMode && isHovered)) && (
                <Dimensions>
                  {({ width: containerWidth, height: containerHeight }) => (
                    <TopicTree
                      allKeys={allKeys}
                      availableNamespacesByTopic={availableNamespacesByTopic}
                      checkedKeys={checkedKeys}
                      containerHeight={containerHeight}
                      containerWidth={containerWidth}
                      derivedCustomSettingsByKey={derivedCustomSettingsByKey}
                      expandedKeys={expandedKeys}
                      filterText={filterText}
                      getIsNamespaceCheckedByDefault={getIsNamespaceCheckedByDefault}
                      getIsTreeNodeVisibleInScene={getIsTreeNodeVisibleInScene}
                      getIsTreeNodeVisibleInTree={getIsTreeNodeVisibleInTree}
                      hasFeatureColumn={hasFeatureColumn}
                      isPlaying={isPlaying}
                      onExitTopicTreeFocus={onExitTopicTreeFocus}
                      onNamespaceOverrideColorChange={onNamespaceOverrideColorChange}
                      pinTopics={pinTopics}
                      diffModeEnabled={diffModeEnabled}
                      rootTreeNode={rootTreeNode}
                      saveConfig={saveConfig}
                      sceneErrorsByKey={sceneErrorsByKey}
                      setCurrentEditingTopic={setCurrentEditingTopic}
                      setEditingNamespace={setEditingNamespace}
                      setFilterText={setFilterText}
                      setShowTopicTree={setShowTopicTree}
                      shouldExpandAllKeys={shouldExpandAllKeys}
                      showTopicTree={showTopicTree}
                      topicDisplayMode={topicDisplayMode}
                      visibleTopicsCountByKey={visibleTopicsCountByKey}
                    />
                  )}
                </Dimensions>
              )}
              {currentEditingTopic && (
                <TopicSettingsModal
                  currentEditingTopic={currentEditingTopic}
                  hasFeatureColumn={hasFeatureColumn}
                  setCurrentEditingTopic={setCurrentEditingTopic}
                  sceneBuilderMessage={
                    sceneBuilder.collectors[currentEditingTopic.name] &&
                    sceneBuilder.collectors[currentEditingTopic.name].getMessages()[0]
                  }
                  saveConfig={saveConfig}
                  settingsByKey={settingsByKey}
                />
              )}
              {editingNamespace && (
                <RenderToBodyComponent>
                  <Modal
                    onRequestClose={() => setEditingNamespace(undefined)}
                    contentStyle={{
                      maxHeight: "calc(100vh - 200px)",
                      maxWidth: 480,
                      display: "flex",
                      flexDirection: "column",
                    }}>
                    <ColorPickerSettingsPanel
                      color={settingsByKey[editingNamespace.namespaceKey]?.overrideColor}
                      onChange={(newColor) => onNamespaceOverrideColorChange(newColor, editingNamespace.namespaceKey)}
                    />
                  </Modal>
                </RenderToBodyComponent>
              )}
            </div>
          </div>
          <div className={styles.world}>
            <World
              key={`${callbackInputsRef.current.autoSyncCameraState ? "synced" : "not-synced"}`}
              autoTextBackgroundColor={!!autoTextBackgroundColor}
              cameraState={cameraState}
              isPlaying={!!isPlaying}
              isDemoMode={isDemoMode}
              markerProviders={markerProviders}
              onCameraStateChange={onCameraStateChange}
              diffModeEnabled={hasFeatureColumn && diffModeEnabled}
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
                  interactionsTabType={interactionsTabType}
                  setInteractionsTabType={setInteractionsTabType}
                  debug={debug}
                  followOrientation={followOrientation}
                  followTf={followTf}
                  isPlaying={isPlaying}
                  measureInfo={measureInfo}
                  measuringElRef={measuringElRef}
                  onAlignXYAxis={onAlignXYAxis}
                  onCameraStateChange={onCameraStateChange}
                  autoSyncCameraState={!!autoSyncCameraState}
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
                  targetPose={targetPose}
                  transforms={transforms}
                  rootTf={rootTf}
                  isHidden={isHidden}
                  {...searchTextProps}
                />
              </div>
              {clickedObjects.length > 1 && !selectedObject && (
                <InteractionContextMenu
                  clickedPosition={clickedPosition}
                  clickedObjects={clickedObjects}
                  selectObject={selectObject}
                />
              )}
              {process.env.NODE_ENV !== "production" && !inScreenshotTests() && debug && <DebugStats />}
            </World>
          </div>
        </div>
      </TopicTreeContext.Provider>
    </ThreeDimensionalVizContext.Provider>
  );
}
