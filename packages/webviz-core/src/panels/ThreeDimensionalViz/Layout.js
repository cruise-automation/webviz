// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CloseIcon from "@mdi/svg/svg/close.svg";
import cx from "classnames";
import { get } from "lodash";
import * as React from "react";
import Draggable from "react-draggable";
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
import Icon from "webviz-core/src/components/Icon";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import filterMap from "webviz-core/src/filterMap";
import useGlobalVariables, { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import Crosshair from "webviz-core/src/panels/ThreeDimensionalViz/Crosshair";
import DebugStats from "webviz-core/src/panels/ThreeDimensionalViz/DebugStats";
import DrawingTools, {
  POLYGON_TAB_TYPE,
  CAMERA_TAB_TYPE,
  type DrawingTabType,
} from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools";
import MeasuringTool, { type MeasureInfo } from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools/MeasuringTool";
import FollowTFControl from "webviz-core/src/panels/ThreeDimensionalViz/FollowTFControl";
import Interactions, {
  InteractionContextMenu,
  type InteractionData,
} from "webviz-core/src/panels/ThreeDimensionalViz/Interactions";
import useLinkedGlobalVariables, {
  type LinkedGlobalVariables,
} from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import MainToolbar from "webviz-core/src/panels/ThreeDimensionalViz/MainToolbar";
import MeasureMarker from "webviz-core/src/panels/ThreeDimensionalViz/MeasureMarker";
import SceneBuilder, { type TopicSettingsCollection } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import TopicSelector from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector";
import type { Selections } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/treeBuilder";
import TopicSettingsEditor, { canEditDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import TransformsBuilder from "webviz-core/src/panels/ThreeDimensionalViz/TransformsBuilder";
import type { Frame, Topic } from "webviz-core/src/players/types";
import type { Extensions } from "webviz-core/src/reducers/extensions";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { topicsByTopicName } from "webviz-core/src/util/selectors";
import videoRecordingMode from "webviz-core/src/util/videoRecordingMode";

const { useMemo, useRef, useState } = React;

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

type SharedProps = {
  autoTextBackgroundColor?: boolean,
  cameraState: $Shape<CameraState>,
  checkedNodes: string[],
  children?: React.Node,
  cleared?: boolean,
  convexHullOpacity: ?number,
  expandedNodes: string[],
  extensions: Extensions,
  followOrientation: boolean,
  followTf?: string | false,
  helpContent: React.Node | string,
  isPlaying?: boolean,
  modifiedNamespaceTopics: string[],
  onAlignXYAxis: () => void,
  onCameraStateChange: (CameraState) => void,
  onFollowChange: (followTf?: string | false, followOrientation?: boolean) => void,
  pinTopics: boolean,
  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  selectedPolygonEditFormat: "json" | "yaml",
  selections: Selections,
  setSelections: (Selections) => void,
  showCrosshair: ?boolean,
  topics: Topic[],
  topicSettings: TopicSettingsCollection,
  transforms: Transforms,
};
type WrapperProps = SharedProps & {
  currentTime: Time,
  frame?: Frame,
};

type Props = SharedProps & {
  sceneBuilder: SceneBuilder,
  transformsBuilder: TransformsBuilder,
  measureInfo: MeasureInfo,
  setMeasureInfo: (MeasureInfo) => void,
  showTopics: boolean,
  setShowTopics: (boolean) => void,
  toggleShowTopics: () => void,
  globalVariables: GlobalVariables,
  setGlobalVariables: (GlobalVariables) => void,
  linkedGlobalVariables: LinkedGlobalVariables,
  editedTopics: string[],
};

type EditTopicState = { tooltipPosX: number, topic: Topic };

type SelectedObjectState = {
  clickedPosition: ClickedPosition,
  selectedObject: ?MouseEventObject, // to be set when clicked a single object or selected one of the clicked topics from the context menu
  selectedObjects: MouseEventObject[],
};
type State = {
  debug: boolean,
  editTopicState: ?EditTopicState,
  drawingTabType: ?DrawingTabType,
  polygonBuilder: PolygonBuilder,
  selectedObjectState: ?SelectedObjectState,
};

class BaseComponent extends React.Component<Props, State> {
  // overall element containing everything in this component
  el: ?HTMLDivElement;
  measuringTool: ?MeasuringTool;

  static defaultProps = {
    checkedNodes: [],
    expandedNodes: [],
    modifiedNamespaceTopics: [],
    topicSettings: {},
    showTopics: false,
    pinTopics: false,
  };

  state: State = {
    debug: false,
    editTopicState: null,
    drawingTabType: null,
    polygonBuilder: new PolygonBuilder(),
    selectedObjectState: null,
  };

  onDoubleClick = (ev: MouseEvent, args: ?ReglClickInfo) => {
    this._handleEvent("onDoubleClick", ev, args);
  };
  onMouseDown = (ev: MouseEvent, args: ?ReglClickInfo) => {
    this._handleEvent("onMouseDown", ev, args);
  };
  onMouseMove = (ev: MouseEvent, args: ?ReglClickInfo) => {
    this._handleEvent("onMouseMove", ev, args);
  };
  onMouseUp = (ev: MouseEvent, args: ?ReglClickInfo) => {
    this._handleEvent("onMouseUp", ev, args);
  };

  _updateLinkedGlobalVariables = (selectedObject: MouseEventObject) => {
    const { linkedGlobalVariables, setGlobalVariables } = this.props;
    const newGlobalVariables = getUpdatedGlobalVariablesBySelectedObject(selectedObject, linkedGlobalVariables);
    if (newGlobalVariables) {
      setGlobalVariables(newGlobalVariables);
    }
  };

  onClick = (event: MouseEvent, args: ?ReglClickInfo) => {
    const selectedObjects = (args && args.objects) || [];
    const clickedPosition = { clientX: event.clientX, clientY: event.clientY };
    if (selectedObjects.length === 0) {
      this.setState({ selectedObjectState: null });
    } else if (selectedObjects.length === 1) {
      // select the object directly if there is only one
      const selectedObject = selectedObjects[0];
      this.setState({ selectedObjectState: { selectedObjects, selectedObject, clickedPosition } });
      this._updateLinkedGlobalVariables(selectedObject);
    } else {
      // open up context menu to select one object to show details
      this.setState({ selectedObjectState: { selectedObjects, selectedObject: null, clickedPosition } });
    }
  };

  _onSelectObject = (selectedObject: MouseEventObject) => {
    this.setState({ selectedObjectState: { ...this.state.selectedObjectState, selectedObject } });
    this._updateLinkedGlobalVariables(selectedObject);
  };

  _handleDrawPolygons = (eventName: EventName, ev: MouseEvent, args: ?ReglClickInfo) => {
    this.state.polygonBuilder[eventName](ev, args);
    this.forceUpdate();
  };

  _handleEvent = (eventName: EventName, ev: MouseEvent, args: ?ReglClickInfo) => {
    if (!args) {
      return;
    }
    // $FlowFixMe
    const measuringHandler = this.measuringTool && this.measuringTool[eventName];
    const measureActive = this.measuringTool && this.measuringTool.measureActive;

    if (measuringHandler && measureActive) {
      return measuringHandler(ev, args);
    } else if (this.state.drawingTabType === POLYGON_TAB_TYPE) {
      this._handleDrawPolygons(eventName, ev, args);
    }
  };

  keyDownHandlers = {
    "3": () => {
      this.toggleCameraMode();
    },
    Escape: () => {
      this._exitDrawing();
    },
  };

  _exitDrawing = () => {
    this.setState({ drawingTabType: null });
  };

  switchTo2DCameraIfNeeded = () => {
    const {
      cameraState,
      cameraState: { perspective },
      saveConfig,
    } = this.props;
    if (this.state.drawingTabType === POLYGON_TAB_TYPE && perspective) {
      saveConfig({ cameraState: { ...cameraState, perspective: false } });
    }
  };

  toggleCameraMode = () => {
    const { cameraState, saveConfig } = this.props;
    saveConfig({ cameraState: { ...cameraState, perspective: !cameraState.perspective } });
    if (this.measuringTool && cameraState.perspective) {
      this.measuringTool.reset();
    }
  };

  toggleDebug = () => {
    this.setState({ debug: !this.state.debug });
  };
  // clicking on the body should hide any edit tip
  onEditClick = (e: SyntheticMouseEvent<HTMLElement>, topic: string) => {
    const { topics } = this.props;
    const { editTopicState } = this.state;
    // if the same icon is clicked again, close the popup
    const existingEditTopic = editTopicState ? editTopicState.topic.name : undefined;
    if (topic === existingEditTopic) {
      return this.setState({ editTopicState: null });
    }
    const { el } = this;

    // satisfy flow
    if (!el) {
      return;
    }

    const panelRect = el.getBoundingClientRect();
    const editBtnRect = e.currentTarget.getBoundingClientRect();
    const newEditTopic = topics.find((t) => t.name === topic);
    if (!newEditTopic) {
      return;
    }
    this.setState({
      editTopicState: { tooltipPosX: editBtnRect.right - panelRect.left + 5, topic: newEditTopic },
    });
  };

  onSettingsChange = (settings: {}) => {
    const { saveConfig, topicSettings } = this.props;
    const { editTopicState } = this.state;
    if (!editTopicState) {
      return;
    }
    saveConfig({ topicSettings: { ...topicSettings, [editTopicState.topic.name]: settings } });
  };

  onControlsOverlayClick = (e: SyntheticMouseEvent<HTMLDivElement>) => {
    const { el } = this;
    if (!el) {
      return;
    }
    const target = ((e.target: any): HTMLElement);
    // don't close if the click target is outside the panel
    // e.g. don't close when dropdown menus rendered in portals are clicked
    if (!el.contains(target)) {
      return;
    }
    this.props.setShowTopics(false);
  };

  cancelClick = (e: SyntheticMouseEvent<HTMLDivElement>) => {
    // stop the event from bubbling up to onControlsOverlayClick
    // (but don't preventDefault because checkboxes, buttons, etc. should continue to work)
    e.stopPropagation();
  };

  onClearSelectedObject = () => {
    this.setState({ selectedObjectState: null });
  };

  onSetPolygons = (polygons: Polygon[]) => this.setState({ polygonBuilder: new PolygonBuilder(polygons) });
  onSetDrawingTabType = (drawingTabType: ?DrawingTabType) => this.setState({ drawingTabType });

  _getInteractionData = (): ?InteractionData => {
    const { selectedObjectState } = this.state;
    if (selectedObjectState && selectedObjectState.selectedObject) {
      return selectedObjectState.selectedObject.object.interactionData;
    }
  };

  _getIsDrawing = (): boolean => {
    const measureActive = this.measuringTool && this.measuringTool.measureActive;
    return this.state.drawingTabType === POLYGON_TAB_TYPE || !!measureActive;
  };

  renderToolbars() {
    const {
      cameraState,
      cameraState: { perspective },
      followOrientation,
      followTf,
      isPlaying,
      onAlignXYAxis,
      onCameraStateChange,
      onFollowChange,
      saveConfig,
      selectedPolygonEditFormat,
      showCrosshair,
      transforms,
      measureInfo,
    } = this.props;
    const { debug, polygonBuilder, drawingTabType, selectedObjectState } = this.state;

    return (
      <div className={cx(styles.toolbar, styles.right)}>
        <div className={styles.buttons}>
          <FollowTFControl
            transforms={transforms}
            tfToFollow={followTf ? followTf : undefined}
            followOrientation={followOrientation}
            onFollowChange={onFollowChange}
          />
        </div>
        <MainToolbar
          measureInfo={measureInfo}
          measuringTool={this.measuringTool}
          perspective={perspective}
          debug={debug}
          onToggleCameraMode={this.toggleCameraMode}
          onToggleDebug={this.toggleDebug}
        />
        {this.measuringTool && this.measuringTool.measureDistance}
        <Interactions
          isDrawing={this._getIsDrawing()}
          interactionData={this._getInteractionData()}
          onClearSelectedObject={this.onClearSelectedObject}
          selectedObject={selectedObjectState && selectedObjectState.selectedObject}
        />
        <DrawingTools
          // Save some unnecessary re-renders by not passing in the constantly changing cameraState unless it's needed
          cameraState={drawingTabType === CAMERA_TAB_TYPE ? cameraState : null}
          followOrientation={followOrientation}
          followTf={followTf}
          isPlaying={isPlaying}
          onAlignXYAxis={onAlignXYAxis}
          onCameraStateChange={onCameraStateChange}
          onSetPolygons={this.onSetPolygons}
          polygonBuilder={polygonBuilder}
          saveConfig={saveConfig}
          selectedPolygonEditFormat={selectedPolygonEditFormat}
          onSetDrawingTabType={this.onSetDrawingTabType}
          showCrosshair={!!showCrosshair}
        />
      </div>
    );
  }

  render3d() {
    const { debug, polygonBuilder, selectedObjectState } = this.state;
    const {
      sceneBuilder,
      transformsBuilder,
      autoTextBackgroundColor,
      extensions,
      cameraState,
      onCameraStateChange,
      children,
      selections,
      convexHullOpacity,
      showCrosshair,
      measureInfo,
    } = this.props;
    const scene = sceneBuilder.getScene();

    const WorldComponent = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.WorldComponent;
    // TODO(Audrey): update DrawPolygons to support custom key so the users don't have to press ctrl key all the time

    return (
      <WorldComponent
        selectedObject={selectedObjectState && selectedObjectState.selectedObject}
        autoTextBackgroundColor={!!autoTextBackgroundColor}
        cameraState={cameraState}
        convexHullOpacity={convexHullOpacity}
        debug={debug}
        markerProviders={extensions.markerProviders.concat([sceneBuilder, transformsBuilder])}
        onCameraStateChange={onCameraStateChange}
        onDoubleClick={this.onDoubleClick}
        onClick={this.onClick}
        onMouseDown={this.onMouseDown}
        onMouseMove={this.onMouseMove}
        onMouseUp={this.onMouseUp}
        scene={scene}
        extensions={selections.extensions}>
        {children}
        <DrawPolygons>{polygonBuilder.polygons}</DrawPolygons>
        {selectedObjectState &&
          selectedObjectState.selectedObjects.length > 1 &&
          !selectedObjectState.selectedObject && (
            <InteractionContextMenu
              selectedObjects={selectedObjectState.selectedObjects}
              clickedPosition={selectedObjectState.clickedPosition}
              onSelectObject={this._onSelectObject}
            />
          )}
        {!cameraState.perspective && showCrosshair && <Crosshair cameraState={cameraState} />}
        <MeasureMarker measurePoints={measureInfo.measurePoints} />
        {process.env.NODE_ENV !== "production" && !inScreenshotTests() && <DebugStats />}
      </WorldComponent>
    );
  }

  renderTopicSettingsEditor() {
    const { topicSettings, sceneBuilder } = this.props;
    const { editTopicState } = this.state;

    if (!editTopicState) {
      return null;
    }
    const { tooltipPosX, topic } = editTopicState;
    const collector = sceneBuilder.collectors[topic.name];
    const message = collector ? collector.getMessages()[0] : undefined;

    // need to place the draggable div into an absolute positioned element
    const style = {
      position: "absolute",
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      zIndex: 103,
    };
    const bounds = { left: 0, top: 0 };
    // position the popup to the left and down from the topic selector
    const defaultPosition = { x: tooltipPosX + 30, y: 40 };
    return (
      <div style={style}>
        <Draggable bounds={bounds} defaultPosition={defaultPosition} cancel="input">
          <div className={styles.topicSettingsEditor} onClick={this.cancelClick}>
            <Icon className={styles.closeIcon} onClick={() => this.setState({ editTopicState: null })}>
              <CloseIcon />
            </Icon>
            <TopicSettingsEditor
              topic={topic}
              message={message}
              settings={topicSettings[topic.name]}
              onSettingsChange={this.onSettingsChange}
            />
          </div>
        </Draggable>
      </div>
    );
  }

  renderControlsOverlay() {
    const {
      autoTextBackgroundColor,
      checkedNodes,
      expandedNodes,
      modifiedNamespaceTopics,
      pinTopics,
      saveConfig,
      setSelections,
      topics,
      transforms,
      editedTopics,
      sceneBuilder,
      toggleShowTopics,
      showTopics,
    } = this.props;

    return (
      <TopicSelector
        autoTextBackgroundColor={!!autoTextBackgroundColor}
        namespaces={sceneBuilder.allNamespaces}
        sceneErrors={sceneBuilder.errors}
        showTopics={showTopics || pinTopics}
        topics={topics}
        checkedNodes={checkedNodes}
        editedTopics={editedTopics}
        canEditDatatype={canEditDatatype}
        expandedNodes={expandedNodes}
        modifiedNamespaceTopics={modifiedNamespaceTopics}
        pinTopics={pinTopics}
        setSelections={setSelections}
        saveConfig={saveConfig}
        transforms={transforms}
        // Because transforms are mutable, we need a key that tells us when to update the component. We use the count of
        // the transforms for this.
        transformsCount={transforms.values().length}
        onEditClick={this.onEditClick}
        onToggleShowClick={toggleShowTopics}
      />
    );
  }

  render() {
    const {
      setMeasureInfo,
      measureInfo: { measureState, measurePoints },
    } = this.props;
    const isDrawing = this._getIsDrawing();
    const cursorType = isDrawing ? "crosshair" : "";

    return (
      <div
        className={styles.container}
        ref={(el) => (this.el = el)}
        style={{ cursor: cursorType }}
        onClick={this.onControlsOverlayClick}>
        <MeasuringTool
          ref={(el) => (this.measuringTool = el)}
          measureState={measureState}
          measurePoints={measurePoints}
          onMeasureInfoChange={setMeasureInfo}
        />
        <KeyListener keyDownHandlers={this.keyDownHandlers} />
        <PanelToolbar floating helpContent={this.props.helpContent} />
        <div style={{ visibility: videoRecordingMode() ? "hidden" : "visible" }}>
          {this.renderToolbars()}
          {this.renderControlsOverlay()}
          {this.renderTopicSettingsEditor()}
        </div>
        <div className={styles.world}>{this.render3d()}</div>
      </div>
    );
  }
}

export default function Layout({
  cleared,
  currentTime,
  followTf,
  frame,
  selections,
  topics,
  topicSettings,
  transforms,
  ...rest
}: WrapperProps) {
  const { linkedGlobalVariables } = useLinkedGlobalVariables();
  const { globalVariables, setGlobalVariables } = useGlobalVariables();
  const [showTopics, setShowTopics] = useState<boolean>(false);
  const [measureInfo, setMeasureInfo] = useState<MeasureInfo>({
    measureState: "idle",
    measurePoints: { start: null, end: null },
  });

  const editedTopics = useMemo(
    () => Object.keys(topicSettings).filter((settingKey) => Object.keys(topicSettings[settingKey]).length),
    [topicSettings]
  );

  // initialize the SceneBuilder and TransformsBuilder
  const { sceneBuilder, transformsBuilder } = useMemo(
    () => ({
      sceneBuilder: new SceneBuilder(),
      transformsBuilder: new TransformsBuilder(),
    }),
    []
  );

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
      sceneBuilder.setFlattenMarkers(selections.extensions.includes("Car.flattenMarkers"));
      // toggle scene builder namespaces based on selected namespace nodes in the tree
      sceneBuilder.setEnabledNamespaces(selections.namespaces);
      sceneBuilder.setTopicSettings(topicSettings);

      // toggle scene builder topics based on selected topic nodes in the tree
      const topicsByName = topicsByTopicName(topics);
      sceneBuilder.setTopics(filterMap(selections.topics, (name) => topicsByName[name]));
      sceneBuilder.setGlobalVariables(globalVariables);
      sceneBuilder.setFrame(frame);
      sceneBuilder.setCurrentTime(currentTime);
      sceneBuilder.render();

      // update the transforms and set the selected ones to render
      transformsBuilder.setTransforms(transforms, rootTfID);
      transformsBuilder.setSelectedTransforms(selections.extensions);
    },
    [
      cleared,
      currentTime,
      followTf,
      frame,
      globalVariables,
      sceneBuilder,
      selections.extensions,
      selections.namespaces,
      selections.topics,
      topicSettings,
      topics,
      transforms,
      transformsBuilder,
    ]
  );

  // use callbackInputsRef to prevent unnecessary callback changes
  const callbackInputsRef = useRef({ showTopics });
  callbackInputsRef.current = { showTopics };

  const { toggleShowTopics } = useMemo(() => {
    return {
      toggleShowTopics: () => setShowTopics(!callbackInputsRef.current.showTopics),
    };
  }, []);

  return (
    <BaseComponent
      {...rest}
      measureInfo={measureInfo}
      setMeasureInfo={setMeasureInfo}
      showTopics={showTopics}
      toggleShowTopics={toggleShowTopics}
      setShowTopics={setShowTopics}
      topicSettings={topicSettings}
      topics={topics}
      followTf={followTf}
      transforms={transforms}
      selections={selections}
      editedTopics={editedTopics}
      sceneBuilder={sceneBuilder}
      transformsBuilder={transformsBuilder}
      linkedGlobalVariables={linkedGlobalVariables}
      globalVariables={globalVariables}
      setGlobalVariables={setGlobalVariables}
    />
  );
}
