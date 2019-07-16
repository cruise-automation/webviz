// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CloseIcon from "@mdi/svg/svg/close.svg";
import cx from "classnames";
import { vec3, quat } from "gl-matrix";
import * as React from "react";
import Draggable from "react-draggable";
import KeyListener from "react-key-listener";
import {
  cameraStateSelectors,
  PolygonBuilder,
  DrawPolygons,
  type CameraState,
  type ReglClickInfo,
  type MouseHandler,
} from "regl-worldview";

import type { ThreeDimensionalVizConfig } from ".";
import Icon from "webviz-core/src/components/Icon";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import DebugStats from "webviz-core/src/panels/ThreeDimensionalViz/DebugStats";
import DrawingTools, {
  DRAWING_CONFIG,
  type DrawingType,
} from "webviz-core/src/panels/ThreeDimensionalViz/DrawingTools";
import FollowTFControl from "webviz-core/src/panels/ThreeDimensionalViz/FollowTFControl";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import MainToolbar from "webviz-core/src/panels/ThreeDimensionalViz/MainToolbar";
import SceneBuilder, {
  type TopicSettingsCollection,
  type TopicSettings,
} from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import TopicSelector from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector";
import type { Selections } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/treeBuilder";
import TopicSettingsEditor from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import TransformsBuilder from "webviz-core/src/panels/ThreeDimensionalViz/TransformsBuilder";
import type { Extensions } from "webviz-core/src/reducers/extensions";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import type { SaveConfig, UpdatePanelConfig } from "webviz-core/src/types/panels";
import type { Frame, Topic } from "webviz-core/src/types/players";
import type { MarkerCollector, MarkerProvider } from "webviz-core/src/types/Scene";
import videoRecordingMode from "webviz-core/src/util/videoRecordingMode";

const POLYGON_TYPE = DRAWING_CONFIG.Polygons.type;
const CAMERA_TYPE = DRAWING_CONFIG.Camera.type;

type EventName = "onDoubleClick" | "onMouseMove" | "onMouseDown" | "onMouseUp";

type Props = {
  autoTextBackgroundColor?: boolean,
  selections: Selections,
  frame?: Frame,
  transforms: Transforms,
  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  updatePanelConfig: UpdatePanelConfig,
  selectedPolygonEditFormat: "json" | "yaml",
  followTf?: string | false,
  followOrientation: boolean,
  showCrosshair: ?boolean,
  onFollowChange: (followTf?: string | false, followOrientation?: boolean) => void,
  onAlignXYAxis: () => void,
  topicSettings: TopicSettingsCollection,
  topics: Topic[],
  checkedNodes: string[],
  expandedNodes: string[],
  modifiedNamespaceTopics: string[],
  extensions: Extensions,
  pinTopics: boolean,
  cameraState: $Shape<CameraState>,
  onCameraStateChange: (CameraState) => void,
  helpContent: React.Node | string,

  children?: React.Node,
  mouseClick: ({}) => void,
  onMouseUp?: MouseHandler,
  onMouseDown?: MouseHandler,
  onMouseMove?: MouseHandler,
  onDoubleClick?: MouseHandler,

  setSelections: (Selections) => void,
  cleared?: boolean,
  // redux values
  globalData: Object,
  currentTime: {| sec: number, nsec: number |},
};

type State = {
  sceneBuilder: SceneBuilder,
  transformsBuilder: TransformsBuilder,
  cachedTopicSettings: TopicSettingsCollection,
  editedTopics: string[],

  debug: boolean,
  showTopics: boolean,
  metadata: Object,
  editTipX: ?number,
  editTipY: ?number,
  editTopic: ?Topic,
  drawingType: ?DrawingType,
  polygonBuilder: PolygonBuilder,
};

export default class Layout extends React.Component<Props, State> implements MarkerProvider {
  // overall element containing everything in this component
  el: ?HTMLDivElement;

  static defaultProps = {
    checkedNodes: [],
    expandedNodes: [],
    modifiedNamespaceTopics: [],
    topicSettings: {},
    showTopics: false,
    pinTopics: false,
  };

  state: State = {
    sceneBuilder: new SceneBuilder(),
    transformsBuilder: new TransformsBuilder(),
    cachedTopicSettings: {},
    editedTopics: [],
    debug: false,
    showTopics: false,
    metadata: {},
    editTipX: undefined,
    editTipY: undefined,
    editTopic: undefined,
    drawingType: null,
    polygonBuilder: new PolygonBuilder(),
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    const { frame, cleared, transforms, followTf, selections, topicSettings, currentTime } = nextProps;
    const { sceneBuilder, transformsBuilder, cachedTopicSettings } = prevState;
    if (!frame) {
      return null;
    }

    const newState = { ...prevState };
    if (topicSettings !== cachedTopicSettings) {
      const nonEmptyTopicSettingsKeys = Object.keys(topicSettings).filter(
        (settingKey) => Object.keys(topicSettings[settingKey]).length
      );
      newState.editedTopics = (nonEmptyTopicSettingsKeys: string[]);
      newState.cachedTopicSettings = topicSettings;
    }

    if (cleared) {
      sceneBuilder.clear();
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
    sceneBuilder.setTopics(selections.topics);
    sceneBuilder.setGlobalData(nextProps.globalData);
    sceneBuilder.setFrame(frame);
    sceneBuilder.setCurrentTime(currentTime);
    sceneBuilder.render();

    // Update the transforms and set the selected ones to render.
    transformsBuilder.setTransforms(transforms, rootTfID);
    transformsBuilder.setSelectedTransforms(selections.extensions);

    const metadata = getGlobalHooks()
      .perPanelHooks()
      .ThreeDimensionalViz.getMetadata(frame);
    if (metadata) {
      newState.metadata = metadata;
    }
    return newState;
  }

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

  _handleDrawPolygons = (eventName: EventName, ev: MouseEvent, args: ?ReglClickInfo) => {
    this.state.polygonBuilder[eventName](ev, args);
    this.forceUpdate();
  };

  _handleEvent = (eventName: EventName, ev: MouseEvent, args: ?ReglClickInfo) => {
    const propsHandler = this.props[eventName];
    const { drawingType } = this.state;
    if (!args) {
      return;
    }
    if (drawingType === POLYGON_TYPE) {
      this._handleDrawPolygons(eventName, ev, args);
    }
    if (propsHandler) {
      propsHandler(ev, args);
    }
  };

  keyDownHandlers = {
    "3": () => {
      this.toggleCameraMode();
    },
    [DRAWING_CONFIG.Polygons.key]: () => {
      this._toggleDrawing(POLYGON_TYPE);
    },
    [DRAWING_CONFIG.Camera.key]: () => {
      this._toggleDrawing(CAMERA_TYPE);
    },
    Control: () => {
      // support default DrawPolygon key
      this._toggleDrawing(POLYGON_TYPE);
    },
    Escape: () => {
      this._exitDrawing();
    },
  };

  _toggleDrawing = (drawingType: DrawingType) => {
    // can enter into drawing from null or non-new-drawing-type to the new drawingType
    const enterDrawing = this.state.drawingType !== drawingType;
    this.setState({ drawingType: enterDrawing ? drawingType : null });
    if (drawingType !== CAMERA_TYPE) {
      this.switchTo2DCameraIfNeeded();
    }
  };

  _exitDrawing = () => {
    this.setState({ drawingType: null });
  };

  switchTo2DCameraIfNeeded = () => {
    const {
      cameraState,
      cameraState: { perspective },
      saveConfig,
    } = this.props;
    if (this.state.drawingType && perspective) {
      saveConfig({ cameraState: { ...cameraState, perspective: false } });
    }
  };

  toggleCameraMode = () => {
    const { cameraState, saveConfig } = this.props;
    saveConfig({ cameraState: { ...cameraState, perspective: !cameraState.perspective } });
  };

  toggleShowTopics = () => {
    const { showTopics } = this.state;
    this.setState({ showTopics: !showTopics });
  };

  toggleDebug = () => {
    this.setState({ debug: !this.state.debug });
  };

  // clicking on the body should hide any edit tip
  onEditClick = (e: SyntheticMouseEvent<HTMLElement>, topic: string) => {
    const { topics } = this.props;
    // if the same icon is clicked again, close the popup
    const existingEditTopic = this.state.editTopic ? this.state.editTopic.name : undefined;
    if (topic === existingEditTopic) {
      return this.setState({
        editTipX: 0,
        editTipY: 0,
        editTopic: undefined,
      });
    }
    const { el } = this;

    // satisfy flow
    if (!el) {
      return;
    }

    const panelRect = el.getBoundingClientRect();
    const editBtnRect = e.currentTarget.getBoundingClientRect();
    const editTopic = topics.find((t) => t.name === topic);
    if (!editTopic) {
      return;
    }
    this.setState({
      editTipX: editBtnRect.right - panelRect.left + 5,
      editTipY: editBtnRect.top + editBtnRect.height / 2,
      editTopic,
    });
  };

  onSettingsChange = (settings: TopicSettings) => {
    const { saveConfig, topicSettings } = this.props;
    const { editTopic } = this.state;
    if (!editTopic) {
      return;
    }
    saveConfig({
      topicSettings: {
        ...topicSettings,
        [editTopic.name]: settings,
      },
    });
  };

  onControlsOverlayClick = (e: SyntheticMouseEvent<HTMLDivElement>) => {
    // statisfy flow
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
    this.setState({ showTopics: false });
  };

  cancelClick = (e: SyntheticMouseEvent<HTMLDivElement>) => {
    // stop the event from bubbling up to onControlsOverlayClick
    // (but don't preventDefault because checkboxes, buttons, etc. should continue to work)
    e.stopPropagation();
  };

  renderToolbars() {
    const {
      cameraState,
      cameraState: { perspective },
      followOrientation,
      followTf,
      onAlignXYAxis,
      onCameraStateChange,
      onFollowChange,
      saveConfig,
      selectedPolygonEditFormat,
      showCrosshair,
      transforms,
      updatePanelConfig,
    } = this.props;
    const { debug, polygonBuilder, drawingType } = this.state;

    return (
      <div className={cx(styles.toolbar, styles.right)}>
        <div className={styles.buttons}>
          <FollowTFControl
            transforms={transforms}
            tfToFollow={followTf ? followTf : undefined}
            followingOrientation={followOrientation}
            onFollowChange={onFollowChange}
          />
        </div>
        <MainToolbar
          perspective={perspective}
          debug={debug}
          onToggleCameraMode={this.toggleCameraMode}
          onToggleDebug={this.toggleDebug}
        />
        <DrawingTools
          cameraState={cameraState}
          followOrientation={followOrientation}
          followTf={followTf}
          onAlignXYAxis={onAlignXYAxis}
          onCameraStateChange={onCameraStateChange}
          onSetPolygons={(polygons) => this.setState({ polygonBuilder: new PolygonBuilder(polygons) })}
          polygonBuilder={polygonBuilder}
          saveConfig={saveConfig}
          selectedPolygonEditFormat={selectedPolygonEditFormat}
          showCrosshair={!!showCrosshair}
          type={drawingType}
          updatePanelConfig={updatePanelConfig}
        />
      </div>
    );
  }

  render3d() {
    const { sceneBuilder, transformsBuilder, debug, metadata, polygonBuilder } = this.state;
    const scene = sceneBuilder.getScene();
    const {
      autoTextBackgroundColor,
      extensions,
      cameraState,
      onCameraStateChange,
      mouseClick,
      children,
      selections,
    } = this.props;

    const WorldComponent = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.WorldComponent;
    // TODO(Audrey): update DrawPolygons to support custom key so the users don't have to press ctrl key all the time

    return (
      <WorldComponent
        autoTextBackgroundColor={!!autoTextBackgroundColor}
        cameraState={cameraState}
        debug={debug}
        markerProviders={extensions.markerProviders.concat([sceneBuilder, transformsBuilder, this])}
        mouseClick={mouseClick}
        onCameraStateChange={onCameraStateChange}
        onDoubleClick={this.onDoubleClick}
        onMouseDown={this.onMouseDown}
        onMouseMove={this.onMouseMove}
        onMouseUp={this.onMouseUp}
        scene={scene}
        extensions={selections.extensions}
        metadata={metadata}>
        {children}
        <DrawPolygons>{polygonBuilder.polygons}</DrawPolygons>
        {process.env.NODE_ENV !== "production" && !inScreenshotTests() && <DebugStats />}
      </WorldComponent>
    );
  }

  // draw a crosshair to show the center of the viewport
  renderMarkers(add: MarkerCollector) {
    const { cameraState, showCrosshair } = this.props;
    if (!cameraState || cameraState.perspective || !showCrosshair) {
      return;
    }

    const { target, targetOffset, distance, thetaOffset } = cameraState;
    const targetHeading = cameraStateSelectors.targetHeading(cameraState);

    // move the crosshair to the center of the camera's viewport: the target + targetOffset rotated by heading
    const crosshairPoint = [0, 0, 0];
    vec3.add(crosshairPoint, vec3.rotateZ(crosshairPoint, targetOffset, [0, 0, 0], -targetHeading), target);

    // orient and size the crosshair so it remains visually fixed in the center
    const length = 0.02 * distance;
    const orientation = [0, 0, 0, 1];
    const theta = targetHeading + thetaOffset;

    quat.rotateZ(orientation, orientation, -theta);

    const crosshair = (z, extraThickness) => {
      const thickness = 0.004 * distance * (1 + extraThickness);
      return {
        header: { frame_id: getGlobalHooks().rootTransformFrame, stamp: { sec: 0, nsec: 0 } },
        type: 5,
        action: 0,
        id: "",
        ns: "",
        pose: {
          position: { x: crosshairPoint[0], y: crosshairPoint[1], z },
          orientation: { x: orientation[0], y: orientation[1], z: orientation[2], w: orientation[3] },
        },
        points: [
          { x: -length * (1 + 0.1 * extraThickness), y: 0, z: 0 },
          { x: length * (1 + 0.1 * extraThickness), y: 0, z: 0 },
          { x: 0, y: -length * (1 + 0.1 * extraThickness), z: 0 },
          { x: 0, y: length * (1 + 0.1 * extraThickness), z: 0 },
        ],
        scale: { x: thickness, y: thickness, z: thickness },
      };
    };

    add.lineList({
      ...crosshair(1000, 0.6),
      color: { r: 0, g: 0, b: 0, a: 1 },
    });

    add.lineList({
      ...crosshair(1001, 0),
      color: { r: 1, g: 1, b: 1, a: 1 },
    });
  }

  renderTopicSettingsEditor() {
    const { topicSettings } = this.props;
    const { editTopic, editTipX, editTipY, sceneBuilder } = this.state;
    if (!editTopic || !editTipX || !editTipY) {
      return null;
    }
    // satisfy flow
    const collector = sceneBuilder.collectors[editTopic.name];
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
    const defaultPosition = { x: editTipX + 30, y: 40 };
    return (
      <div style={style}>
        <Draggable bounds={bounds} defaultPosition={defaultPosition} cancel="input">
          <div className={styles.topicSettingsEditor} onClick={this.cancelClick}>
            <Icon className={styles.closeIcon} onClick={() => this.setState({ editTopic: undefined })}>
              <CloseIcon />
            </Icon>
            <TopicSettingsEditor
              topic={editTopic}
              message={message}
              settings={topicSettings[editTopic.name]}
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
    } = this.props;

    const { showTopics, sceneBuilder, editedTopics } = this.state;

    return (
      <TopicSelector
        autoTextBackgroundColor={!!autoTextBackgroundColor}
        namespaces={sceneBuilder.allNamespaces}
        sceneErrors={sceneBuilder.errors}
        showTopics={showTopics || pinTopics}
        topics={topics}
        checkedNodes={checkedNodes}
        editedTopics={editedTopics}
        expandedNodes={expandedNodes}
        modifiedNamespaceTopics={modifiedNamespaceTopics}
        pinTopics={pinTopics}
        setSelections={setSelections}
        saveConfig={saveConfig}
        transforms={transforms.values()}
        onEditClick={this.onEditClick}
        onToggleShowClick={this.toggleShowTopics}
      />
    );
  }

  render() {
    const { drawingType } = this.state;
    const cursorType = drawingType && drawingType !== CAMERA_TYPE ? "crosshair" : "";

    return (
      <div
        className={styles.container}
        ref={(el) => (this.el = el)}
        style={{ cursor: cursorType }}
        onClick={this.onControlsOverlayClick}>
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
