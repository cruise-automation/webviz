// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { vec3 } from "gl-matrix";
import { omit, mergeWith } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { DEFAULT_CAMERA_STATE, cameraStateSelectors, type Vec3, type Vec4, type CameraState } from "regl-worldview";

import { registerMarkerProvider, unregisterMarkerProvider } from "webviz-core/src/actions/extensions";
import GlobalVariablesAccessor from "webviz-core/src/components/GlobalVariablesAccessor";
import { FrameCompatibility } from "webviz-core/src/components/MessageHistory/FrameCompatibility";
import { MessagePipelineConsumer, type MessagePipelineContext } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import helpContent from "webviz-core/src/panels/ThreeDimensionalViz/index.help.md";
import Layout from "webviz-core/src/panels/ThreeDimensionalViz/Layout";
import type { TopicSettingsCollection } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import treeBuilder, { Selections } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/treeBuilder";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import withTransforms from "webviz-core/src/panels/ThreeDimensionalViz/withTransforms";
import type { SaveConfig } from "webviz-core/src/types/panels";
import type { Frame, Topic } from "webviz-core/src/types/players";
import type { MarkerProvider } from "webviz-core/src/types/Scene";
import { TRANSFORM_TOPIC } from "webviz-core/src/util/globalConstants";
import { emptyPose } from "webviz-core/src/util/Pose";

export type ThreeDimensionalVizConfig = {
  autoTextBackgroundColor?: boolean,
  checkedNodes: string[],
  expandedNodes: string[],
  cameraState: $Shape<CameraState>,
  followTf?: string | false,
  followOrientation?: boolean,
  topicSettings: TopicSettingsCollection,
  modifiedNamespaceTopics: string[],
  pinTopics: boolean,
  savedPropsVersion?: ?number, // eslint-disable-line react/no-unused-prop-types
  // legacy props
  hideMap?: ?boolean, // eslint-disable-line react/no-unused-prop-types
  useHeightMap?: ?boolean, // eslint-disable-line react/no-unused-prop-types
  follow?: boolean,
  flattenMarkers?: boolean,
};

export type Props = {
  topics: Topic[],
  frame: Frame,
  transforms: Transforms,
  // these come from savedProps
  config: ThreeDimensionalVizConfig,

  // For other panels that wrap this one.
  helpContent: React.Node | string,

  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  setSubscriptions: (string[]) => void,
  registerMarkerProvider: (MarkerProvider) => void,
  unregisterMarkerProvider: (MarkerProvider) => void,
  mouseClick: ({}) => void,
  cleared?: boolean,
};

// Hold selections in the top level panel state.
// This allows the check/uncheck logic to easily propagate out from the TopicSelector sub-component
// (by calling setSelections) while still providing the current selections in a top-down manner
// so they can be consumed elsewhere in the 3D Viz panel.
type State = {|
  selections: Selections,
  topics: Topic[],
  checkedNodes: string[],
  cameraState: CameraState,

  // Store last seen target pose because the target may become available/unavailable over time as
  // the player changes, and we want to avoid moving the camera when it disappears.
  lastTargetPose: ?{|
    target: Vec3,
    targetOrientation: Vec4,
  |},
|};

const ZOOM_LEVEL_URL_PARAM = "zoom";

const getZoomDistanceFromURLParam = (): number | void => {
  const params = new URLSearchParams(location && location.search);
  if (params.has(ZOOM_LEVEL_URL_PARAM)) {
    return parseFloat(params.get(ZOOM_LEVEL_URL_PARAM));
  }
};

// Get the camera target position and orientation
function getTargetPose(followTf?: string | false, transforms: Transforms) {
  if (followTf) {
    let pose = emptyPose();
    pose = transforms.apply(pose, pose, followTf, transforms.rootOfTransform(followTf).id);
    if (pose) {
      const { x: px, y: py, z: pz } = pose.position;
      const { x: ox, y: oy, z: oz, w: ow } = pose.orientation;
      return {
        target: [px, py, pz],
        targetOrientation: [ox, oy, oz, ow],
      };
    }
  }
  return null;
}

// Return targetOffset and thetaOffset that would yield the same camera position as the
// given offsets if the target were (0,0,0) and targetOrientation were identity.
function getEquivalentOffsetsWithoutTarget(
  offsets: { +targetOffset: Vec3, +thetaOffset: number },
  targetPose: { +target: Vec3, +targetOrientation: Vec4 },
  followingOrientation?: boolean
): { targetOffset: Vec3, thetaOffset: number } {
  const heading = followingOrientation
    ? cameraStateSelectors.targetHeading({ targetOrientation: targetPose.targetOrientation })
    : 0;
  const targetOffset = vec3.rotateZ([0, 0, 0], offsets.targetOffset, [0, 0, 0], -heading);
  vec3.add(targetOffset, targetOffset, targetPose.target);
  const thetaOffset = offsets.thetaOffset + heading;
  return { targetOffset, thetaOffset };
}

export class Renderer extends React.Component<Props, State> {
  static displayName = "ThreeDimensionalViz";
  static panelType = "3D Panel";
  static defaultConfig = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.defaultConfig;

  state = {
    selections: new Selections(),
    topics: [],
    checkedNodes: [],
    cameraState: DEFAULT_CAMERA_STATE,
    lastTargetPose: undefined,
  };

  onSelectionsChanged = (selections: Selections): void => {
    this.setState({ selections });
  };

  onCameraStateChange = (cameraState: CameraState) => {
    this.props.saveConfig(
      { cameraState: omit(cameraState, ["target", "targetOrientation"]) },
      { keepLayoutInUrl: true }
    );
  };

  onAlignXYAxis = () => {
    const {
      saveConfig,
      config: { cameraState },
    } = this.props;
    saveConfig({
      followOrientation: false,
      cameraState: { ...omit(cameraState, ["target", "targetOrientation"]), thetaOffset: 0 },
    });
  };

  onFollowChange = (newFollowTf?: string | false, newFollowOrientation?: boolean) => {
    const { config, saveConfig, transforms } = this.props;
    const targetPose = getTargetPose(newFollowTf, transforms) || this.state.lastTargetPose;

    const newCameraState = { ...config.cameraState };
    const offsets = {
      targetOffset: config.cameraState.targetOffset,
      thetaOffset: config.cameraState.thetaOffset,
    };

    if (newFollowTf) {
      // When switching to follow orientation, adjust thetaOffset to preserve camera rotation.
      if (newFollowOrientation && !config.followOrientation && targetPose) {
        const heading = cameraStateSelectors.targetHeading({ targetOrientation: targetPose.targetOrientation });
        newCameraState.targetOffset = vec3.rotateZ([0, 0, 0], newCameraState.targetOffset, [0, 0, 0], heading);
        newCameraState.thetaOffset -= heading;
      }
      // When following a frame for the first time, snap to the origin.
      if (!config.followTf) {
        newCameraState.targetOffset = [0, 0, 0];
      }
    } else if (config.followTf && targetPose) {
      // When unfollowing, preserve the camera position and orientation.
      Object.assign(newCameraState, getEquivalentOffsetsWithoutTarget(offsets, targetPose, config.followOrientation));
    }

    saveConfig({
      followTf: newFollowTf,
      followOrientation: newFollowOrientation,
      cameraState: newCameraState,
    });
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State): ?$Shape<State> {
    // don't set state if we're migrating props
    if (
      getGlobalHooks()
        .perPanelHooks()
        .ThreeDimensionalViz.migrateConfig(nextProps)
    ) {
      return null;
    }

    const { config, topics, setSubscriptions, transforms } = nextProps;
    const { checkedNodes, followTf, followOrientation } = config;

    const newState: $Shape<State> = {};

    const newCameraState: $Shape<CameraState> = {};
    const targetPose = getTargetPose(followTf, transforms);

    if (targetPose) {
      newState.lastTargetPose = targetPose;

      newCameraState.target = targetPose.target;
      if (followOrientation) {
        newCameraState.targetOrientation = targetPose.targetOrientation;
      }
    } else if (followTf && prevState.lastTargetPose) {
      // If follow is enabled but no target is available (such as when seeking), keep the camera
      // position the same as it would have beeen by reusing the last seen target pose.
      newCameraState.target = prevState.lastTargetPose.target;
      if (followOrientation) {
        newCameraState.targetOrientation = prevState.lastTargetPose.targetOrientation;
      }
    }

    // Read the distance from URL when World is first loaded with empty cameraState
    let { distance } = config.cameraState;
    if (distance == null) {
      distance = getZoomDistanceFromURLParam();
    }

    newState.cameraState = mergeWith(
      {
        ...config.cameraState,
        ...newCameraState,
        distance,
      },
      DEFAULT_CAMERA_STATE,
      (objVal, srcVal) => (objVal == null ? srcVal : objVal)
    );

    // no need to derive state if topics & checked nodes haven't changed
    if (topics !== prevState.topics || checkedNodes !== prevState.checkedNodes) {
      // build a copy of the tree to determine which topics are active
      const root = treeBuilder({
        topics,
        checkedNodes,
        expandedNodes: [],
        namespaces: [],
        modifiedNamespaceTopics: [],
        transforms: transforms.values(),
      });

      const selections = root.getSelections();
      setSubscriptions(selections.topics);

      const isOpenSource = checkedNodes.length === 1 && checkedNodes[0] === "name:Topics" && topics.length;
      if (isOpenSource) {
        const newCheckedNodes = isOpenSource ? checkedNodes.concat(topics.map((t) => t.name)) : checkedNodes;
        nextProps.saveConfig({ checkedNodes: newCheckedNodes }, { keepLayoutInUrl: true });
      }

      newState.checkedNodes = checkedNodes;
      newState.topics = topics;
      newState.selections = prevState.selections;
    }

    return newState;
  }

  render() {
    const { selections, topics, checkedNodes, cameraState } = this.state;

    return (
      <MessagePipelineConsumer>
        {({ playerState }: MessagePipelineContext) => {
          const currentTime = playerState.activeData ? playerState.activeData.currentTime : { sec: 0, nsec: 0 };
          return (
            <GlobalVariablesAccessor>
              {(globalData) => (
                <Layout
                  helpContent={helpContent} // Can be overridden.
                  {...this.props}
                  {...this.props.config} // TODO(JP): Pass this in separately.
                  globalData={globalData}
                  currentTime={currentTime}
                  selections={selections}
                  topics={topics}
                  checkedNodes={checkedNodes}
                  setSelections={this.onSelectionsChanged}
                  cameraState={cameraState}
                  onCameraStateChange={this.onCameraStateChange}
                  onFollowChange={this.onFollowChange}
                  onAlignXYAxis={this.onAlignXYAxis}
                />
              )}
            </GlobalVariablesAccessor>
          );
        }}
      </MessagePipelineConsumer>
    );
  }
}

export const frameCompatibilityOptionsThreeDimensionalViz = {
  // always subscribe to critical topics
  topics: [
    ...getGlobalHooks().perPanelHooks().ThreeDimensionalViz.topics,
    TRANSFORM_TOPIC,
    ...getGlobalHooks().perPanelHooks().ThreeDimensionalViz.getMetadata.topics,
  ],
  dontRemountOnSeek: true, // SceneBuilder is doing its own state management.
};

export default Panel<ThreeDimensionalVizConfig>(
  FrameCompatibility(
    withTransforms(
      connect(
        (state) => ({
          extensions: state.extensions,
        }),
        { registerMarkerProvider, unregisterMarkerProvider }
      )(Renderer)
    ),
    frameCompatibilityOptionsThreeDimensionalViz
  )
);
