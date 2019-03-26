// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Flex from "webviz-core/src/components/Flex";
import MessageHistory from "webviz-core/src/components/MessageHistory";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const fixture = {
  datatypes: {
    "msgs/PoseDebug": [
      { name: "header", type: "std_msgs/Header", isArray: false },
      { name: "pose", type: "msgs/Pose", isArray: false },
    ],
    "msgs/Pose": [
      { name: "header", type: "std_msgs/Header", isArray: false },
      { name: "x", type: "float64", isArray: false },
      { name: "y", type: "float64", isArray: false },
      { name: "travel", type: "float64", isArray: false },
      { name: "velocity", type: "float64", isArray: false },
      { name: "acceleration", type: "float64", isArray: false },
      { name: "heading", type: "float64", isArray: false },
    ],
    "msgs/State": [
      { name: "header", type: "std_msgs/Header", isArray: false },
      { name: "items", type: "msgs/OtherState", isArray: true },
    ],
    "msgs/OtherState": [
      { name: "id", type: "int32", isArray: false },
      { name: "speed", type: "float32", isArray: false },
    ],
    "std_msgs/Header": [
      { name: "seq", type: "uint32", isArray: false },
      {
        name: "stamp",
        type: "time",
        isArray: false,
      },
      { name: "frame_id", type: "string", isArray: false },
    ],
  },
  topics: [
    { name: "/some_topic/location", datatype: "msgs/PoseDebug" },
    { name: "/some_topic/state", datatype: "msgs/State" },
  ],
  frame: {},
  globalData: { global_var_1: 42, global_var_2: 10 },
};

const clickInput = (el) => {
  const firstInput = el.querySelector("input");
  if (firstInput) {
    firstInput.focus();
  }
};

type MessageHistoryInputStoryProps = { path: string };

class MessageHistoryInputStory extends React.Component<MessageHistoryInputStoryProps, any> {
  state = { path: this.props.path };

  render() {
    return (
      <PanelSetup fixture={fixture} onMount={clickInput}>
        <Flex style={{ margin: "10px" }}>
          <MessageHistory.Input
            path={this.state.path}
            onChange={(newPath) => {
              this.setState({ path: newPath });
            }}
            timestampMethod="receiveTime"
          />
        </Flex>
      </PanelSetup>
    );
  }
}

storiesOf("<MessageHistory.Input>", module)
  .addDecorator(withScreenshot())
  .add("autocomplete messagePath", () => {
    return <MessageHistoryInputStory path="/some_topic/location.po" />;
  })
  .add("autocomplete filter", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[:]{}" />;
  })
  .add("autocomplete for globalData variables", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[:]{id==$}" />;
  })
  .add("path with valid globalData variable", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[:]{id==$global_var_2}" />;
  })
  .add("path with invalid globalData variable", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[:]{id==$global_var_3}" />;
  })
  .add("path with incorrectly prefixed globalData variable", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[:]{id==global_var_2}" />;
  });
