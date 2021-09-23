// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import _, { flatten, groupBy, isEqual, keyBy, mapValues, some, xor } from "lodash";
import type { Time } from "rosbag";
import shallowequal from "shallowequal";

import type { SkipTransformSpec, ThreeDimensionalVizHooks } from "./types";
import type { GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import MessageCollector from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/MessageCollector";
import type { MarkerMatcher } from "webviz-core/src/panels/ThreeDimensionalViz/ThreeDimensionalVizContext";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { StructuralDatatypes } from "webviz-core/src/panels/ThreeDimensionalViz/utils/datatypes";
import { cast, type BobjectMessage, type Topic, type Frame, type Message } from "webviz-core/src/players/types";
import type {
  BinaryPath,
  BinaryMarker,
  BinaryIconMarker,
  BinaryPolygonStamped,
  BinaryPoseStamped,
  BinaryInstancedMarker,
  WrappedPointCloud,
} from "webviz-core/src/types/BinaryMessages";
import type {
  Color,
  Marker,
  Namespace,
  NavMsgs$OccupancyGrid,
  MutablePose,
  Pose,
  StampedMessage,
} from "webviz-core/src/types/Messages";
import type { MarkerProvider, MarkerCollector, Scene } from "webviz-core/src/types/Scene";
import { objectValues } from "webviz-core/src/util";
import { getField, getIndex, deepParse } from "webviz-core/src/util/binaryObjects";
import {
  POSE_MARKER_SCALE,
  LINED_CONVEX_HULL_RENDERING_SETTING,
  MARKER_ARRAY_DATATYPES,
  $TF_STATIC,
  $TF,
  VISUALIZATION_MSGS$WEBVIZ_MARKER,
  VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY,
  VISUALIZATION_MSGS$MARKER,
  VISUALIZATION_MSGS$MARKER_ARRAY,
  GEOMETRY_MSGS$POSE_STAMPED,
  NAV_MSGS$PATH,
  NAV_MSGS$OCCUPANCY_GRID,
  SENSOR_MSGS$POINT_CLOUD_2,
  SENSOR_MSGS$LASER_SCAN,
  GEOMETRY_MSGS$POLYGON_STAMPED,
  WEBVIZ_ICON_MSGS$WEBVIZ_3D_ICON_ARRAY,
  MARKER_MSG_TYPES,
  RADAR_POINT_CLOUD,
  WRAPPED_POINT_CLOUD,
} from "webviz-core/src/util/globalConstants";
import naturalSort from "webviz-core/src/util/naturalSort";
import { emptyPose } from "webviz-core/src/util/Pose";
import sendNotification from "webviz-core/src/util/sendNotification";
import { fromSec } from "webviz-core/src/util/time";

export type TopicSettingsCollection = {
  [topicOrNamespaceKey: string]: any,
};

// builds a syntehtic arrow marker from a geometry_msgs/PoseStamped
// these pose sizes were manually configured in rviz; for now we hard-code them here
export const buildSyntheticArrowMarker = (
  { topic, message }: Message,
  pose: Pose,
  getSyntheticArrowMarkerColor: (string) => Color
) => ({
  type: 103,
  pose,
  scale: POSE_MARKER_SCALE,
  color: getSyntheticArrowMarkerColor(topic),
  interactionData: { topic, originalMessage: message },
});

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

export type SelectedNamespacesByTopic = { [topicName: string]: string[] };
// constructs a scene containing all objects to be rendered
// by consuming visualization topics from frames

type MarkerMatchersByTopic = { [string]: Array<MarkerMatcher> };

const missingTransformMessage = (
  rootTransformId: string,
  error: ErrorDetails,
  transforms: Transforms,
  skipTransform: ?SkipTransformSpec
): string => {
  if (skipTransform != null && error.frameIds.has(skipTransform.frameId)) {
    return `missing transform. Is ${skipTransform.sourceTopic} present?`;
  }
  if (transforms.empty) {
    return `missing transform. Is ${$TF} or ${$TF_STATIC} present?`;
  }
  const frameIds = [...error.frameIds].sort().join(",");
  const s = error.frameIds.size === 1 ? "" : "s"; // for plural
  return `missing transforms to root frame ${rootTransformId} from frame${s} ${frameIds}.`;
};

export function getSceneErrorsByTopic(
  sceneErrors: SceneErrors,
  transforms: Transforms,
  skipTransform: ?SkipTransformSpec
): { [topicName: string]: string[] } {
  const res = {};
  const addError = (topic, message) => {
    if (!res[topic]) {
      res[topic] = [];
    }
    res[topic].push(message);
  };
  // generic errors
  for (const [topic, message] of sceneErrors.topicsWithError) {
    addError(topic, message);
  }
  // errors related to missing frame ids and transform ids
  sceneErrors.topicsMissingTransforms.forEach((err, topic) => {
    addError(topic, missingTransformMessage(sceneErrors.rootTransformID, err, transforms, skipTransform));
  });
  sceneErrors.topicsMissingFrameIds.forEach((_err, topic) => {
    addError(topic, "missing frame id");
  });
  return res;
}

// Only display one non-lifetime message at a time, so we filter to the last one.
export function filterOutSupersededMessages(messages: any, datatype: string) {
  // Later messages take precedence over earlier messages, so iterate from latest to earliest to
  // find the last one that matters.
  const reversedMessages = messages.slice().reverse();
  if (MARKER_ARRAY_DATATYPES.includes(datatype)) {
    // Many marker arrays begin with a command to "delete all markers on this topic". If we see
    // this, we can ignore any earlier messages on the topic.
    const earliestMessageToKeepIndex = reversedMessages.findIndex(({ message }) => {
      const markers = getField(message, "markers") ?? getField(message, "allMarkers");
      return getField(getIndex(markers, 0), "action") === 3;
    });
    if (earliestMessageToKeepIndex !== -1) {
      return reversedMessages.slice(0, earliestMessageToKeepIndex + 1).reverse();
    }
    return messages;
  }
  const filteredMessages = [];
  let hasSeenNonLifetimeMessage = false;
  for (const message of reversedMessages) {
    const hasLifetime = !!getField(message.message, "lifetime");
    if (hasLifetime) {
      // Show all messages that have a lifetime.
      filteredMessages.unshift(message);
    } else if (!hasSeenNonLifetimeMessage) {
      // Only show the last non-lifetime message.
      filteredMessages.unshift(message);
      hasSeenNonLifetimeMessage = true;
    }
  }
  return filteredMessages;
}

// https://stackoverflow.com/a/59084440/4543751
export function parseStringTemplate(str: string, obj: any): string {
  const parts = str.split(/\$\{(?!\d)[\wæøåÆØÅ]*\}/);
  const args = str.match(/[^{}]+(?=})/g) || [];
  const parameters = args.map((argument) => obj[argument] || (obj[argument] === undefined ? "" : obj[argument]));
  // $FlowFixMe raw type is string[] which is correct.
  return String.raw({ raw: parts }, ...parameters);
}

export default class SceneBuilder implements MarkerProvider {
  topicsByName: { [topicName: string]: Topic } = {};
  markers: Marker[] = [];
  transforms: Transforms;
  rootTransformID: string;
  selectionState: any = {};
  frame: Frame;
  _structuralDatatypes: StructuralDatatypes = {};
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

  _hooks: ThreeDimensionalVizHooks;

  allNamespaces: Namespace[] = [];
  // TODO(Audrey): remove enabledNamespaces once we release topic groups
  enabledNamespaces: Namespace[] = [];
  selectedNamespacesByTopic: ?{ [topicName: string]: Set<string> };
  flatten: boolean = false;
  _minZ: number = Number.MAX_SAFE_INTEGER;

  // list of topics that need to be rerendered because the frame has new values
  // or because a prop affecting its rendering was changed
  topicsToRender: Set<string> = new Set();

  // stored message arrays allowing used to re-render topics even when the latest
  // frame does not not contain that topic
  lastSeenMessages: { [string]: Message[] } = {};

  resetMinZ() {
    this._minZ = Number.MAX_SAFE_INTEGER;
  }

  updateMinZ(z: number) {
    this._minZ = Math.min(this._minZ, z);
  }

  constructor(hooks: ThreeDimensionalVizHooks) {
    this._hooks = hooks;
  }

  setTransforms = (transforms: Transforms, rootTransformID: string) => {
    this.transforms = transforms;
    this.rootTransformID = rootTransformID;
    this.errors.rootTransformID = rootTransformID;
  };

  setStructuralDatatypes(datatypes: StructuralDatatypes) {
    this._structuralDatatypes = datatypes;
  }

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
    // We need to update topicsToRender here so changes to the selected namespaces will appear on the next render()
    Object.keys(selectedNamespacesByTopic).forEach((topicName) => {
      const newNamespaces = selectedNamespacesByTopic[topicName];
      const previousNamespaces = [...(this.selectedNamespacesByTopic?.[topicName] || [])];
      if (xor(newNamespaces, previousNamespaces).length > 0) {
        this._markTopicToRender(topicName);
      }
    });
    this.selectedNamespacesByTopic = mapValues(selectedNamespacesByTopic, (namespaces) => new Set(namespaces));
  }

  setGlobalVariables = ({ globalVariables }: { globalVariables: GlobalVariables }) => {
    const { getSelectionState, getTopicsToRender } = this._hooks;
    const prevSelectionState = this.selectionState;
    this.selectionState = getSelectionState(globalVariables);

    // Because setSelectedNamespacesByTopic is called before setGlobalVariables,
    // we need to add the topics here instead of overwriting them.
    const updatedTopics = getTopicsToRender(prevSelectionState, this.selectionState);
    updatedTopics.forEach((topicName) => this._markTopicToRender(topicName));
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
      Object.keys(this.topicsByName).forEach((name) => this._markTopicToRender(name));
    }
  }

  _markTopicToRender(topicName: string) {
    if (this.topicsByName[topicName]) {
      this.topicsToRender.add(topicName);
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

  setTopicError = (topic: string, message: string) => {
    this.errors.topicsWithError.set(topic, message);
    this._updateErrorsByTopic();
  };

  // Update the field anytime the errors change in order to generate a new object to trigger TopicTree to rerender.
  _updateErrorsByTopic() {
    const errorsByTopic = getSceneErrorsByTopic(this.errors, this.transforms, this._hooks.skipTransformFrame);
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

  _transformMarkerPose = (
    topic: string,
    marker: BinaryMarker | BinaryIconMarker | BinaryInstancedMarker
  ): ?MutablePose => {
    const frame_id = marker.header().frame_id();

    if (!frame_id) {
      const error = this._addError(this.errors.topicsMissingFrameIds, topic);
      error.namespaces.add(marker.ns());
      return null;
    }

    if (frame_id === this.rootTransformID) {
      // Transforming is a bit expensive, and this (no transformation necessary) is the common-case
      // Need to deep-parse because worldview expects fully-parsed JS objects
      return deepParse(marker.pose());
    }

    // frame_id !== this.rootTransformID.
    // We continue to render these, though they may be inaccurate
    this._reportBadFrameId(topic);
    const badFrameError = this._addError(this.errors.topicsWithBadFrameIds, topic);
    const namespace = marker.ns();
    badFrameError.namespaces.add(namespace);
    badFrameError.frameIds.add(frame_id);

    const pose = this.transforms.apply(emptyPose(), deepParse(marker.pose()), frame_id, this.rootTransformID);
    if (!pose) {
      const topicMissingError = this._addError(this.errors.topicsMissingTransforms, topic);
      topicMissingError.namespaces.add(namespace);
      topicMissingError.frameIds.add(frame_id);
    }
    return pose;
  };

  _consumeMarkerArray = (topic: string, message: any): void => {
    for (const marker of message.markers()) {
      this._consumeMarker(topic, marker);
    }
  };

  _consumeMarker(topic: string, message: BinaryMarker | BinaryIconMarker | BinaryInstancedMarker): void {
    const namespace = message.ns();
    if (namespace) {
      // Consume namespaces even if the message is later discarded
      // Otherwise, the namespace won't be shown as available.
      this._consumeNamespace(topic, namespace);
      if (!this.namespaceIsEnabled(topic, namespace)) {
        return;
      }
    }

    // Marker names are used to identify previously rendered markers for "deletes" and over-writing
    // "adds".
    // In each topic, the namespace (`ns`) and identifier (`id`) uniquely identify the marker.
    // See https://github.com/ros-visualization/rviz/blob/4b6c0f4/src/rviz/default_plugin/markers/marker_base.h#L56
    // and https://github.com/ros-visualization/rviz/blob/4b6c0f4/src/rviz/default_plugin/marker_display.cpp#L422
    const name = `${topic}/${namespace}/${message.id()}`;
    switch (message.action()) {
      case 0: // add
        break;
      case 1: // deprecated in ros
        this.setTopicError(topic, "Marker.action=1 is deprecated");
        return;
      case 2: // delete
        this.collectors[topic].deleteMarker(name);
        return;
      case 3:
        this.collectors[topic].deleteAll();
        return;
      default:
        this.setTopicError(topic, `Unsupported action type: ${message.action()}`);
        return;
    }

    const pose = this._transformMarkerPose(topic, message);
    if (!pose) {
      return;
    }

    const points = message.points();
    const { position } = pose;

    let minZ = Number.MAX_SAFE_INTEGER;

    const parsedPoints = [];
    // if the marker has points, deep-parse them and adjust minZ (Constructed markers sometimes
    // don't have points.)
    if (points && points.length()) {
      for (const point of points) {
        const z = point.z();
        minZ = Math.min(minZ, z);
        this.updateMinZ(z + position.z);
        parsedPoints.push({ x: point.x(), y: point.y(), z });
      }
    } else {
      // otherwise just adjust by the pose
      minZ = Math.min(minZ, position.z);
      this.updateMinZ(position.z);
    }

    // if the minimum z value of any point (or the pose) is exactly 0
    // then assume this marker can be flattened
    if (minZ === 0 && this.flatten && this.flattenedZHeightPose) {
      position.z = this.flattenedZHeightPose.position.z;
    }

    // HACK(jacob): rather than hard-coding this, we should
    //  (a) produce this visualization dynamically from a non-marker topic
    //  (b) fix translucency so it looks correct (harder)
    const color = this._hooks.getMarkerColor(topic, deepParse(message.color()));

    // Allow topic settings to override marker color (see MarkerSettingsEditor.js)
    const { overrideColor, iconTextTemplate } =
      this._settingsByKey[`ns:${topic}:${namespace}`] || this._settingsByKey[`t:${topic}`] || {};

    // Check for matching colorOverrideMarkerMatchers for this topic
    const colorOverrideMarkerMatchers = this._colorOverrideMarkerMatchersByTopic[topic] || [];
    const matchingMatcher = colorOverrideMarkerMatchers.find(({ checks = [] }) =>
      checks.every(({ markerKeyPath = [], value }) => {
        // Get the item at the key path
        const markerValue = markerKeyPath.reduce((item: any, key) => item?.[key] && item[key](), (message: any));
        return value === markerValue;
      })
    );
    let matchingOverrideColor = overrideColor;
    if (matchingMatcher) {
      matchingOverrideColor = matchingMatcher.color;
    }

    // Set later in renderMarkers so it be applied to markers generated in _consumeNonMarkerMessage
    const highlighted = false;
    const interactionData = {
      topic,
      highlighted,
      originalMessage: message,
    };
    const lifetime = message.lifetime();
    // This "marker-ish" thing is an unholy union of many drawable types...
    const marker: any = {
      type: message.type(),
      scale: deepParse(message.scale()),
      // Missing lifetimes are badly inferred during tests. Hopefully not needed for long.
      lifetime: lifetime ? deepParse(lifetime) : null,
      pose,
      interactionData,
      color: matchingOverrideColor || color,
      colors: matchingOverrideColor ? [] : deepParse(message.colors()),
      points: parsedPoints,
      // These fields are probably unused, but Flow asks for them.
      // TODO(useBinaryTranslation): Loosen the flow-type here?
      id: message.id(),
      ns: message.ns(),
      header: deepParse(message.header()),
      action: message.action(),
    };
    // Marker fields
    if (message.text != null) {
      marker.text = message.text();
    }
    // Icon fields
    if (marker.type === MARKER_MSG_TYPES.OVERLAY_ICON) {
      // icon_type can be specified in root level or inside metadata.
      if (message.icon_type != null) {
        marker.icon_type = message.icon_type();
      }
      if (message.metadata != null) {
        // Downstream code relies on icon_type and icon_types fields from metadata :-(
        // TODO(steel): Fix up icon types, do not put metadata on drawables.
        marker.metadata = message.metadata();
        if (iconTextTemplate) {
          // Replace the text field with parsed icon text. Only replace when the marker type is overlayIcon.
          marker.text = parseStringTemplate(iconTextTemplate, marker.metadata);
        }
      }
    }

    // InstancedLineList fields. Check some fields, some fixtures do not include them all.
    if (message.metadataByIndex) {
      marker.poses = message.poses && message.poses();
      marker.metadataByIndex = message.metadataByIndex();
      marker.closed = message.closed && message.closed();
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
    const [alpha, map] = this._hooks.getOccupancyGridValues(topic);

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

  _consumeNonMarkerMessage = (topic: string, drawData: StampedMessage, type: number, originalMessage: ?any): void => {
    const sourcePose = emptyPose();
    const pose = this.transforms.apply(sourcePose, sourcePose, drawData.header.frame_id, this.rootTransformID);
    if (!pose) {
      const error = this._addError(this.errors.topicsMissingTransforms, topic);
      error.frameIds.add(drawData.header.frame_id);
      return;
    }

    const { overrideColor } = this._settingsByKey[`t:${topic}`] || {};
    const mappedMessage = {
      ...drawData,
      ...(overrideColor ? { color: overrideColor } : undefined),
      type,
      pose,
      interactionData: { topic, originalMessage: originalMessage ?? drawData },
    };

    // If a decay time is available, we assign a lifetime to this message
    // Do not automatically assign a 0 (zero) decay time since that translates
    // to an infinite lifetime. But do allow for 0 values based on user preferences.
    const decayTimeInSec = this._settingsByKey[`t:${topic}`]?.decayTime;
    const lifetime = decayTimeInSec ? fromSec(decayTimeInSec) : undefined;
    this.collectors[topic].addNonMarker(topic, mappedMessage, lifetime);
  };

  setCurrentTime = (currentTime: { sec: number, nsec: number }) => {
    this.resetMinZ();

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
    this.flattenedZHeightPose = this._hooks.getFlattenedPose(this.frame) || this.flattenedZHeightPose;

    if (this.flattenedZHeightPose && this.flattenedZHeightPose.position) {
      this.updateMinZ(this.flattenedZHeightPose.position.z);
    }
    for (const topic of this.topicsToRender) {
      try {
        this._consumeTopic(topic);
      } catch (error) {
        this.setTopicError(topic, error.toString());
      }
    }
    this.topicsToRender.clear();
  }

  _consumeMessage = (topic: string, datatype: string, msg: BobjectMessage): void => {
    const { message } = msg;
    switch (datatype) {
      case VISUALIZATION_MSGS$WEBVIZ_MARKER:
      case VISUALIZATION_MSGS$MARKER:
        this._consumeMarker(topic, cast<BinaryMarker>(message));
        break;
      case WEBVIZ_ICON_MSGS$WEBVIZ_3D_ICON_ARRAY:
      case VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY:
      case VISUALIZATION_MSGS$MARKER_ARRAY:
        this._consumeMarkerArray(topic, message);
        break;
      case GEOMETRY_MSGS$POSE_STAMPED: {
        // make synthetic arrow marker from the stamped pose
        const pose = deepParse(cast<BinaryPoseStamped>(msg.message).pose());
        this.collectors[topic].addNonMarker(
          topic,
          buildSyntheticArrowMarker(msg, pose, this._hooks.getSyntheticArrowMarkerColor)
        );
        break;
      }
      case NAV_MSGS$OCCUPANCY_GRID:
        // flatten btn: set empty z values to be at the same level as the flattenedZHeightPose
        this._consumeOccupancyGrid(topic, deepParse(message));
        break;
      case NAV_MSGS$PATH: {
        const pathStamped = cast<BinaryPath>(message);
        if (pathStamped.poses().length() === 0) {
          break;
        }
        const newMessage = {
          header: deepParse(pathStamped.header()),
          // Could convert to using arrow for pose later if needed.
          points: pathStamped
            .poses()
            .toArray()
            .map((pose) => deepParse(pose.pose().position())),
          closed: false,
          scale: { x: 0.2 },
          color: { r: 1, g: 0, b: 0, a: 1 },
        };
        this._consumeNonMarkerMessage(topic, newMessage, MARKER_MSG_TYPES.LINE_STRIP, message);
        break;
      }
      case SENSOR_MSGS$POINT_CLOUD_2:
        this._consumeNonMarkerMessage(topic, deepParse(message), 102);
        break;
      case SENSOR_MSGS$LASER_SCAN:
        this._consumeNonMarkerMessage(topic, deepParse(message), 104);
        break;
      case GEOMETRY_MSGS$POLYGON_STAMPED: {
        // convert Polygon to a line strip
        const polygonStamped = cast<BinaryPolygonStamped>(message);
        const polygon = polygonStamped.polygon();
        if (polygon.points().length() === 0) {
          break;
        }
        const newMessage = {
          header: deepParse(polygonStamped.header()),
          points: deepParse(polygon.points()),
          closed: true,
          scale: { x: 0.2 },
          color: { r: 0, g: 1, b: 0, a: 1 },
        };
        this._consumeNonMarkerMessage(topic, newMessage, MARKER_MSG_TYPES.LINE_STRIP, message);
        break;
      }
      default: {
        const structuralDatatype = this._structuralDatatypes[datatype];
        if (structuralDatatype === RADAR_POINT_CLOUD) {
          this._consumeNonMarkerMessage(topic, deepParse(message), 106);
          break;
        }
        if (structuralDatatype === WRAPPED_POINT_CLOUD) {
          this._consumeNonMarkerMessage(topic, deepParse(cast<WrappedPointCloud>(message).cloud()), 102, message);
          break;
        }
        const { flattenedZHeightPose, collectors, errors, lastSeenMessages, selectionState } = this;
        this._hooks.consumeBobject(
          topic,
          datatype,
          msg,
          {
            consumeMarkerArray: this._consumeMarkerArray,
            consumeNonMarkerMessage: this._consumeNonMarkerMessage,
            consumeOccupancyGrid: this._consumeOccupancyGrid,
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

    const datatype = this.topicsByName[topic].datatype;
    // If topic has a decayTime set, markers with no lifetime will get one
    // later on, so we don't need to filter them. Note: A decayTime of zero is
    // defined as an infinite lifetime
    const decayTime = this._settingsByKey[`t:${topic}`]?.decayTime;
    const filteredMessages = decayTime === undefined ? filterOutSupersededMessages(messages, datatype) : messages;
    for (const message of filteredMessages) {
      this._consumeMessage(topic, datatype, message);
    }
  };

  getScene(): Scene {
    return {
      minZ: this._minZ,
      flattenedZHeightPose: this.flattenedZHeightPose,
    };
  }

  renderMarkers(add: MarkerCollector) {
    for (const topic of objectValues(this.topicsByName)) {
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

        // Highlight if marker matches any of this topic's highlightMarkerMatchers; dim other markers
        if (Object.keys(this._highlightMarkerMatchersByTopic).length > 0) {
          const markerMatches = (this._highlightMarkerMatchersByTopic[topic.name] || []).some(({ checks = [] }) =>
            checks.every(({ markerKeyPath, value }) => {
              const markerValue = _.get(message, markerKeyPath);
              return value === markerValue;
            })
          );
          marker.interactionData.highlighted = markerMatches;
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
      case 106: return add.radarPointCluster(marker);
      case 107: return add.filledPolygon(marker);
      case 108: return add.instancedLineList(marker);
      case 109: return add.overlayIcon(marker)
      default: {
        if (!this._hooks.addMarkerToCollector(add, marker)) {
          this.setTopicError(topic.name, `Unsupported marker type: ${marker.type}`);
        }
      }
    }
  }
}
