// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import Flex from "webviz-core/src/components/Flex";
import { MessageHistoryInput } from "webviz-core/src/components/MessageHistory";
import { MockPanelContextProvider } from "webviz-core/src/components/Panel";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const fixture = {
  datatypes: {
    "msgs/PoseDebug": {
      fields: [
        { name: "header", type: "std_msgs/Header", isArray: false },
        { name: "pose", type: "msgs/Pose", isArray: false },
      ],
    },
    "msgs/Pose": {
      fields: [
        { name: "header", type: "std_msgs/Header", isArray: false },
        { name: "x", type: "float64", isArray: false },
        { name: "y", type: "float64", isArray: false },
        { name: "travel", type: "float64", isArray: false },
        { name: "velocity", type: "float64", isArray: false },
        { name: "acceleration", type: "float64", isArray: false },
        { name: "heading", type: "float64", isArray: false },
      ],
    },
    "msgs/State": {
      fields: [
        { name: "header", type: "std_msgs/Header", isArray: false },
        { name: "items", type: "msgs/OtherState", isArray: true },
        { name: "foo_id", type: "uint32", isArray: false },
      ],
    },
    "msgs/OtherState": {
      fields: [
        { name: "id", type: "int32", isArray: false },
        { name: "speed", type: "float32", isArray: false },
        { name: "name", type: "string", isArray: false },
        { name: "valid", type: "bool", isArray: false },
      ],
    },
    "std_msgs/Header": {
      fields: [
        { name: "seq", type: "uint32", isArray: false },
        {
          name: "stamp",
          type: "time",
          isArray: false,
        },
        { name: "frame_id", type: "string", isArray: false },
      ],
    },
  },
  topics: [
    { name: "/some_topic/location", datatype: "msgs/PoseDebug" },
    { name: "/some_topic/state", datatype: "msgs/State" },
  ],
  frame: {},
  globalVariables: { global_var_1: 42, global_var_2: 10 },
};

const clickInput = (el) => {
  const firstInput = el.querySelector("input");
  if (firstInput) {
    firstInput.focus();
  }
};

function MessageHistoryInputStory(props: {| path: string |}) {
  const [path, setPath] = React.useState(props.path);

  return (
    <MockPanelContextProvider>
      <PanelSetup fixture={fixture} onMount={clickInput}>
        <Flex style={{ margin: "10px" }}>
          <MessageHistoryInput path={path} onChange={(newPath) => setPath(newPath)} timestampMethod="receiveTime" />
        </Flex>
      </PanelSetup>
    </MockPanelContextProvider>
  );
}

storiesOf("<MessageHistoryInput>", module)
  .addDecorator(withScreenshot())
  .add("autocomplete topics", () => {
    return <MessageHistoryInputStory path="/" />;
  })
  .add("autocomplete messagePath", () => {
    return <MessageHistoryInputStory path="/some_topic/location.po" />;
  })
  .add("autocomplete filter", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[:]{}" />;
  })
  .add("autocomplete top level filter", () => {
    return <MessageHistoryInputStory path="/some_topic/state{}" />;
  })
  .add("autocomplete for globalVariables variables", () => {
    return <MessageHistoryInputStory path="/some_topic/state{foo_id==0}.items[:]{id==$}" />;
  })
  .add("path with valid globalVariables variable", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[:]{id==$global_var_2}" />;
  })
  .add("path with invalid globalVariables variable", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[:]{id==$global_var_3}" />;
  })
  .add("path with incorrectly prefixed globalVariables variable", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[:]{id==global_var_2}" />;
  })
  .add("autocomplete for path with globalVariables variable in slice (single idx)", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[$]" />;
  })
  .add("autocomplete for path with globalVariables variable in slice (start idx)", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[$:]" />;
  })
  .add("autocomplete for path with globalVariables variable in slice (end idx)", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[:$]" />;
  })
  .add("autocomplete for path with globalVariables variables in slice (start and end idx)", () => {
    return <MessageHistoryInputStory path="/some_topic/state.items[$global_var_2:$]" />;
  });
