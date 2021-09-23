// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type NodeDefinition } from "webviz-core/src/players/nodes";
import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";
import { joinTopics, addTopicPrefix } from "webviz-core/src/util/topicUtils";

export function withSecondSourceSupport(nodeDef: NodeDefinition<any>): NodeDefinition<any> {
  return {
    ...nodeDef,
    inputs: addTopicPrefix(nodeDef.inputs, $WEBVIZ_SOURCE_2),
    output: {
      ...nodeDef.output,
      name: joinTopics($WEBVIZ_SOURCE_2, nodeDef.output.name),
    },
    callback: ({ message, state }) => {
      const messageWithoutSecondPrefix = {
        ...message,
        topic: message.topic.replace($WEBVIZ_SOURCE_2, ""),
      };
      const result = nodeDef.callback({ message: messageWithoutSecondPrefix, state });
      return {
        state: result.state,
        messages: result.messages.map((_message) => {
          return {
            ..._message,
            topic: joinTopics($WEBVIZ_SOURCE_2, _message.topic),
          };
        }),
      };
    },
  };
}
