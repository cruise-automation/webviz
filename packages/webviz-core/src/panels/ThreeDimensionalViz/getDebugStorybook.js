// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { stringify } from "json-with-typed-arrays";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { Topic, PlayerState } from "webviz-core/src/players/types";

const DEFAULT_DATATYPE_DEPTH = Infinity;
// these datatypes are so big they quickly blow the json file size out
// so only keep max 1 around at a time
const customDepths = {
  "nav_msgs/OccupancyGrid": 1,
};
const frames = [];
export default function collectStorybookDebugInfo(
  playerState: PlayerState,
  selectedTopics: string[],
  topics: Topic[],
  config: any
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const { activeData } = playerState;
  if (!activeData) {
    return;
  }
  const { messages } = activeData;
  const ignoreTopics = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.debugIgnoreTopics || [];
  // ignore some heavyweight topics we don't need for 3d panel
  const filteredMessages = messages.filter((msg) => !ignoreTopics.includes(msg.topic));
  if (!filteredMessages.length) {
    return;
  }
  frames.push(filteredMessages);
  window.debugGet3DStorybook = async () => {
    // $FlowFixMe - flow doesn't know Array.prototype.flat
    const filteredTopics = topics.filter(({ name }) => frames.flat().find(({ topic }) => name === topic));
    const topicCounts = {};
    const outputFrames = [];
    // go through the saved frames and add them starting w/ the newest frame
    const reverseTimeOrderedFrames = frames.reverse();
    for (const frame of reverseTimeOrderedFrames) {
      const outputFrame = [];
      for (const message of frame) {
        // only collect the most recently seen N messages for each topic
        // otherwise the size of the debug fixture becomes too large
        topicCounts[message.topic] = topicCounts[message.topic] || 0;
        topicCounts[message.topic] += 1;
        const maxDepth = customDepths[message.datatype] || DEFAULT_DATATYPE_DEPTH;
        if (topicCounts[message.topic] > maxDepth) {
          continue;
        }
        outputFrame.push(message);
      }
      if (outputFrame.length) {
        // since we're going through from newest to oldest we need to add the frames to the beginning of the output list
        outputFrames.unshift(outputFrame);
      }
    }
    const payload = { topics: filteredTopics, messages: outputFrames, config };
    console.log(payload);
    const txt = stringify(payload);
    const blob = new Blob([txt], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    function download(filename, text) {
      const element = document.createElement("a");
      element.setAttribute("href", url);
      element.setAttribute("download", filename);

      element.style.display = "none";
      const { body } = document;
      if (!body) {
        throw new Error("Body is missing");
      }
      body.appendChild(element);
      element.click();
      body.removeChild(element);
    }
    download("story.json", txt);
  };
}
