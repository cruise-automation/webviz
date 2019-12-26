// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { some, mapValues } from "lodash";
import type { Time } from "rosbag";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import MessageCollector from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/MessageCollector";
import {
  parseColorSetting,
  getTopicSettings,
  LINED_CONVEX_HULL_RENDERING_SETTING,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { Topic, Frame, Message } from "webviz-core/src/players/types";
import type { Marker, Namespace, OccupancyGridMessage, Pose } from "webviz-core/src/types/Messages";
import type { MarkerProvider, MarkerCollector, Scene } from "webviz-core/src/types/Scene";
import Bounds from "webviz-core/src/util/Bounds";
import { POSE_MARKER_SCALE } from "webviz-core/src/util/globalConstants";
import { emptyPose } from "webviz-core/src/util/Pose";
import reportError from "webviz-core/src/util/reportError";
import { fromSec } from "webviz-core/src/util/time";

export type TopicSettingsCollection = {
  [topic: string]: any,
};

// builds a syntehtic arrow marker from a geometry_msgs/PoseStamped
// these pose sizes were manually configured in rviz; for now we hard-code them here
export function buildSyntheticArrowMarker(msg: any, flattenedZHeightPose: ?Pose) {
  msg.message.pose = getGlobalHooks()
    .perPanelHooks()
    .ThreeDimensionalViz.getMessagePose(msg, flattenedZHeightPose);
  return {
    type: 103,
    header: msg.message.header,
    pose: msg.message.pose,
    scale: POSE_MARKER_SCALE,
    color: getGlobalHooks()
      .perPanelHooks()
      .ThreeDimensionalViz.getSyntheticArrowMarkerColor(msg.topic),
  };
}

export type ErrorDetails = {| frameIds: Set<string>, namespaces: Set<string> |};

export type SceneErrors = {
  topicsMissingFrameIds: Map<string, ErrorDetails>,
  topicsMissingTransforms: Map<string, ErrorDetails>,
  topicsWithBadFrameIds: Map<string, ErrorDetails>,
  topicsWithError: Map<string, string>,
  rootTransformID: string,
};

type SceneErrorTopics = {
  topicsWithBadFrameIds: Set<string>,
};

type SelectedNamespacesByTopic = { [topicName: string]: string[] };
// constructs a scene containing all objects to be rendered
// by consuming visualization topics from frames
export default class SceneBuilder implements MarkerProvider {
  topics: Topic[] = [];
  markers: Marker[] = [];
  transforms: Transforms;
  rootTransformID: string;
  selectionState: any = {};
  frame: Frame;
  errors: SceneErrors = {
    rootTransformID: "",
    topicsMissingFrameIds: new Map(),
    topicsMissingTransforms: new Map(),
    topicsWithBadFrameIds: new Map(),
    topicsWithError: new Map(),
  };
  reportedErrorTopics: SceneErrorTopics = {
    topicsWithBadFrameIds: new Set(),
  };
  maps = [];
  flattenedZHeightPose: ?Pose = null;
  scene = {};
  collectors: { [string]: MessageCollector } = {};
  _clock: Time;
  _playerId: ?string = null;
  _topicSettings: TopicSettingsCollection = {};

  allNamespaces: Namespace[] = [];
  // TODO(Audrey): remove enabledNamespaces once we release topic groups
  enabledNamespaces: Namespace[] = [];
  selectedNamespacesByTopic: ?{ [topicName: string]: Set<string> };
  flatten: boolean = false;
  bounds: Bounds = new Bounds();

  // list of topics that need to be rerendered because the frame has new values
  // or because a prop affecting its rendering was changed
  topicsToRender: Set<string> = new Set();

  // stored message arrays allowing used to re-render topics even when the latest
  // frame does not not contain that topic
  lastSeenMessages: { [string]: Message[] } = {};

  setTransforms = (transforms: Transforms, rootTransformID: string) => {
    this.transforms = transforms;
    this.rootTransformID = rootTransformID;
    this.errors.rootTransformID = rootTransformID;
  };

  clear() {
    for (const topic of this.topics) {
      const collector = this.collectors[topic.name];
      if (collector) {
        collector.flush();
      }
    }
  }

  setPlayerId(playerId: string) {
    if (this._playerId !== playerId) {
      this.reportedErrorTopics.topicsWithBadFrameIds.clear();
    }
    this._playerId = playerId;
  }

  setTopicSettings(settings: TopicSettingsCollection) {
    this._topicSettings = settings;
  }

  // set the topics the scene builder should consume from each frame
  setTopics(topics: Topic[]) {
    this.topics = topics;
    // IMPORTANT: when topics change, we also need to reset the frame so that
    // setFrame gets called correctly to set the topicsToRender and lastSeenMessages
    this.frame = {};
    // TODO(bmc):  delete message collectors we don't need anymore
  }

  setFrame(frame: Frame) {
    if (this.frame === frame) {
      return;
    }
    this.frame = frame;
    for (const topic of this.topics) {
      if (topic.name in frame) {
        this.topicsToRender.add(topic.name);
      }
    }

    // Note we save even topics that are not rendered since they may be used by non-rendered topics
    Object.assign(this.lastSeenMessages, frame);
  }

  setFlattenMarkers(flatten: boolean): void {
    this.flatten = flatten;
  }

  setEnabledNamespaces(namespaces: Namespace[]) {
    this.enabledNamespaces = namespaces;
  }

  setSelectedNamespacesByTopic(selectedNamespacesByTopic: SelectedNamespacesByTopic) {
    this.selectedNamespacesByTopic = mapValues(selectedNamespacesByTopic, (namespaces) => new Set(namespaces));
  }

  setGlobalVariables = (globalVariables: any = {}) => {
    const { selectionState, topicsToRender } = getGlobalHooks()
      .perPanelHooks()
      .ThreeDimensionalViz.setGlobalVariablesInSceneBuilder(
        globalVariables,
        this.selectionState,
        this.topicsToRender,
        this.topics
      );
    this.selectionState = selectionState;
    this.topicsToRender = topicsToRender;
  };

  hasErrors() {
    const { topicsMissingFrameIds, topicsMissingTransforms, topicsWithBadFrameIds, topicsWithError } = this.errors;
    return (
      topicsMissingFrameIds.size !== 0 ||
      topicsMissingTransforms.size !== 0 ||
      topicsWithBadFrameIds.size !== 0 ||
      topicsWithError.size !== 0
    );
  }

  _addError(map: Map<string, ErrorDetails>, topic: string): ErrorDetails {
    let values = map.get(topic);
    if (!values) {
      values = { namespaces: new Set(), frameIds: new Set() };
      map.set(topic, values);
    }
    return values;
  }

  // keep a unique set of all seen namespaces
  _consumeNamespace(topic: string, name: string) {
    if (some(this.allNamespaces, (ns) => ns.topic === topic && ns.name === name)) {
      return;
    }
    this.allNamespaces = this.allNamespaces.concat([{ topic, name }]);
  }

  // Only public for tests.
  namespaceIsEnabled(topic: string, name: string) {
    if (this.selectedNamespacesByTopic) {
      // enable all namespaces under a topic if it's not already set
      return (
        (this.selectedNamespacesByTopic[topic] && this.selectedNamespacesByTopic[topic].has(name)) ||
        this.selectedNamespacesByTopic[topic] == null
      );
    }
    return some(this.enabledNamespaces, (ns) => ns.topic === topic && ns.name === name);
  }

  _reportBadFrameId(topic: string) {
    if (!this.reportedErrorTopics.topicsWithBadFrameIds.has(topic)) {
      this.reportedErrorTopics.topicsWithBadFrameIds.add(topic);
      reportError(
        `Topic ${topic} has bad frame`,
        "Non-root transforms may be out of sync, since webviz uses the latest transform message instead of the one matching header.stamp",
        "user"
      );
    }
  }

  _transformAndCloneMarker = (topic: string, marker: Marker) => {
    const { frame_id } = marker.header;

    if (!frame_id) {
      const error = this._addError(this.errors.topicsMissingFrameIds, topic);
      error.namespaces.add(marker.ns);
      return null;
    }

    if (frame_id !== this.rootTransformID) {
      this._reportBadFrameId(topic);
      const error = this._addError(this.errors.topicsWithBadFrameIds, topic);
      error.namespaces.add(marker.ns);
      error.frameIds.add(frame_id);
      // We continue to render these, though they may be inaccurate
    }

    const sourcePose = marker.pose;
    const pose = this.transforms.apply(emptyPose(), sourcePose, frame_id, this.rootTransformID);
    if (!pose) {
      const error = this._addError(this.errors.topicsMissingTransforms, topic);
      error.namespaces.add(marker.ns);
      error.frameIds.add(frame_id);
      return null;
    }

    return {
      ...marker,
      pose,
    };
  };

  _consumeMarkerArray = (topic: string, message: any): void => {
    for (let i = 0; i < message.markers.length; i++) {
      this._consumeMarker(topic, message.markers[i]);
    }
  };

  _consumeMarker(topic: string, message: Marker): void {
    if (message.ns) {
      this._consumeNamespace(topic, message.ns);
    }

    // Every marker needs a name property as a unique id. In each topic, the namespace (`ns`) and
    // identifier (`id`) uniquely identify the marker.
    // See https://github.com/ros-visualization/rviz/blob/4b6c0f4/src/rviz/default_plugin/markers/marker_base.h#L56
    // and https://github.com/ros-visualization/rviz/blob/4b6c0f4/src/rviz/default_plugin/marker_display.cpp#L422
    const name = `${topic}/${message.ns}/${message.id}`;
    switch (message.action) {
      case 0: // add
        break;
      case 1: // deprecated in ros
        this.errors.topicsWithError.set(topic, "Marker.action=1 is deprecated");
        return;
      case 2: // delete
        this.collectors[topic].deleteMarker(name);
        return;
      case 3:
        this.collectors[topic].deleteAll();
        return;
      default:
        this.errors.topicsWithError.set(topic, `Unsupported action type: ${message.action}`);
        return;
    }

    const marker = this._transformAndCloneMarker(topic, message);
    if (!marker) {
      return;
    }

    marker.name = name;
    const { points } = (marker: any);

    let minZ = Number.MAX_SAFE_INTEGER;

    // if the marker has points, adjust bounds by the points
    if (points && points.length) {
      points.forEach((point) => {
        const x = point.x + marker.pose.position.x;
        const y = point.y + marker.pose.position.y;
        const z = point.z + marker.pose.position.z;
        minZ = Math.min(minZ, point.z);
        this.bounds.update({ x, y, z });
      });
    } else {
      // otherwise just adjust by the pose
      minZ = Math.min(minZ, marker.pose.position.z);
      this.bounds.update(marker.pose.position);
    }

    // if the minimum z value of any point (or the pose) is exactly 0
    // then assume this marker can be flattened
    if (minZ === 0 && this.flatten && this.flattenedZHeightPose) {
      marker.pose.position.z = this.flattenedZHeightPose.position.z;
    }

    // HACK(jacob): rather than hard-coding this, we should
    //  (a) produce this visualization dynamically from a non-marker topic
    //  (b) fix translucency so it looks correct (harder)
    marker.color = getGlobalHooks()
      .perPanelHooks()
      .ThreeDimensionalViz.getMarkerColor(topic, marker.color);

    // allow topic settings to override marker color (see MarkerSettingsEditor.js)
    const { overrideColor } = this._topicSettings[topic] || {};
    if (overrideColor) {
      marker.color = parseColorSetting(overrideColor);
      marker.colors = [];
    }

    this.collectors[topic].addMarker(topic, marker);
  }

  _consumeOccupancyGrid = (topic: string, message: OccupancyGridMessage): void => {
    const { frame_id } = message.header;

    if (!frame_id) {
      this._addError(this.errors.topicsMissingFrameIds, topic);
      return;
    }

    if (frame_id !== this.rootTransformID) {
      this._reportBadFrameId(topic);
      const error = this._addError(this.errors.topicsWithBadFrameIds, topic);
      error.frameIds.add(frame_id);
    }

    let pose = emptyPose();
    pose = this.transforms.apply(pose, pose, frame_id, this.rootTransformID);
    if (!pose) {
      const error = this._addError(this.errors.topicsMissingTransforms, topic);
      error.frameIds.add(frame_id);
      return;
    }

    const type = 101;
    // every marker needs a name property as a unique id
    const name = `${topic}/${message.type}`;

    // set ogrid texture & alpha based on current rviz settings
    // in the future these will be customizable via the UI
    const [alpha, map] = getGlobalHooks()
      .perPanelHooks()
      .ThreeDimensionalViz.getOccupancyGridValues(topic);

    const mappedMessage = {
      ...message,
      alpha,
      map,
      type,
      name,
      pose,
    };

    // if we neeed to flatten the ogrid clone the position and change the z to match the flattenedZHeightPose
    if (mappedMessage.info.origin.position.z === 0 && this.flattenedZHeightPose && this.flatten) {
      mappedMessage.info.origin.position = {
        ...mappedMessage.info.origin.position,
        z: this.flattenedZHeightPose.position.z,
      };
    }
    this.collectors[topic].addMessage(topic, mappedMessage);
  };

  _consumeNonMarkerMessage = (topic: string, message: any, type: number): void => {
    const sourcePose = emptyPose();
    const pose = this.transforms.apply(sourcePose, sourcePose, message.header.frame_id, this.rootTransformID);
    if (!pose) {
      const error = this._addError(this.errors.topicsMissingTransforms, topic);
      error.frameIds.add(message.header.frame_id);
      return;
    }

    const decayTimeInSec = (this._topicSettings[topic] && this._topicSettings[topic].decayTime) || 0;
    const mappedMessage = {
      ...message,
      name: `${topic}/${message.type}`,
      type,
      pose,
      lifetime: fromSec(decayTimeInSec),
    };

    this.collectors[topic].addMessage(topic, mappedMessage);
  };

  setCurrentTime = (currentTime: { sec: number, nsec: number }) => {
    this.bounds.reset();

    this._clock = currentTime;
    // set the new clock value in all existing collectors
    // including those for topics not included in this frame,
    // so each can expire markers if they need to
    for (const key in this.collectors) {
      const collector = this.collectors[key];
      collector.setClock(this._clock);
    }
  };

  // extracts renderable markers from the ros frame
  render() {
    this.flattenedZHeightPose =
      getGlobalHooks()
        .perPanelHooks()
        .ThreeDimensionalViz.getFlattenedPose(this.frame) || this.flattenedZHeightPose;

    if (this.flattenedZHeightPose && this.flattenedZHeightPose.position) {
      this.bounds.update(this.flattenedZHeightPose.position);
    }
    for (const topic of this.topicsToRender) {
      try {
        this._consumeTopic(topic);
      } catch (error) {
        this.errors.topicsWithError.set(topic, error.toString());
      }
    }
    this.topicsToRender.clear();
  }

  _consumeMessage = (topic: string, msg: Message): void => {
    const { message, datatype } = msg;
    const SUPPORTED_MARKER_DATATYPES = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.SUPPORTED_MARKER_DATATYPES;

    switch (datatype) {
      case SUPPORTED_MARKER_DATATYPES.VISUALIZATION_MSGS_MARKER_DATATYPE:
        this._consumeMarker(topic, message);
        break;
      case SUPPORTED_MARKER_DATATYPES.VISUALIZATION_MSGS_MARKER_ARRAY_DATATYPE:
        this._consumeMarkerArray(topic, message);
        break;
      case SUPPORTED_MARKER_DATATYPES.POSE_STAMPED_DATATYPE:
        // make synthetic arrow marker from the stamped pose
        this.collectors[topic].addMessage(topic, buildSyntheticArrowMarker(msg, this.flattenedZHeightPose));
        break;
      case SUPPORTED_MARKER_DATATYPES.NAV_MSGS_OCCUPANCY_GRID_DATATYPE:
        // flatten btn: set empty z values to be at the same level as the flattenedZHeightPose
        this._consumeOccupancyGrid(topic, message);
        break;
      case SUPPORTED_MARKER_DATATYPES.POINT_CLOUD_DATATYPE:
        this._consumeNonMarkerMessage(topic, message, 102);
        break;
      case SUPPORTED_MARKER_DATATYPES.SENSOR_MSGS_LASER_SCAN_DATATYPE:
        this._consumeNonMarkerMessage(topic, message, 104);
        break;
      case SUPPORTED_MARKER_DATATYPES.GEOMETRY_MSGS_POLYGON_STAMPED_DATATYPE: {
        // convert Polygon to a line strip
        const { polygon } = message;
        if (polygon.points.length === 0) {
          break;
        }
        const newMessage = {
          ...message,
          points: polygon.points,
          closed: true,
          scale: { x: 0.2 },
          color: { r: 0, g: 1, b: 0, a: 1 },
        };
        this._consumeNonMarkerMessage(topic, newMessage, 4 /* line strip */);
        break;
      }
      default: {
        const { flattenedZHeightPose, collectors, errors, lastSeenMessages, selectionState } = this;
        getGlobalHooks()
          .perPanelHooks()
          .ThreeDimensionalViz.consumeMessage(
            topic,
            msg,
            {
              consumeMarkerArray: this._consumeMarkerArray,
              consumeNonMarkerMessage: this._consumeNonMarkerMessage,
            },
            { flattenedZHeightPose, collectors, errors, lastSeenMessages, selectionState }
          );
      }
    }
  };

  _consumeTopic = (topic: string) => {
    const messages = this.frame[topic] || this.lastSeenMessages[topic];
    if (!messages) {
      return;
    }

    this.errors.topicsMissingFrameIds.delete(topic);
    this.errors.topicsMissingTransforms.delete(topic);
    this.errors.topicsWithBadFrameIds.delete(topic);
    this.errors.topicsWithError.delete(topic);
    this.collectors[topic] = this.collectors[topic] || new MessageCollector();
    this.collectors[topic].setClock(this._clock);
    this.collectors[topic].flush();

    for (let i = 0; i < messages.length; i++) {
      this._consumeMessage(topic, messages[i]);
    }
  };

  getScene(): Scene {
    return {
      bounds: this.bounds,
      flattenedZHeightPose: this.flattenedZHeightPose,
    };
  }

  renderMarkers(add: MarkerCollector) {
    for (const topic of this.topics) {
      const collector = this.collectors[topic.name];
      if (!collector) {
        continue;
      }
      const topicMarkers = collector.getMessages();
      for (const message of topicMarkers) {
        const marker: any = message;
        if (marker.ns) {
          if (!this.namespaceIsEnabled(topic.name, marker.ns)) {
            continue;
          }
        }
        // TODO(bmc): once we support more topic settings
        // flesh this out to be more marker type agnostic
        const settings = getTopicSettings(topic, this._topicSettings[topic.name]);
        if (settings) {
          marker.settings = settings;
        }
        this._addMarkerToCollector(add, topic, marker);
      }
    }
  }

  _addMarkerToCollector(add: MarkerCollector, topic: Topic, originalMarker: any) {
    let marker = originalMarker;
    switch (marker.type) {
      case 1:
      case 2:
      case 3:
        marker = { ...marker, points: undefined };
        break;
      case 4:
        marker = { ...marker, primitive: "line strip" };
        break;
      case 6:
        marker = { ...marker, primitive: "lines" };
        break;
    }
    marker = { ...marker, interactionData: { topic: topic.name } };

    // allow topic settings to override renderable marker command (see MarkerSettingsEditor.js)
    const { overrideCommand } = getTopicSettings(topic, this._topicSettings[topic.name]);

    // prettier-ignore
    switch (marker.type) {
      case 0: return add.arrow(marker);
      case 1: return add.cube(marker);
      case 2: return add.sphere(marker);
      case 3: return add.cylinder(marker);
      case 4:
        if (overrideCommand === LINED_CONVEX_HULL_RENDERING_SETTING) {
          return add.linedConvexHull(marker);
        }
        return add.lineStrip(marker);
      case 5:
        if (overrideCommand === LINED_CONVEX_HULL_RENDERING_SETTING) {
          return add.linedConvexHull(marker);
        }
        return add.lineList(marker);
      case 6: return add.cubeList(marker);
      case 7: return add.sphereList(marker);
      case 8: return add.points(marker);
      case 9: return add.text(marker);
      // mesh resource not supported
      case 11: return add.triangleList(marker);
      case 101: return add.grid(marker);
      case 102: return add.pointcloud(marker);
      case 103: return add.poseMarker(marker);
      case 104: return add.laserScan(marker);
      case 107: return add.filledPolygon(marker);
      case 108: return add.instancedLineList(marker);
      default: {
        getGlobalHooks()
          .perPanelHooks()
          .ThreeDimensionalViz.addMarkerToCollector(add, topic.name, marker, this.errors);
      }
    }
  }
}
