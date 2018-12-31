// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Rosout from "webviz-core/src/panels/Rosout";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const fixture = {
  topics: [{ name: "/rosout", datatype: "dummy" }],
  frame: {
    "/rosout": [
      {
        datatype: "rosgraph_msgs/Log",
        topic: "/rosout",
        op: "message",
        receiveTime: { sec: 123, nsec: 456 },
        message: {
          file: "ros/src/some_topic_utils/src/foo.cpp",
          function: "vector<int> some_topic::findInt",
          header: { stamp: { sec: 123, nsec: 0 } },
          level: 4,
          line: 242,
          msg: "Couldn't find int 83757.",
          name: "/some_topic",
        },
      },
      {
        datatype: "rosgraph_msgs/Log",
        topic: "/rosout",
        op: "message",
        receiveTime: { sec: 123, nsec: 456 },
        message: {
          file: "ros/src/other_topic_utils/src/foo.cpp",
          function: "vector<int> other_node::findInt",
          header: { stamp: { sec: 123, nsec: 0 } },
          level: 4,
          line: 242,
          msg: "Couldn't find int 83757.",
          name: "/other_node",
        },
      },
      {
        datatype: "rosgraph_msgs/Log",
        topic: "/rosout",
        op: "message",
        receiveTime: { sec: 123, nsec: 456 },
        message: {
          file: "ros/src/other_topic_utils/src/foo.cpp",
          function: "vector<int> other_node::findInt",
          header: { stamp: { sec: 123, nsec: 0 } },
          level: 4,
          line: 242,
          msg: "Lorem ipsum blah blah. This message should\nshow up as multiple lines",
          name: "/other_node",
        },
      },
    ],
  },
};

storiesOf("<RosoutPanel>", module)
  .addDecorator(withScreenshot())
  .add("default", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Rosout />
      </PanelSetup>
    );
  })
  .add("filtered", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Rosout config={{ searchTerms: ["multiple", "/some_topic"], minLogLevel: 1 }} />
      </PanelSetup>
    );
  });
