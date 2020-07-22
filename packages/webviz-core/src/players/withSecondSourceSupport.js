// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type NodeDefinition } from "webviz-core/src/players/nodes";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";
import { joinTopics, addTopicPrefix } from "webviz-core/src/util/topicUtils";

export function withSecondSourceSupport(nodeDef: NodeDefinition<any>): NodeDefinition<any> {
  return {
    ...nodeDef,
    inputs: addTopicPrefix(nodeDef.inputs, SECOND_SOURCE_PREFIX),
    output: {
      ...nodeDef.output,
      name: joinTopics(SECOND_SOURCE_PREFIX, nodeDef.output.name),
    },
    callback: ({ message, state }) => {
      const messageWithoutSecondPrefix = {
        ...message,
        topic: message.topic.replace(SECOND_SOURCE_PREFIX, ""),
      };
      const result = nodeDef.callback({ message: messageWithoutSecondPrefix, state });
      return {
        state: result.state,
        messages: result.messages.map((_message) => {
          return {
            ..._message,
            topic: joinTopics(SECOND_SOURCE_PREFIX, _message.topic),
          };
        }),
      };
    },
  };
}
