// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import _, { flatten, groupBy, isEqual, keyBy, mapValues, some } from "lodash";
import type { Time } from "rosbag";
import shallowequal from "shallowequal";

import type { GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { type InteractionData } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import MessageCollector from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/MessageCollector";
import type { MarkerMatcher } from "webviz-core/src/panels/ThreeDimensionalViz/ThreeDimensionalVizContext";
import { getSceneErrorsByTopic } from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsUtils";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import { cast, type Topic, type Frame, type Message } from "webviz-core/src/players/types";
import type {
  LaserScan,
  Marker,
  Namespace,
  NavMsgs$OccupancyGrid,
  MutablePose,
  PointCloud2,
  Pose,
  StampedMessage,
} from "webviz-core/src/types/Messages";
import type { MarkerProvider, MarkerCollector, Scene } from "webviz-core/src/types/Scene";
import Bounds from "webviz-core/src/util/Bounds";
import { POSE_MARKER_SCALE, LINED_CONVEX_HULL_RENDERING_SETTING } from "webviz-core/src/util/globalConstants";
import naturalSort from "webviz-core/src/util/naturalSort";
import { emptyPose } from "webviz-core/src/util/Pose";
import sendNotification from "webviz-core/src/util/sendNotification";
import { fromSec } from "webviz-core/src/util/time";

//
const NON_HIGHLIGHTED_MARKER_ALPHA = 0.25;

export type TopicSettingsCollection = {
  [topicOrNamespaceKey: string]: any,
};

// builds a syntehtic arrow marker from a geometry_msgs/PoseStamped
// these pose sizes were manually configured in rviz; for now we hard-code them here
export function buildSyntheticArrowMarker(topic: string, msg: any, flattenedZHeightPose: ?Pose) {
  return {
    type: 103,
    header: msg.message.header,
    pose: getGlobalHooks()
      .perPanelHooks()
      .ThreeDimensionalViz.getMessagePose(msg, flattenedZHeightPose),
    scale: POSE_MARKER_SCALE,
    color: getGlobalHooks()
      .perPanelHooks()
      .ThreeDimensionalViz.getSyntheticArrowMarkerColor(msg.topic),
    interactionData: { topic, originalMessage: msg },
  };
}

// TODO(JP): looks like we might not actually use these fields in the new topic picker?
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

type MarkerMatchersByTopic = { [string]: Array<MarkerMatcher> };

export default class SceneBuilder implements MarkerProvider {
  topicsByName: { [topicName: string]: Topic } = {};
  markers: Marker[] = [];
  transforms: Transforms;
  rootTransformID: string;
  selectionState: any = {};
  frame: Frame;
  // TODO(JP): Get rid of these two different variables `errors` and `errorsByTopic` which we
  // have to keep in sync.
  errors: SceneErrors = {
    rootTransformID: "",
    topicsMissingFrameIds: new Map(),
    topicsMissingTransforms: new Map(),
    topicsWithBadFrameIds: new Map(),
    topicsWithError: new Map(),
  };
  errorsByTopic: { [topicName: string]: string[] } = {};
  reportedErrorTopics: SceneErrorTopics = {
    topicsWithBadFrameIds: new Set(),
  };
  maps = [];
  flattenedZHeightPose: ?Pose = null;
  scene = {};
  collectors: { [string]: MessageCollector } = {};
  _clock: Time;
  _playerId: ?string = null;
  _settingsByKey: TopicSettingsCollection = {};
  _onForceUpdate: ?() => void = null;

  // When not-empty, fade any markers that don't match
  _highlightMarkerMatchersByTopic: MarkerMatchersByTopic = {};

  // When not-empty, override the color of matching markers
  _colorOverrideMarkerMatchersByTopic: MarkerMatchersByTopic = {};

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
    for (const topicName of Object.keys(this.topicsByName)) {
      const collector = this.collectors[topicName];
      if (collector) {
        collector.flush();
      }
    }
  }

  setPlayerId(playerId: string) {
    if (this._playerId !== playerId) {
      this.reportedErrorTopics.topicsWithBadFrameIds.clear();
      this.errors = {
        rootTransformID: "",
        topicsMissingFrameIds: new Map(),
        topicsMissingTransforms: new Map(),
        topicsWithBadFrameIds: new Map(),
        topicsWithError: new Map(),
      };
      this._updateErrorsByTopic();
    }
    this._playerId = playerId;
  }

  setSettingsByKey(settings: TopicSettingsCollection) {
    this._settingsByKey = settings;
  }

  // set the topics the scene builder should consume from each frame
  setTopics(topics: Topic[]) {
    const topicsToFlush = Object.keys(this.topicsByName).filter(
      (topicName) => !topics.find((other) => other.name === topicName)
    );
    // Sort the topics by name so the render order is consistent.
    this.topicsByName = keyBy(topics.slice().sort(naturalSort("name")), "name");
    // IMPORTANT: when topics change, we also need to reset the frame so that
    // setFrame gets called correctly to set the topicsToRender and lastSeenMessages
    this.frame = {};
    // Delete message collectors we don't need anymore
    topicsToFlush.forEach((topicName) => {
      const collector = this.collectors[topicName];
      if (collector) {
        collector.flush();
        delete this.collectors[topicName];
      }
    });
  }

  setFrame(frame: Frame) {
    if (this.frame === frame) {
      return;
    }
    this.frame = frame;
    for (const topicName of Object.keys(this.topicsByName)) {
      if (topicName in frame) {
        this.topicsToRender.add(topicName);
      }
    }

    // Note we save even topics that are not rendered since they may be used by non-rendered topics
    Object.assign(this.lastSeenMessages, frame);
  }

  setFlattenMarkers(_flatten: boolean): void {
    this.flatten = _flatten;
  }

  setEnabledNamespaces(namespaces: Namespace[]) {
    this.enabledNamespaces = namespaces;
  }

  setSelectedNamespacesByTopic(selectedNamespacesByTopic: SelectedNamespacesByTopic) {
    this.selectedNamespacesByTopic = mapValues(selectedNamespacesByTopic, (namespaces) => new Set(namespaces));
  }

  setGlobalVariables = ({ globalVariables }: { globalVariables: GlobalVariables }) => {
    const { getSelectionState, getTopicsToRender } = getGlobalHooks().perPanelHooks().ThreeDimensionalViz;
    const prevSelectionState = this.selectionState;
    this.selectionState = getSelectionState(globalVariables);
    this.topicsToRender = getTopicsToRender(prevSelectionState, this.selectionState);
  };

  setHighlightedMatchers(markerMatchers: Array<MarkerMatcher>) {
    const markerMatchersByTopic = groupBy<string, MarkerMatcher>(markerMatchers, ({ topic }) => topic);
    this._addTopicsToRenderForMarkerMatchers(this._highlightMarkerMatchersByTopic, markerMatchers);
    this._highlightMarkerMatchersByTopic = markerMatchersByTopic;
  }

  setColorOverrideMatchers(markerMatchers: Array<MarkerMatcher>) {
    const markerMatchersByTopic = groupBy<string, MarkerMatcher>(markerMatchers, ({ topic }) => topic);
    this._addTopicsToRenderForMarkerMatchers(this._colorOverrideMarkerMatchersByTopic, markerMatchers);
    this._colorOverrideMarkerMatchersByTopic = markerMatchersByTopic;
  }

  _addTopicsToRenderForMarkerMatchers(
    previousMarkerMatchersByTopic: MarkerMatchersByTopic,
    newMarkerMatchers: Array<MarkerMatcher>
  ) {
    const matchersBefore = flatten(Object.keys(previousMarkerMatchersByTopic)).flatMap(
      (topic) => previousMarkerMatchersByTopic[topic]
    );
    // If any of the matchers have changed, we need to rerender all of the topics
    if (!shallowequal(matchersBefore, newMarkerMatchers)) {
      Object.keys(this.topicsByName).forEach((name) => this.topicsToRender.add(name));
    }
  }

  hasErrors() {
    const { topicsMissingFrameIds, topicsMissingTransforms, topicsWithBadFrameIds, topicsWithError } = this.errors;
    return (
      topicsMissingFrameIds.size !== 0 ||
      topicsMissingTransforms.size !== 0 ||
      topicsWithBadFrameIds.size !== 0 ||
      topicsWithError.size !== 0
    );
  }

  setOnForceUpdate(callback: () => void) {
    this._onForceUpdate = callback;
  }

  _addError(map: Map<string, ErrorDetails>, topic: string): ErrorDetails {
    let values = map.get(topic);
    if (!values) {
      values = { namespaces: new Set(), frameIds: new Set() };
      map.set(topic, values);
    }
    this._updateErrorsByTopic();
    return values;
  }

  _setTopicError = (topic: string, message: string) => {
    this.errors.topicsWithError.set(topic, message);
    this._updateErrorsByTopic();
  };

  // Update the field anytime the errors change in order to generate a new object to trigger TopicTree to rerender.
  _updateErrorsByTopic() {
    const errorsByTopic = getSceneErrorsByTopic(this.errors);
    if (!isEqual(this.errorsByTopic, errorsByTopic)) {
      this.errorsByTopic = errorsByTopic;
      if (this._onForceUpdate) {
        this._onForceUpdate();
      }
    }
  }

  // keep a unique set of all seen namespaces
  _consumeNamespace(topic: string, name: string) {
    if (some(this.allNamespaces, (ns) => ns.topic === topic && ns.name === name)) {
      return;
    }
    this.allNamespaces = this.allNamespaces.concat([{ topic, name }]);
    if (this._onForceUpdate) {
      this._onForceUpdate();
    }
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
      sendNotification(
        `Topic ${topic} has bad frame`,
        "Non-root transforms may be out of sync, since webviz uses the latest transform message instead of the one matching header.stamp",
        "user",
        "warn"
      );
    }
  }

  _transformMarkerPose = (topic: string, marker: Marker): ?MutablePose => {
    const { frame_id } = marker.header;

    if (!frame_id) {
      const error = this._addError(this.errors.topicsMissingFrameIds, topic);
      error.namespaces.add(marker.ns);
      return null;
    }

    if (frame_id === this.rootTransformID) {
      // Transforming is a bit expensive, and this (no transformation necessary) is the common-case
      // TODO: Need to deep-clone, callers mutate the result; fix this downstream.
      return {
        position: { ...marker.pose.position },
        orientation: { ...marker.pose.orientation },
      };
    }

    // frame_id !== this.rootTransformID.
    // We continue to render these, though they may be inaccurate
    this._reportBadFrameId(topic);
    const badFrameError = this._addError(this.errors.topicsWithBadFrameIds, topic);
    badFrameError.namespaces.add(marker.ns);
    badFrameError.frameIds.add(frame_id);

    const pose = this.transforms.apply(emptyPose(), marker.pose, frame_id, this.rootTransformID);
    if (!pose) {
      const topicMissingError = this._addError(this.errors.topicsMissingTransforms, topic);
      topicMissingError.namespaces.add(marker.ns);
      topicMissingError.frameIds.add(frame_id);
    }
    return pose;
  };

  _consumeMarkerArray = (topic: string, message: any): void => {
    for (let i = 0; i < message.markers.length; i++) {
      this._consumeMarker(topic, message.markers[i]);
    }
  };

  _consumeMarker(topic: string, message: Marker): void {
    if (message.ns) {
      // Consume namespaces even if the message is later discarded
      // Otherwise, the namespace won't be shown as available.
      this._consumeNamespace(topic, message.ns);
      if (!this.namespaceIsEnabled(topic, message.ns)) {
        return;
      }
    }

    // Marker names are used to identify previously rendered markers for "deletes" and over-writing
    // "adds".
    // In each topic, the namespace (`ns`) and identifier (`id`) uniquely identify the marker.
    // See https://github.com/ros-visualization/rviz/blob/4b6c0f4/src/rviz/default_plugin/markers/marker_base.h#L56
    // and https://github.com/ros-visualization/rviz/blob/4b6c0f4/src/rviz/default_plugin/marker_display.cpp#L422
    const name = `${topic}/${message.ns}/${message.id}`;
    switch (message.action) {
      case 0: // add
        break;
      case 1: // deprecated in ros
        this._setTopicError(topic, "Marker.action=1 is deprecated");
        return;
      case 2: // delete
        this.collectors[topic].deleteMarker(name);
        return;
      case 3:
        this.collectors[topic].deleteAll();
        return;
      default:
        this._setTopicError(topic, `Unsupported action type: ${message.action}`);
        return;
    }

    const pose = this._transformMarkerPose(topic, message);
    if (!pose) {
      return;
    }

    const interactionData: InteractionData = { topic, originalMessage: message };
    const marker = { ...message, interactionData, pose };
    const { points } = (marker: any);
    const { position } = pose;

    let minZ = Number.MAX_SAFE_INTEGER;

    // if the marker has points, adjust bounds by the points
    if (points && points.length) {
      points.forEach((point) => {
        const x = point.x + position.x;
        const y = point.y + position.y;
        const z = point.z + position.z;
        minZ = Math.min(minZ, point.z);
        this.bounds.update({ x, y, z });
      });
    } else {
      // otherwise just adjust by the pose
      minZ = Math.min(minZ, position.z);
      this.bounds.update(position);
    }

    // if the minimum z value of any point (or the pose) is exactly 0
    // then assume this marker can be flattened
    if (minZ === 0 && this.flatten && this.flattenedZHeightPose) {
      position.z = this.flattenedZHeightPose.position.z;
    }

    // HACK(jacob): rather than hard-coding this, we should
    //  (a) produce this visualization dynamically from a non-marker topic
    //  (b) fix translucency so it looks correct (harder)
    marker.color = getGlobalHooks()
      .perPanelHooks()
      .ThreeDimensionalViz.getMarkerColor(topic, marker.color);

    // Allow topic settings to override marker color (see MarkerSettingsEditor.js)
    let { overrideColor } = this._settingsByKey[`ns:${topic}:${message.ns}`] || this._settingsByKey[`t:${topic}`] || {};

    // Check for matching colorOverrideMarkerMatchers for this topic
    const colorOverrideMarkerMatchers = this._colorOverrideMarkerMatchersByTopic[topic] || [];
    const matchingMatcher = colorOverrideMarkerMatchers.find(({ checks = [] }) =>
      checks.every(({ markerKeyPath, value }) => {
        const markerValue = _.get(marker, markerKeyPath);
        return value === markerValue;
      })
    );
    if (matchingMatcher) {
      overrideColor = matchingMatcher.color;
    }

    // Highlight if marker matches any of this topic's highlightMarkerMatchers; dim other markers
    if (Object.keys(this._highlightMarkerMatchersByTopic).length > 0) {
      const markerMatches = (this._highlightMarkerMatchersByTopic[topic] || []).some(({ checks = [] }) =>
        checks.every(({ markerKeyPath, value }) => {
          const markerValue = _.get(marker, markerKeyPath);
          return value === markerValue;
        })
      );
      const currentColor = overrideColor || marker.color || {};
      overrideColor = { ...currentColor, a: markerMatches ? marker.color?.a ?? 1 : NON_HIGHLIGHTED_MARKER_ALPHA };
    }

    if (overrideColor) {
      marker.color = overrideColor;
      marker.colors = [];
    }

    this.collectors[topic].addMarker(marker, name);
  }

  _consumeOccupancyGrid = (topic: string, message: NavMsgs$OccupancyGrid): void => {
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
    const name = `${topic}/${type}`;

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
      interactionData: { topic, originalMessage: message },
    };

    // if we neeed to flatten the ogrid clone the position and change the z to match the flattenedZHeightPose
    if (mappedMessage.info.origin.position.z === 0 && this.flattenedZHeightPose && this.flatten) {
      const originalInfo = mappedMessage.info;
      const originalPosition = originalInfo.origin.position;
      mappedMessage.info = {
        ...originalInfo,
        origin: {
          ...originalInfo.origin,
          position: { ...originalPosition, z: this.flattenedZHeightPose.position.z },
        },
      };
    }
    this.collectors[topic].addNonMarker(topic, mappedMessage);
  };

  _consumeNonMarkerMessage = (topic: string, message: StampedMessage, type: number): void => {
    const sourcePose = emptyPose();
    const pose = this.transforms.apply(sourcePose, sourcePose, message.header.frame_id, this.rootTransformID);
    if (!pose) {
      const error = this._addError(this.errors.topicsMissingTransforms, topic);
      error.frameIds.add(message.header.frame_id);
      return;
    }

    const mappedMessage = {
      ...message,
      type,
      pose,
      interactionData: { topic, originalMessage: message },
    };

    // If a decay time is available, we assign a lifetime to this message
    // Do not automatically assign a 0 (zero) decay time since that translates
    // to an infinite lifetime. But do allow for 0 values based on user preferences.
    const decayTimeInSec = this._settingsByKey[`t:${topic}`]?.decayTime;
    const lifetime = decayTimeInSec ? fromSec(decayTimeInSec) : undefined;
    this.collectors[topic].addNonMarker(topic, mappedMessage, lifetime);
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
        this._setTopicError(topic, error.toString());
      }
    }
    this.topicsToRender.clear();
  }

  _consumeMessage = (topic: string, datatype: string, msg: Message): void => {
    const { message } = msg;
    const SUPPORTED_MARKER_DATATYPES = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.SUPPORTED_MARKER_DATATYPES;

    switch (datatype) {
      case SUPPORTED_MARKER_DATATYPES.WEBVIZ_MARKER_DATATYPE:
      case SUPPORTED_MARKER_DATATYPES.VISUALIZATION_MSGS_MARKER_DATATYPE:
        this._consumeMarker(topic, message);
        break;
      case SUPPORTED_MARKER_DATATYPES.VISUALIZATION_MSGS_MARKER_ARRAY_DATATYPE:
        this._consumeMarkerArray(topic, message);
        break;
      case SUPPORTED_MARKER_DATATYPES.POSE_STAMPED_DATATYPE:
        // make synthetic arrow marker from the stamped pose
        this.collectors[topic].addNonMarker(topic, buildSyntheticArrowMarker(topic, msg, this.flattenedZHeightPose));
        break;
      case SUPPORTED_MARKER_DATATYPES.NAV_MSGS_OCCUPANCY_GRID_DATATYPE:
        // flatten btn: set empty z values to be at the same level as the flattenedZHeightPose
        this._consumeOccupancyGrid(topic, message);
        break;
      case SUPPORTED_MARKER_DATATYPES.POINT_CLOUD_DATATYPE:
        this._consumeNonMarkerMessage(topic, cast<PointCloud2>(message), 102);
        break;
      case SUPPORTED_MARKER_DATATYPES.SENSOR_MSGS_LASER_SCAN_DATATYPE:
        this._consumeNonMarkerMessage(topic, cast<LaserScan>(message), 104);
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
            datatype,
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
      this._consumeMessage(topic, this.topicsByName[topic].datatype, messages[i]);
    }
  };

  getScene(): Scene {
    return {
      bounds: this.bounds,
      flattenedZHeightPose: this.flattenedZHeightPose,
    };
  }

  renderMarkers(add: MarkerCollector) {
    for (const topicName of Object.keys(this.topicsByName)) {
      const topic = this.topicsByName[topicName];
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
        const settings = this._settingsByKey[`t:${topic.name}`];
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

    // allow topic settings to override renderable marker command (see MarkerSettingsEditor.js)
    const { overrideCommand } = this._settingsByKey[`t:${topic.name}`] || {};

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
        if (!getGlobalHooks().perPanelHooks().ThreeDimensionalViz.addMarkerToCollector(add, marker)) {
          this._setTopicError(topic.name, `Unsupported marker type: ${marker.type}`);
        }
      }
    }
  }
}
