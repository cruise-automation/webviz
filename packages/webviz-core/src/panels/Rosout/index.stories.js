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
          file: "some_topic_utils/src/foo.cpp",
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
          file: "other_topic_utils/src/foo.cpp",
          function: "vector<int> other_node::findInt",
          header: { stamp: { sec: 123, nsec: 0 } },
          level: 4,
          line: 242,
          msg: "Couldn't find int 2121.",
          name: "/other_node",
        },
      },
      {
        datatype: "rosgraph_msgs/Log",
        topic: "/rosout",
        op: "message",
        receiveTime: { sec: 123, nsec: 456 },
        message: {
          file: "other_topic_utils/src/foo.cpp",
          function: "vector<int> other_node::findInt",
          header: { stamp: { sec: 123, nsec: 0 } },
          level: 4,
          line: 242,
          msg: "Lorem ipsum blah blah. This message should\nshow up as multiple lines",
          name: "/other_node",
        },
      },
      {
        datatype: "rosgraph_msgs/Log",
        topic: "/rosout",
        op: "message",
        receiveTime: { sec: 0, nsec: 0 },
        message: {
          header: { seq: 335, stamp: { sec: 1529678605, nsec: 521518001 }, frame_id: "" },
          level: 4,
          name: "/some_node",
          msg:
            "26826:\nheader: \n  seq: 0\n  stamp: 1529678605.349576000\n  Adipisicing minim veniam sint occaecat anim laborum irure velit ut non do labore.\n",
          file: "somefile.cpp",
          function: "SomeFunction:SomeContext",
          line: 491,
          topics: [],
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
  .add(`filtered terms: "multiple", "/some_topic"`, () => {
    return (
      <PanelSetup fixture={fixture}>
        <Rosout config={{ searchTerms: ["multiple", "/some_topic"], minLogLevel: 1 }} />
      </PanelSetup>
    );
  })
  .add(`case insensitive message filtering: "could", "Ipsum"`, () => {
    return (
      <PanelSetup fixture={fixture}>
        <Rosout config={{ searchTerms: ["could", "Ipsum"], minLogLevel: 1 }} />
      </PanelSetup>
    );
  });
