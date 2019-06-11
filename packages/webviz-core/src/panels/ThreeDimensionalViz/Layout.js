// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BugIcon from "@mdi/svg/svg/bug.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import RulerIcon from "@mdi/svg/svg/ruler.svg";
import Video3dIcon from "@mdi/svg/svg/video-3d.svg";
import cx from "classnames";
import { vec3, quat } from "gl-matrix";
import * as React from "react";
import Draggable from "react-draggable";
import KeyListener from "react-key-listener";
import { cameraStateSelectors, type CameraState, type ReglClickInfo, type MouseHandler } from "regl-worldview";

import type { ThreeDimensionalVizConfig } from ".";
import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import CameraInfo from "webviz-core/src/panels/ThreeDimensionalViz/CameraInfo";
import DebugStats from "webviz-core/src/panels/ThreeDimensionalViz/DebugStats";
import FollowTFControl from "webviz-core/src/panels/ThreeDimensionalViz/FollowTFControl";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import MeasuringTool, { type MeasureInfo } from "webviz-core/src/panels/ThreeDimensionalViz/MeasuringTool";
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
import colors from "webviz-core/src/styles/colors.module.scss";
import type { SaveConfig } from "webviz-core/src/types/panels";
import type { Frame, Topic } from "webviz-core/src/types/players";
import type { MarkerCollector, MarkerProvider } from "webviz-core/src/types/Scene";
import videoRecordingMode from "webviz-core/src/util/videoRecordingMode";

type Props = {
  autoTextBackgroundColor?: boolean,
  selections: Selections,
  frame?: Frame,
  transforms: Transforms,
  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  followTf?: string | false,
  followOrientation: boolean,
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
  showCameraPosition?: ?boolean,
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
  showCameraPosition: boolean,
  showTopics: boolean,
  metadata: Object,
  editTipX: ?number,
  editTipY: ?number,
  editTopic: ?Topic,
  measureInfo: MeasureInfo,
};

class MainToolbar extends React.PureComponent<{|
  perspective: boolean,
  measuringTool: ?MeasuringTool,
  measureInfo: MeasureInfo,
  debug: boolean,
  onToggleCameraMode: () => void,
  onToggleDebug: () => void,
|}> {
  render() {
    const {
      measuringTool,
      measureInfo: { measureState },
      debug,
      onToggleCameraMode,
      onToggleDebug,
      perspective = false,
    } = this.props;
    const cameraModeTip = perspective ? "Switch to 2D camera" : "Switch to 3D camera";
    const measureActive = measureState === "place-start" || measureState === "place-finish";

    return (
      <div className={styles.buttons}>
        <Button tooltip={cameraModeTip} onClick={onToggleCameraMode}>
          <Icon style={{ color: perspective ? colors.accent : "white" }}>
            <Video3dIcon />
          </Icon>
        </Button>
        <Button
          disabled={perspective}
          tooltip={
            perspective
              ? "Switch to 2D Camera to Measure Distance"
              : measureActive
              ? "Cancel Measuring"
              : "Measure Distance"
          }
          onClick={measuringTool ? measuringTool.toggleMeasureState : undefined}>
          <Icon
            style={{
              color: measureActive ? colors.accent : perspective ? undefined : "white",
            }}>
            <RulerIcon />
          </Icon>
        </Button>
        {process.env.NODE_ENV === "development" && (
          <Button tooltip="Debug" onClick={onToggleDebug}>
            <Icon style={{ color: debug ? colors.accent : "white" }}>
              <BugIcon />
            </Icon>
          </Button>
        )}
      </div>
    );
  }
}

export default class Layout extends React.Component<Props, State> implements MarkerProvider {
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
    sceneBuilder: new SceneBuilder(),
    transformsBuilder: new TransformsBuilder(),
    cachedTopicSettings: {},
    editedTopics: [],
    debug: false,
    showCameraPosition: !!this.props.showCameraPosition,
    showTopics: false,
    metadata: {},
    editTipX: undefined,
    editTipY: undefined,
    editTopic: undefined,
    measureInfo: {
      measureState: "idle",
      measurePoints: { start: null, end: null },
    },
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

  onMouseDown: MouseHandler = (e, args: ?ReglClickInfo) => {
    const handler = this.measuringTool && this.measuringTool.canvasMouseDown;
    if (handler && args) {
      return handler(e, args);
    }
    const { onMouseDown } = this.props;
    if (onMouseDown) {
      onMouseDown(e, args);
    }
  };

  onMouseUp: MouseHandler = (e, args: ?ReglClickInfo) => {
    const handler = this.measuringTool && this.measuringTool.canvasMouseUp;
    if (handler && args) {
      return handler(e, args);
    }
    const { onMouseUp } = this.props;
    if (onMouseUp) {
      onMouseUp(e, args);
    }
  };

  onMouseMove: MouseHandler = (e, args: ?ReglClickInfo) => {
    const handler = this.measuringTool && this.measuringTool.canvasMouseMove;
    if (handler && args) {
      return handler(e, args);
    }
    const { onMouseMove } = this.props;
    if (onMouseMove) {
      onMouseMove(e, args);
    }
  };

  onDoubleClick: MouseHandler = (e, args: ?ReglClickInfo) => {
    const { onDoubleClick } = this.props;
    if (onDoubleClick) {
      onDoubleClick(e, args);
    }
  };

  keyDownHandlers = {
    "3": () => {
      this.toggleCameraMode();
    },
  };

  toggleCameraMode = () => {
    const { cameraState, saveConfig } = this.props;
    const perspective = !cameraState.perspective;

    saveConfig({ cameraState: { ...cameraState, perspective } });
    if (this.measuringTool && perspective) {
      this.measuringTool.reset();
    }
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
      onCameraStateChange,
      transforms,
      followTf,
      followOrientation,
      onAlignXYAxis,
      saveConfig,
    } = this.props;
    const { measureInfo, showCameraPosition } = this.state;

    return (
      <div className={cx(styles.toolbar, styles.right)}>
        <div className={styles.buttons}>
          <FollowTFControl
            transforms={transforms}
            tfToFollow={followTf ? followTf : undefined}
            followingOrientation={followOrientation}
            onFollowChange={this.props.onFollowChange}
          />
        </div>
        <MainToolbar
          perspective={perspective}
          measureInfo={measureInfo}
          measuringTool={this.measuringTool}
          debug={this.state.debug}
          onToggleCameraMode={this.toggleCameraMode}
          onToggleDebug={this.toggleDebug}
        />
        <CameraInfo
          cameraState={cameraState}
          expanded={showCameraPosition}
          onExpand={(expanded) => this.setState({ showCameraPosition: expanded })}
          onCameraStateChange={onCameraStateChange}
          followTf={followTf}
          followOrientation={followOrientation}
          onAlignXYAxis={onAlignXYAxis}
          saveConfig={saveConfig}
        />
        {this.measuringTool && this.measuringTool.measureDistance}
      </div>
    );
  }

  render3d() {
    const { sceneBuilder, transformsBuilder, debug, metadata } = this.state;
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

    return (
      <WorldComponent
        autoTextBackgroundColor={!!autoTextBackgroundColor}
        cameraState={cameraState}
        debug={debug}
        markerProviders={extensions.markerProviders.concat([sceneBuilder, this.measuringTool, transformsBuilder, this])}
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
        {process.env.NODE_ENV !== "production" && !inScreenshotTests() && <DebugStats />}
      </WorldComponent>
    );
  }

  // draw a crosshair to show the center of the viewport
  renderMarkers(add: MarkerCollector) {
    const { cameraState } = this.props;
    if (!this.state.showCameraPosition || cameraState.perspective) {
      return;
    }
    if (!cameraState) {
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
    const { measureState, measurePoints } = this.state.measureInfo;
    const cursorType = measureState === "place-start" || measureState === "place-finish" ? "crosshair" : "";

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
          onMeasureInfoChange={(measureInfo) => this.setState({ measureInfo })}
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
