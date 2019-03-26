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

import StateTransitions from "./index";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const systemStateMessages = [
  { header: { stamp: { sec: 1526191539, nsec: 574635076 } }, state: 1 },
  { header: { stamp: { sec: 1526191539, nsec: 673758203 } }, state: 1 },
  { header: { stamp: { sec: 1526191539, nsec: 770527187 } }, state: 1 },
  { header: { stamp: { sec: 1526191539, nsec: 871076484 } }, state: 1 },
  { header: { stamp: { sec: 1526191539, nsec: 995802312 } }, state: 1 },
  { header: { stamp: { sec: 1526191540, nsec: 81700551 } }, state: 1 },
  { header: { stamp: { sec: 1526191540, nsec: 184463111 } }, state: 1 },
  { header: { stamp: { sec: 1526191540, nsec: 285808851 } }, state: 2 },
  { header: { stamp: { sec: 1526191540, nsec: 371183619 } }, state: 2 },
  { header: { stamp: { sec: 1526191540, nsec: 479369260 } }, state: 2 },
  { header: { stamp: { sec: 1526191540, nsec: 587095370 } }, state: 2 },
  { header: { stamp: { sec: 1526191540, nsec: 685730694 } }, state: 2 },
  { header: { stamp: { sec: 1526191540, nsec: 785737230 } }, state: 2 },
  { header: { stamp: { sec: 1526191540, nsec: 869057829 } }, state: 2 },
  { header: { stamp: { sec: 1526191540, nsec: 984145879 } }, state: 2 },
  { header: { stamp: { sec: 1526191541, nsec: 85765716 } }, state: 2 },
  { header: { stamp: { sec: 1526191541, nsec: 182717960 } }, state: 3 },
  { header: { stamp: { sec: 1526191541, nsec: 286998440 } }, state: 3 },
  { header: { stamp: { sec: 1526191541, nsec: 370689856 } }, state: 3 },
  { header: { stamp: { sec: 1526191541, nsec: 483672422 } }, state: 3 },
  { header: { stamp: { sec: 1526191541, nsec: 578787057 } }, state: 3 },
  { header: { stamp: { sec: 1526191541, nsec: 677515597 } }, state: 3 },
  { header: { stamp: { sec: 1526191541, nsec: 789110904 } }, state: 3 },
];

const fixture = {
  datatypes: {
    "msgs/SystemState": [
      { type: "std_msgs/Header", name: "header", isArray: false },
      { type: "uint8", name: "ERROR", isConstant: true, value: 0 },
      { type: "uint8", name: "OFF", isConstant: true, value: 1 },
      { type: "uint8", name: "BOOTING", isConstant: true, value: 2 },
      { type: "uint8", name: "ACTIVE", isConstant: true, value: 3 },
      { type: "uint8", name: "state", isArray: false },
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
  topics: [{ name: "/some/topic/with/state", datatype: "msgs/SystemState" }],
  activeData: {
    startTime: { sec: 1526191527, nsec: 202050 },
    endTime: { sec: 1526191551, nsec: 999997069 },
    isPlaying: false,
    speed: 0.2,
  },
  frame: {
    "/some/topic/with/state": systemStateMessages.map((message) => ({
      op: "message",
      datatype: "msgs/SystemState",
      topic: "/some/topic/with/state",
      receiveTime: message.header.stamp,
      message,
    })),
  },
};

storiesOf("<StateTransitions>", module)
  .addDecorator(withScreenshot())
  .add("one path", () => {
    return (
      <PanelSetup fixture={fixture}>
        <StateTransitions
          config={{ paths: [{ value: "/some/topic/with/state.state", timestampMethod: "receiveTime" }] }}
        />
      </PanelSetup>
    );
  })
  .add("multiple paths", () => {
    return (
      <PanelSetup fixture={fixture}>
        <StateTransitions
          config={{
            paths: new Array(5).fill({ value: "/some/topic/with/state.state", timestampMethod: "receiveTime" }),
          }}
        />
      </PanelSetup>
    );
  })
  .add("long path", () => {
    return (
      <PanelSetup fixture={fixture} style={{ maxWidth: 100 }}>
        <StateTransitions
          config={{ paths: [{ value: "/some/topic/with/state.state", timestampMethod: "receiveTime" }] }}
        />
      </PanelSetup>
    );
  });
