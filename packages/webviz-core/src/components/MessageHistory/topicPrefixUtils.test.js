// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { getFilteredFormattedTopics } from "./topicPrefixUtils";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

const datatype = "/some/datatype";

const topic = "/some/topic";
const anotherTopic = "/another/topic/";

const topicSecondBag = `${SECOND_BAG_PREFIX}${topic}`;
const anotherTopicSecondBag = `${SECOND_BAG_PREFIX}${anotherTopic}`;

describe("topicPrefixUtils", () => {
  describe("getFilteredFormattedTopics", () => {
    it("gets filtered formatted topics if there is no topic prefix", () => {
      const filteredFormattedTopics = getFilteredFormattedTopics(
        [topicSecondBag, anotherTopicSecondBag].map((topicName) => ({ name: topicName, datatype })),
        ""
      );
      expect(filteredFormattedTopics.map((topic) => topic.name)).toEqual([topicSecondBag, anotherTopicSecondBag]);
    });

    it("gets filtered formatted topics if there is a topic prefix", () => {
      const filteredFormattedTopics = getFilteredFormattedTopics(
        [topicSecondBag, anotherTopicSecondBag].map((topicName) => ({ name: topicName, datatype })),
        SECOND_BAG_PREFIX
      );
      expect(filteredFormattedTopics.map((topic) => topic.name)).toEqual([topic, anotherTopic]);
    });
  });
});
