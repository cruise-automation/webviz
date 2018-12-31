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

import DiagnosticSummary from "webviz-core/src/panels/diagnostics/DiagnosticSummary";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { DIAGNOSTIC_TOPIC } from "webviz-core/src/util/globalConstants";

const fixture = {
  topics: [{ name: DIAGNOSTIC_TOPIC, datatype: "diagnostic_msgs/DiagnosticArray" }],
  frame: {
    [DIAGNOSTIC_TOPIC]: [
      {
        op: "message",
        topic: DIAGNOSTIC_TOPIC,
        datatype: "diagnostic_msgs/DiagnosticArray",
        receiveTime: {
          sec: 1529965609,
          nsec: 181214696,
        },
        message: {
          header: {
            seq: 209903,
            stamp: {
              sec: 1529965609,
              nsec: 181087516,
            },
            frame_id: "",
          },
          status: [
            {
              level: 0,
              name: "node: Some synthetic diagnostic with long name",
              message: "The summary of the message goes here",
              hardware_id: "node",
              values: [
                {
                  key: "Distance",
                  value: new Array(20).fill("foo "),
                },
                {
                  key: "--can collapse--",
                  value: "",
                },
                {
                  key: "foo reallylongwordthatshouldbeforcedtobreak",
                  value: "bar",
                },
                {
                  key: "baz",
                  value: "qux reallylongwordthatshouldbeforcedtobreak",
                },
              ],
            },
          ],
        },
      },
      {
        op: "message",
        topic: DIAGNOSTIC_TOPIC,
        datatype: "diagnostic_msgs/DiagnosticArray",
        receiveTime: {
          sec: 1529965609,
          nsec: 181214696,
        },
        message: {
          header: {
            seq: 209903,
            stamp: {
              sec: 1529965609,
              nsec: 181087516,
            },
            frame_id: "",
          },
          status: [
            {
              level: 0,
              name: "SomePlanner: Status",
              message: "TODO summary",
              hardware_id: "some_node_health",
              values: [
                {
                  key: "Previous State",
                  value: "1",
                },
                {
                  key: "Current State",
                  value: "1",
                },
                {
                  key: "State Transition Time",
                  value: "4.6e-08",
                },
              ],
            },
          ],
        },
      },
    ],
  },
};

storiesOf("<DiagnosticSummary>", module).add(
  "simple",
  withScreenshot()(() => {
    return (
      <PanelSetup fixture={fixture} style={{ width: "100%" }}>
        <DiagnosticSummary />
      </PanelSetup>
    );
  })
);
