// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withKnobs, number } from "@storybook/addon-knobs";
import { storiesOf } from "@storybook/react";
import React from "react";
import { findDOMNode } from "react-dom";
import { withScreenshot } from "storybook-chrome-screenshot";

import DiagnosticStatusPanel from "webviz-core/src/panels/diagnostics/DiagnosticStatusPanel";
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
                  value: "hearts: <3\nqux reallylongwordthatshouldbeforcedtobreak",
                },
                {
                  key: "supports <b><u>basic</u> html</b> in keys/values",
                  value: `\
like<br /><b><u>this</u>!</b><br/><tt><i>mono</i>\
<font color="orange">space</font></tt><script src="xss://example.co">hi</script>\
<table><tr><th colspan=2><center>&larrlp; And &#8620;</center></th></tr><tr><td>even</td><td>tables!</td></tr></table>\
no hearts: <3`,
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

const selectedHardwareId = "node";
const selectedName = "node: Some synthetic diagnostic with long name";

storiesOf("<DiagnosticStatusPanel>", module)
  .addDecorator(withKnobs)
  .add(
    "simple",
    withScreenshot({ knobs: { splitFraction: [0.25, undefined, 0.75] } })(() => {
      const splitFraction = number("splitFraction", 0.4, { range: true, min: 0, max: 1, step: 0.01 });
      return (
        <PanelSetup
          fixture={fixture}
          style={{ width: 250 }}
          onMount={(el) => {
            // $FlowFixMe
            const resizeHandle: Element = findDOMNode(el) //eslint-disable-line react/no-find-dom-node
              .querySelector("[data-test-resizehandle]");
            resizeHandle.tabIndex = 0;
            resizeHandle.focus();
          }}>
          <DiagnosticStatusPanel
            config={{
              selectedHardwareId,
              selectedName,
              splitFraction: splitFraction || undefined,
            }}
          />
        </PanelSetup>
      );
    })
  )
  .add(
    "waiting for message",
    withScreenshot()(() => {
      return (
        <PanelSetup fixture={{ ...fixture, frame: {} }} style={{ width: 250 }}>
          <DiagnosticStatusPanel
            config={{
              selectedHardwareId,
              selectedName,
            }}
          />
        </PanelSetup>
      );
    })
  )
  .add(
    "empty state",
    withScreenshot()(() => {
      return (
        <PanelSetup fixture={fixture} style={{ width: 250 }}>
          <DiagnosticStatusPanel />
        </PanelSetup>
      );
    })
  );
