// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { get, difference } from "lodash";
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

import type { ThreeDimensionalVizConfig } from ".";
import { useShallowMemo } from "webviz-core/src/components/MessageHistory/hooks";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import filterMap from "webviz-core/src/filterMap";
import useGlobalVariables, { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import DebugStats from "webviz-core/src/panels/ThreeDimensionalViz/DebugStats";
import { POLYGON_TAB_TYPE, type DrawingTabType } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools";
import MeasuringTool, { type MeasureInfo } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools/MeasuringTool";
import { InteractionContextMenu } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions";
import useLinkedGlobalVariables, {
  type LinkedGlobalVariables,
} from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import LayoutToolbar from "webviz-core/src/panels/ThreeDimensionalViz/LayoutToolbar";
import LayoutTopicSettings from "webviz-core/src/panels/ThreeDimensionalViz/LayoutTopicSettings";
import SceneBuilder, { type TopicSettingsCollection } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import TopicSelector from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector";
import { type TopicDisplayMode } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/TopicDisplayModeSelector";
import treeBuilder from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/treeBuilder";
import { canEditDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import { getTopicConfig } from "webviz-core/src/panels/ThreeDimensionalViz/topicTreeUtils";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import TransformsBuilder from "webviz-core/src/panels/ThreeDimensionalViz/TransformsBuilder";
import World from "webviz-core/src/panels/ThreeDimensionalViz/World";
import type { Frame, Topic } from "webviz-core/src/players/types";
import type { Extensions } from "webviz-core/src/reducers/extensions";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { videoRecordingMode } from "webviz-core/src/util/inAutomatedRunMode";
import { topicsByTopicName } from "webviz-core/src/util/selectors";

type EventName = "onDoubleClick" | "onMouseMove" | "onMouseDown" | "onMouseUp";
export type ClickedPosition = { clientX: number, clientY: number };

function getUpdatedGlobalVariablesBySelectedObject(
  selectedObject: MouseEventObject,
  linkedGlobalVariables: LinkedGlobalVariables
): ?GlobalVariables {
  const interactionData = selectedObject && selectedObject.object.interactionData;
  const objectTopic = interactionData && interactionData.topic;
  if (!linkedGlobalVariables.length || !objectTopic) {
    return;
  }
  const newGlobalVariables = {};
  linkedGlobalVariables.forEach(({ topic, markerKeyPath, name }) => {
    if (objectTopic === topic) {
      const objectForPath = get(selectedObject.object, [...markerKeyPath].reverse());
      newGlobalVariables[name] = objectForPath;
    }
  });
  return newGlobalVariables;
}

export type LayoutToolbarSharedProps = {|
  autoTextBackgroundColor?: boolean,
  cameraState: $Shape<CameraState>,
  followOrientation: boolean,
  followTf?: string | false,
  onAlignXYAxis: () => void,
  onCameraStateChange: (CameraState) => void,
  onFollowChange: (followTf?: string | false, followOrientation?: boolean) => void,
  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  selectedPolygonEditFormat: "json" | "yaml",
  showCrosshair: ?boolean,
  transforms: Transforms,
  isPlaying?: boolean,
|};

export type LayoutTopicSettingsSharedProps = {|
  transforms: Transforms,
  topics: Topic[],
  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  topicSettings: TopicSettingsCollection,
|};

type Props = {|
  ...LayoutToolbarSharedProps,
  ...LayoutTopicSettingsSharedProps,
  checkedNodes: string[],
  children?: Node,
  cleared?: boolean,
  currentTime: Time,
  expandedNodes: string[],
  extensions: Extensions,
  frame?: Frame,
  helpContent: Node | string,
  isPlaying?: boolean,
  modifiedNamespaceTopics: string[],
  pinTopics: boolean,
  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  setSubscriptions: (subscriptions: string[]) => void,
  topicDisplayMode: TopicDisplayMode,
  topics: Topic[],
  topicSettings: TopicSettingsCollection,
  transforms: Transforms,
|};

type SelectedObjectState = {
  clickedPosition: ClickedPosition,
  selectedObject: ?MouseEventObject, // to be set when clicked a single object or selected one of the clicked topics from the context menu
  selectedObjects: MouseEventObject[],
};

export type EditTopicState = { tooltipPosX: number, topic: Topic };

export default function Layout({
  autoTextBackgroundColor,
  cameraState,
  checkedNodes,
  children,
  cleared,
  currentTime,
  expandedNodes,
  extensions,
  followOrientation,
  followTf,
  frame,
  helpContent,
  isPlaying,
  modifiedNamespaceTopics,
  onAlignXYAxis,
  onCameraStateChange,
  onFollowChange,
  pinTopics,
  saveConfig,
  selectedPolygonEditFormat,
  showCrosshair,
  topicDisplayMode,
  topics,
  topicSettings,
  transforms,
  setSubscriptions,
}: Props) {
  // toggle visibility on topics by temporarily storing a list of hidden topics on the state
  const [hiddenTopics, setHiddenTopics] = useState([]);

  const { topicConfig, newCheckedNodes } = useMemo(
    () =>
      getTopicConfig({
        checkedNodes,
        topicDisplayMode,
        topics,
      }),
    [checkedNodes, topicDisplayMode, topics]
  );
  useLayoutEffect(() => saveConfig({ checkedNodes: newCheckedNodes }), [newCheckedNodes, saveConfig]);

  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  const { globalVariables, setGlobalVariables } = useGlobalVariables();
  const [debug, setDebug] = useState(false);
  const [editTopicState, setEditTopicState] = useState<?EditTopicState>(null);
  const [polygonBuilder, setPolygonBuilder] = useState(() => new PolygonBuilder());
  // use hideTopicTreeCount to trigger auto hide topic tree when clicked outside of the topic tree
  const [hideTopicTreeCount, setHideTopicTreeCount] = useState(0);
  // debounced filterText which will trigger auto creation of a new topic tree
  const [filterText, setFilterText] = useState("");
  const [measureInfo, setMeasureInfo] = useState<MeasureInfo>({
    measureState: "idle",
    measurePoints: { start: null, end: null },
  });

  const [_, forceUpdate] = useReducer((x) => x + 1, 0); // used for updating DrawPolygon during mouse move
  const wrapperRef = useRef<?HTMLDivElement>(null);
  const measuringElRef = useRef<?MeasuringTool>(null);
  const [drawingTabType, setDrawingTabType] = useState<?DrawingTabType>(null);
  const [selectedObjectState, setSelectedObjectState] = useState<?SelectedObjectState>(null);
  const selectedObject = selectedObjectState && selectedObjectState.selectedObject;
  const editedTopics = useMemo(
    () => Object.keys(topicSettings).filter((settingKey) => Object.keys(topicSettings[settingKey]).length),
    [topicSettings]
  );

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
  const defaultTree = useMemo(
    () =>
      treeBuilder({
        checkedNodes,
        expandedNodes: [],
        modifiedNamespaceTopics: [],
        namespaces: [],
        topics,
        transforms: transforms.values(),
        topicDisplayMode,
        topicConfig,
      }),
    //eslint-disable-next-line react-hooks/exhaustive-deps, only need to build once
    []
  );
  const topicTreeRef = useRef(defaultTree);
  // sceneBuilder relies on topic tree selection; topic tree selection also relies on sceneBuilder namespaces.
  // useLayoutEffect will update the topic tree and selections, which in turn re-triggers rendering of the topic tree.
  const [selections, setSelections] = useState(() => topicTreeRef.current.getSelections());

  // update subscriptions whenever selected topics change, use deep compare to prevent updating when expanding/collapsing topics
  const memoizedSelectedTopics = useShallowMemo(selections.topics);
  useEffect(() => setSubscriptions(memoizedSelectedTopics), [memoizedSelectedTopics, setSubscriptions]);

  // use the selection to decide which topics to render in SceneBuilder
  const checkedVisibleTopicNames = useMemo(() => difference(memoizedSelectedTopics, hiddenTopics), [
    hiddenTopics,
    memoizedSelectedTopics,
  ]);

  // Use isEqual compare to update only when the extensions actually changed: the topic selector emits a new list of extensions
  // every time someone expands/collapses a node or types in the selection box...so if we don't check for
  // item equality here we end up re-rendering the map significantly more than we need to.
  const memoizedExtensions = useShallowMemo(selections.extensions);

  useMemo(
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

      sceneBuilder.setTransforms(transforms, rootTfID);
      sceneBuilder.setFlattenMarkers(memoizedExtensions.includes("Car.flattenMarkers"));
      // toggle scene builder namespaces based on selected namespace nodes in the tree
      sceneBuilder.setEnabledNamespaces(selections.namespaces);
      sceneBuilder.setTopicSettings(topicSettings);

      // toggle scene builder topics based on selected topic nodes in the tree
      const topicsByName = topicsByTopicName(topics);
      const checkedVisibleTopics = filterMap(checkedVisibleTopicNames, (name) => topicsByName[name]);

      sceneBuilder.setTopics(checkedVisibleTopics);
      sceneBuilder.setGlobalVariables(globalVariables);
      sceneBuilder.setFrame(frame);
      sceneBuilder.setCurrentTime(currentTime);
      sceneBuilder.render();

      // update the transforms and set the selected ones to render
      transformsBuilder.setTransforms(transforms, rootTfID);
      transformsBuilder.setSelectedTransforms(memoizedExtensions);
    },
    [
      checkedVisibleTopicNames,
      cleared,
      currentTime,
      followTf,
      frame,
      globalVariables,
      sceneBuilder,
      memoizedExtensions,
      selections.namespaces,
      topicSettings,
      topics,
      transforms,
      transformsBuilder,
    ]
  );

  const transformCount = transforms.values().length;
  useEffect(
    () => {
      topicTreeRef.current = treeBuilder({
        topics,
        namespaces: sceneBuilder.allNamespaces,
        checkedNodes,
        expandedNodes,
        modifiedNamespaceTopics,
        transforms: transforms.values(),
        editedTopics,
        canEditDatatype,
        filterText,
        topicDisplayMode,
        topicConfig,
      });
      // trigger another render
      setSelections(topicTreeRef.current.getSelections());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps, instead of trigger change on transforms, we need to use transforms.values().length
    [
      checkedNodes,
      editedTopics,
      expandedNodes,
      filterText,
      modifiedNamespaceTopics,
      sceneBuilder.allNamespaces,
      topics,
      transformCount,
      topicConfig,
      topicDisplayMode,
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
    editTopicState,
    handleDrawPolygons,
    saveConfig,
    selectedObjectState,
    hideTopicTreeCount,
    topics,
  });
  callbackInputsRef.current = {
    cameraState,
    debug,
    drawingTabType,
    editTopicState,
    handleDrawPolygons,
    saveConfig,
    selectedObjectState,
    hideTopicTreeCount,
    topics,
  };

  const handleEvent = useCallback((eventName: EventName, ev: MouseEvent, args: ?ReglClickInfo) => {
    if (!args) {
      return;
    }
    const { drawingTabType, handleDrawPolygons } = callbackInputsRef.current;
    // $FlowFixMe get around index signature error
    const measuringHandler = measuringElRef.current && measuringElRef.current[eventName];
    const measureActive = measuringElRef.current && measuringElRef.current.measureActive;
    if (measuringHandler && measureActive) {
      return measuringHandler(ev, args);
    } else if (drawingTabType === POLYGON_TAB_TYPE) {
      handleDrawPolygons(eventName, ev, args);
    }
  }, []);

  const {
    onClick,
    onDoubleClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onClearSelectedObject,
    onControlsOverlayClick,
    onEditClick,
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
            setSelectedObjectState(null);
          } else if (selectedObjects.length === 1) {
            // select the object directly if there is only one
            setSelectedObjectState({ selectedObject: selectedObjects[0], selectedObjects, clickedPosition });
          } else {
            // open up context menu to select one object to show details
            setSelectedObjectState({ selectedObject: null, selectedObjects, clickedPosition });
          }
        },
        onControlsOverlayClick: (ev: SyntheticMouseEvent<HTMLDivElement>) => {
          if (!wrapperRef.current) {
            return;
          }
          const target = ((ev.target: any): HTMLElement);
          //only close if the click target is inside the panel, e.g. don't close when dropdown menus rendered in portals are clicked
          if (wrapperRef.current.contains(target)) {
            setHideTopicTreeCount((callbackInputsRef.current.hideTopicTreeCount + 1) % 100);
          }
        },
        onDoubleClick: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onDoubleClick", ev, args),
        onMouseDown: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onMouseDown", ev, args),
        onMouseMove: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onMouseMove", ev, args),
        onMouseUp: (ev: MouseEvent, args: ?ReglClickInfo) => handleEvent("onMouseUp", ev, args),
        onClearSelectedObject: () => setSelectedObjectState(null),
        // clicking on the body should hide any edit tip
        onEditClick: (ev: SyntheticMouseEvent<HTMLElement>, topic: string) => {
          const { editTopicState, topics } = callbackInputsRef.current;
          // if the same icon is clicked again, close the popup
          const existingEditTopic = (editTopicState && editTopicState.topic.name) || undefined;
          if (topic === existingEditTopic) {
            setEditTopicState(null);
            return;
          }

          if (!wrapperRef.current) {
            return;
          }
          const panelRect = wrapperRef.current.getBoundingClientRect();
          const editBtnRect = ev.currentTarget.getBoundingClientRect();
          const newEditTopic = topics.find((t) => t.name === topic);
          if (!newEditTopic) {
            return;
          }
          setEditTopicState({
            tooltipPosX: editBtnRect.right - panelRect.left + 5,
            topic: newEditTopic,
          });
        },
        onSelectObject: (selectedObject: MouseEventObject) =>
          setSelectedObjectState({ ...callbackInputsRef.current.selectedObjectState, selectedObject }),
        onSetPolygons: (polygons: Polygon[]) => setPolygonBuilder(new PolygonBuilder(polygons)),
        toggleDebug: () => setDebug(!callbackInputsRef.current.debug),
        toggleCameraMode: () => {
          const { cameraState, saveConfig } = callbackInputsRef.current;
          saveConfig({ cameraState: { ...cameraState, perspective: !cameraState.perspective } });
          if (measuringElRef.current && cameraState.perspective) {
            measuringElRef.current.reset();
          }
        },
      };
    },
    [handleEvent]
  );

  const keyDownHandlers = useMemo(
    () => ({
      "3": () => {
        toggleCameraMode();
      },
      Escape: () => {
        setDrawingTabType(null);
      },
    }),
    [toggleCameraMode]
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
  const mapElement = useMemo(
    () =>
      MapComponent && (
        <MapComponent
          extensions={memoizedExtensions}
          scene={memoizedScene}
          debug={debug}
          perspective={!!cameraState.perspective}
        />
      ),
    [MapComponent, cameraState.perspective, debug, memoizedExtensions, memoizedScene]
  );

  return (
    <div className={styles.container} ref={wrapperRef} style={{ cursor: cursorType }} onClick={onControlsOverlayClick}>
      <KeyListener keyDownHandlers={keyDownHandlers} />
      <PanelToolbar floating helpContent={helpContent} />
      <div style={videoRecordingStyle}>
        <TopicSelector
          autoTextBackgroundColor={!!autoTextBackgroundColor}
          checkedNodes={checkedNodes}
          editedTopics={editedTopics}
          expandedNodes={expandedNodes}
          hideTopicTreeCount={hideTopicTreeCount}
          modifiedNamespaceTopics={modifiedNamespaceTopics}
          namespaces={sceneBuilder.allNamespaces}
          onEditClick={onEditClick}
          onTopicSearchChange={setFilterText}
          pinTopics={pinTopics}
          saveConfig={saveConfig}
          sceneErrors={sceneBuilder.errors}
          tree={topicTreeRef.current}
          topicDisplayMode={topicDisplayMode}
          hiddenTopics={hiddenTopics}
          setHiddenTopics={setHiddenTopics}
        />
        <LayoutTopicSettings
          saveConfig={saveConfig}
          topics={topics}
          transforms={transforms}
          sceneBuilder={sceneBuilder}
          topicSettings={topicSettings}
          setEditTopicState={setEditTopicState}
          editTopicState={editTopicState}
        />
      </div>
      <div className={styles.world}>
        <World
          autoTextBackgroundColor={!!autoTextBackgroundColor}
          cameraState={cameraState}
          isPlaying={!!isPlaying}
          markerProviders={markerProviders}
          onCameraStateChange={onCameraStateChange}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}>
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
