// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import clamp from "lodash/clamp";

import CameraModel from "./CameraModel";
import type { Topic, Message } from "webviz-core/src/players/types";
import type { CameraInfo } from "webviz-core/src/types/Messages";

// The OffscreenCanvas type is not yet in Flow. It's similar to, but more restrictive than HTMLCanvasElement.
// TODO: change this to the Flow definition once it's been added.
export type OffscreenCanvas = HTMLCanvasElement;

export type Dimensions = {| width: number, height: number |};

export type MarkerOption = {
  topic: string,
  name: string,
};

export type RawMarkerData = {|
  markers: Message[],
  scale: number,
  transformMarkers: boolean,
  cameraInfo: ?CameraInfo,
|};

export type MarkerData = ?{|
  markers: Message[],
  originalWidth: ?number, // null means no scaling is needed (use the image's size)
  originalHeight: ?number, // null means no scaling is needed (use the image's size)
  cameraModel: ?CameraModel, // null means no transformation is needed
|};

export function getMarkerOptions(
  imageTopic: string,
  topics: $ReadOnlyArray<Topic>,
  allCameraNamespaces: string[],
  imageMarkerDatatypes: string[]
): string[] {
  const results = [];
  const cameraNamespace = getCameraNamespace(imageTopic);
  for (const { name, datatype } of topics) {
    if (
      cameraNamespace &&
      (name.startsWith(cameraNamespace) || name.startsWith(`/old${cameraNamespace}`)) &&
      imageMarkerDatatypes.includes(datatype)
    ) {
      results.push(name);
    }
  }
  return results.sort();
}

export function getRelatedMarkerTopics(enabledMarkerTopics: string[], availableMarkerTopics: string[]): string[] {
  return availableMarkerTopics.filter((topic) => {
    return enabledMarkerTopics.some((enabledTopic) => topic.endsWith(enabledTopic.split("/").pop()));
  });
}

// get the sensor_msgs/CameraInfo topic associated with an image topic
export function getCameraInfoTopic(imageTopic: string): ?string {
  const cameraNamespace = getCameraNamespace(imageTopic);
  if (cameraNamespace) {
    return `${cameraNamespace}/camera_info`;
  }
  return null;
}

export function getCameraNamespace(topicName: string): ?string {
  let splitTopic = topicName.split("/");
  // Remove the last part of the selected topic to get the camera namespace.
  splitTopic.pop();
  splitTopic = splitTopic.filter((topicPart) => topicPart !== "old");

  // Since there is a leading slash in the topicName, splitTopic will always have at least one empty string to start.
  // If we can't find the namespace, return null.
  return splitTopic.length > 1 ? splitTopic.join("/") : null;
}

// group topics by the first component of their name
export function groupTopics(topics: Topic[]): Map<string, Topic[]> {
  const imageTopicsByNamespace: Map<string, Topic[]> = new Map();
  for (const topic of topics) {
    const key = getCameraNamespace(topic.name) || topic.name;
    const vals = imageTopicsByNamespace.get(key);
    if (vals) {
      vals.push(topic);
    } else {
      imageTopicsByNamespace.set(key, [topic]);
    }
  }
  return imageTopicsByNamespace;
}

// check if we pan out of bounds with the given top, left, right, bottom
// x, y, scale is the state after we pan
// if out of bound, return newX and newY satisfying the bounds
// else, return the original x and y
export function checkOutOfBounds(
  x: number,
  y: number,
  outsideWidth: number,
  outsideHeight: number,
  insideWidth: number,
  insideHeight: number
): number[] {
  const leftX = 0;
  const topY = 0;
  const rightX = outsideWidth - insideWidth;
  const bottomY = outsideHeight - insideHeight;
  return [
    clamp(x, Math.min(leftX, rightX), Math.max(leftX, rightX)),
    clamp(y, Math.min(topY, bottomY), Math.max(topY, bottomY)),
  ];
}

export function buildMarkerData(rawMarkerData: RawMarkerData): ?MarkerData {
  const { markers, scale, transformMarkers, cameraInfo } = rawMarkerData;
  if (markers.length === 0) {
    return {
      markers,
      cameraModel: null,
      originalHeight: undefined,
      originalWidth: undefined,
    };
  }
  let cameraModel;
  if (transformMarkers) {
    if (!cameraInfo) {
      return null;
    }
    cameraModel = new CameraModel(cameraInfo);
  }

  // Markers can only be rendered if we know the original size of the image.
  let originalWidth;
  let originalHeight;
  if (cameraInfo && cameraInfo.width && cameraInfo.height) {
    // Prefer using CameraInfo can be used to determine the image size.
    originalWidth = cameraInfo.width;
    originalHeight = cameraInfo.height;
  } else if (scale === 1) {
    // Otherwise, if scale === 1, the image was not downsampled, so the size of the bitmap is accurate.
    originalWidth = undefined;
    originalHeight = undefined;
  } else {
    return null;
  }

  return {
    markers,
    cameraModel,
    originalWidth,
    originalHeight,
  };
}
