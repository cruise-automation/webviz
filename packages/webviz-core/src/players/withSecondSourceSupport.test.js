// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withSecondSourceSupport } from "webviz-core/src/players/withSecondSourceSupport";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";
import { addTopicPrefix, joinTopics } from "webviz-core/src/util/topicUtils";

describe("withSecondSourceSupport", () => {
  it("returns a nodeDefinition that works with SECOND_SOURCE_PREFIX'd topics", () => {
    const message = {
      topic: "/webviz/abc",
      message: {},
      receiveTime: { sec: 0, nsec: 0 },
    };
    const nodeDefinition = {
      callback: () => ({
        messages: [message],
        state: {},
      }),
      defaultState: {},
      inputs: ["/foo", "/bar"],
      output: { name: "/baz", datatype: "datatype" },
      datatypes: {},
    };

    const secondSourceNodeDefinition = withSecondSourceSupport(nodeDefinition);
    expect(secondSourceNodeDefinition).toEqual(
      expect.objectContaining({
        callback: expect.any(Function),
        defaultState: {},
        inputs: addTopicPrefix(nodeDefinition.inputs, SECOND_SOURCE_PREFIX),
        output: { name: joinTopics(SECOND_SOURCE_PREFIX, "/baz"), datatype: "datatype" },
        datatypes: {},
      })
    );
    expect(
      secondSourceNodeDefinition.callback({
        message: {
          topic: joinTopics(SECOND_SOURCE_PREFIX, "/webviz/abc"),
          message: {},
          receiveTime: { sec: 0, nsec: 0 },
        },
        state: {},
      })
    ).toEqual(
      expect.objectContaining({
        messages: [
          {
            topic: joinTopics(SECOND_SOURCE_PREFIX, message.topic),
            message: {},
            receiveTime: { sec: 0, nsec: 0 },
          },
        ],
        state: {},
      })
    );
  });
});
