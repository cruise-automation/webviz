// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Topic } from "webviz-core/src/types/players";

export type MarkerOption = {
  topic: string,
  name: string,
};

// given all available marker topics, filter out the names that are available for this image topic
export function getMarkerOptions(
  imageTopic: string,
  markerTopics: string[],
  allCameraNamespaces: string[]
): MarkerOption[] {
  const results = [];
  const cameraNamespace = getCameraNamespace(imageTopic);
  for (const topic of markerTopics) {
    if (cameraNamespace && topic.startsWith(cameraNamespace)) {
      results.push({ topic, name: topic.substr(cameraNamespace.length).replace(/^\//, "") });
    } else if (allCameraNamespaces.includes(getCameraNamespace(topic))) {
      // this topic corresponds to a different camera
      continue;
    } else {
      results.push({ topic, name: topic });
    }
  }
  return results;
}

// derive the marker topics from the selected marker names which can be associated with this camera
// (the camera topic must be rectified in order for markers to align properly)
export function getMarkerTopics(imageTopic: string, markerNames: string[]): string[] {
  const cameraNamespace = getCameraNamespace(imageTopic);
  if (cameraNamespace) {
    return markerNames.map((name) => (name.startsWith("/") ? name : `${cameraNamespace}/${name}`));
  }
  return [];
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
  const match = topicName.match(/^(\/old)?(?!\/old)(\/[^/]+)\//);
  return match ? match[2] : null;
}

// group topics by the first component of their name
export function groupTopics(topics: Topic[]): Map<string, Topic[]> {
  const imageTopicsByNamespace: Map<string, Topic[]> = new Map();
  for (const topic of topics) {
    const key = getCameraNamespace(topic.name) || "";
    const vals = imageTopicsByNamespace.get(key);
    if (vals) {
      vals.push(topic);
    } else {
      imageTopicsByNamespace.set(key, [topic]);
    }
  }
  return imageTopicsByNamespace;
}
