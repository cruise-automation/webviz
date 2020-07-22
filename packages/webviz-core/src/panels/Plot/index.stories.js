// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { type Time, MessageWriter, parseMessageDefinition } from "rosbag";

import Plot from "webviz-core/src/panels/Plot";
import PanelSetup, { triggerWheel } from "webviz-core/src/stories/PanelSetup";
import { fromSec } from "webviz-core/src/util/time";

const float64StampedDefinition = `std_msgs/Header header
float64 data

================================================================================
MSG: std_msgs/Header
uint32 seq
time stamp
string frame_id`;

const writer = new MessageWriter(parseMessageDefinition(float64StampedDefinition));

const serializeFloat64Stamped = ({ value, headerStamp: { sec, nsec } }: { value: number, headerStamp: Time }) => {
  const buffer = writer.writeMessage({ header: { seq: 0, stamp: { sec, nsec }, frame_id: "" }, data: value });
  return Buffer.from(buffer);
};

const locationMessages = [
  { header: { stamp: { sec: 0, nsec: 574635076 } }, pose: { acceleration: -0.00116662939, velocity: 1.184182664 } },
  { header: { stamp: { sec: 0, nsec: 673758203 } }, pose: { acceleration: -0.0072101709, velocity: 1.182555127 } },
  { header: { stamp: { sec: 0, nsec: 770527187 } }, pose: { acceleration: 0.0079536558, velocity: 1.185625054 } },
  { header: { stamp: { sec: 0, nsec: 871076484 } }, pose: { acceleration: 0.037758707, velocity: 1.193871954 } },
  { header: { stamp: { sec: 0, nsec: 995802312 } }, pose: { acceleration: 0.085267948, velocity: 1.210280466 } },
  { header: { stamp: { sec: 1, nsec: 81700551 } }, pose: { acceleration: 0.34490595, velocity: 1.28371423 } },
  { header: { stamp: { sec: 1, nsec: 184463111 } }, pose: { acceleration: 0.59131456, velocity: 1.379807198 } },
  { header: { stamp: { sec: 1, nsec: 285808851 } }, pose: { acceleration: 0.78738064, velocity: 1.487955727 } },
  { header: { stamp: { sec: 1, nsec: 371183619 } }, pose: { acceleration: 0.91150866, velocity: 1.581979428 } },
  { header: { stamp: { sec: 1, nsec: 479369260 } }, pose: { acceleration: 1.03091162, velocity: 1.70297429 } },
  { header: { stamp: { sec: 1, nsec: 587095370 } }, pose: { acceleration: 1.15341371, velocity: 1.857311045 } },
  { header: { stamp: { sec: 1, nsec: 685730694 } }, pose: { acceleration: 1.06827219, velocity: 1.951372604 } },
  { header: { stamp: { sec: 1, nsec: 785737230 } }, pose: { acceleration: 0.76826461, velocity: 1.98319952 } },
  { header: { stamp: { sec: 1, nsec: 869057829 } }, pose: { acceleration: 0.52827271, velocity: 1.984654942 } },
  { header: { stamp: { sec: 1, nsec: 984145879 } }, pose: { acceleration: 0.16827019, velocity: 1.958059206 } },
  { header: { stamp: { sec: 2, nsec: 85765716 } }, pose: { acceleration: -0.13173667, velocity: 1.899877099 } },
  { header: { stamp: { sec: 2, nsec: 182717960 } }, pose: { acceleration: -0.196482967, velocity: 1.87051731 } },
  { header: { stamp: { sec: 2, nsec: 286998440 } }, pose: { acceleration: -0.204713665, velocity: 1.848811251 } },
  { header: { stamp: { sec: 2, nsec: 370689856 } }, pose: { acceleration: -0.18596813, velocity: 1.837120153 } },
  { header: { stamp: { sec: 2, nsec: 483672422 } }, pose: { acceleration: -0.13091373, velocity: 1.828568433 } },
  { header: { stamp: { sec: 2, nsec: 578787057 } }, pose: { acceleration: -0.119039923, velocity: 1.82106361 } },
  { header: { stamp: { sec: 2, nsec: 677515597 } }, pose: { acceleration: -0.419040352, velocity: 1.734159507 } },
  { header: { stamp: { sec: 2, nsec: 789110904 } }, pose: { acceleration: -0.48790808, velocity: 1.666657974 } },
];

const otherStateMessages = [
  { header: { stamp: { sec: 0, nsec: 574635076 } }, items: [{ id: 42, speed: 0.1 }] },
  { header: { stamp: { sec: 0, nsec: 871076484 } }, items: [{ id: 42, speed: 0.2 }] },
  { header: { stamp: { sec: 1, nsec: 81700551 } }, items: [{ id: 42, speed: 0.3 }] },
  { header: { stamp: { sec: 1, nsec: 479369260 } }, items: [{ id: 10, speed: 1.4 }, { id: 42, speed: 0.2 }] },
  { header: { stamp: { sec: 1, nsec: 785737230 } }, items: [{ id: 10, speed: 1.5 }, { id: 42, speed: 0.1 }] },
  { header: { stamp: { sec: 2, nsec: 182717960 } }, items: [{ id: 10, speed: 1.57 }, { id: 42, speed: 0.08 }] },
  { header: { stamp: { sec: 2, nsec: 578787057 } }, items: [{ id: 10, speed: 1.63 }, { id: 42, speed: 0.06 }] },
];

const getPreloadedMessage = (seconds) => ({
  topic: "/preloaded_topic",
  receiveTime: fromSec(seconds),
  message: serializeFloat64Stamped({ value: Math.pow(seconds, 2), headerStamp: fromSec(seconds - 0.5) }),
});

const messageCache = {
  blocks: [
    ...[0.6, 0.7, 0.8, 0.9, 1.0].map((seconds) => ({
      sizeInBytes: 0,
      messagesByTopic: {
        "/preloaded_topic": [getPreloadedMessage(seconds)],
      },
    })),
    undefined, // 1.1
    undefined, // 1.2
    undefined, // 1.3
    undefined, // 1.4
    ...[1.5, 1.6, 1.7, 1.8, 1.9].map((seconds) => ({
      sizeInBytes: 0,
      messagesByTopic: {
        "/preloaded_topic": [getPreloadedMessage(seconds)],
      },
    })),
  ],
  startTime: fromSec(0.6),
};

const withEndTime = (testFixture, endTime) => ({
  ...testFixture,
  activeData: { ...testFixture.activeData, endTime },
});

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
      ],
    },
    "msgs/OtherState": {
      fields: [{ name: "id", type: "int32", isArray: false }, { name: "speed", type: "float32", isArray: false }],
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
    "std_msgs/Bool": { fields: [{ name: "data", type: "bool", isArray: false }] },
    "nonstd_msgs/Float64Stamped": {
      fields: [
        { name: "header", type: "std_msgs/Header", isArray: false },
        { name: "data", type: "float64", isArray: false },
      ],
    },
  },
  topics: [
    { name: "/some_topic/location", datatype: "msgs/PoseDebug" },
    { name: "/some_topic/location_subset", datatype: "msgs/PoseDebug" },
    { name: "/some_topic/state", datatype: "msgs/State" },
    { name: "/boolean_topic", datatype: "std_msgs/Bool" },
    { name: "/preloaded_topic", datatype: "nonstd_msgs/Float64Stamped" },
  ],
  activeData: {
    startTime: { sec: 0, nsec: 202050 },
    endTime: { sec: 24, nsec: 999997069 },
    currentTime: { sec: 0, nsec: 750000000 },
    isPlaying: false,
    messageDefinitionsByTopic: { "/preloaded_topic": float64StampedDefinition },
    speed: 0.2,
  },
  frame: {
    "/some_topic/location": locationMessages.map((message) => ({
      topic: "/some_topic/location",
      receiveTime: message.header.stamp,
      message,
    })),
    "/some_topic/location_subset": locationMessages
      .slice(locationMessages.length / 3, (locationMessages.length * 2) / 3)
      .map((message) => ({
        topic: "/some_topic/location_subset",
        receiveTime: message.header.stamp,
        message,
      })),
    "/some_topic/state": otherStateMessages.map((message) => ({
      topic: "/some_topic/state",
      receiveTime: message.header.stamp,
      message,
    })),
    "/boolean_topic": [
      {
        topic: "/boolean_topic",
        receiveTime: { sec: 1, nsec: 0 },
        message: { data: true },
      },
    ],
  },
  progress: { messageCache },
};

const paths = [
  { value: "/some_topic/location.pose.velocity", enabled: true, timestampMethod: "receiveTime" },
  { value: "/some_topic/location.pose.acceleration", enabled: true, timestampMethod: "receiveTime" },
  { value: "/some_topic/location.pose.acceleration.@derivative", enabled: true, timestampMethod: "receiveTime" },
  { value: "/boolean_topic.data", enabled: true, timestampMethod: "receiveTime" },
  { value: "/some_topic/state.items[0].speed", enabled: true, timestampMethod: "receiveTime" },
  { value: "/some_topic/location.header.stamp", enabled: true, timestampMethod: "receiveTime" },
];

const exampleConfig = { paths, minYValue: "", maxYValue: "", showLegend: true, xAxisVal: "timestamp" };
storiesOf("<Plot>", module)
  .addParameters({
    screenshot: {
      delay: 1000,
    },
  })
  .add("line graph", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot config={exampleConfig} />
      </PanelSetup>
    );
  })
  .add("line graph with legends hidden", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot config={{ ...exampleConfig, showLegend: false }} />
      </PanelSetup>
    );
  })
  .add("in a line graph with multiple plots, x-axes are synced", () => {
    return (
      <PanelSetup fixture={fixture} style={{ flexDirection: "column" }}>
        <Plot
          config={{
            ...exampleConfig,
            paths: [
              {
                value: "/some_topic/location.pose.acceleration",
                enabled: true,
                timestampMethod: "receiveTime",
              },
            ],
          }}
        />
        <Plot
          config={{
            ...exampleConfig,
            paths: [
              {
                value: "/some_topic/location_subset.pose.velocity",
                enabled: true,
                timestampMethod: "receiveTime",
              },
            ],
          }}
        />
      </PanelSetup>
    );
  })
  .add("line graph after zoom", () => {
    return (
      <PanelSetup
        fixture={fixture}
        onMount={(el) => {
          setTimeout(() => {
            const canvasEl = el.querySelector("canvas");
            // Zoom is a continuous event, so we need to simulate wheel multiple times
            if (canvasEl) {
              for (let i = 0; i < 5; i++) {
                triggerWheel(canvasEl, 1);
              }
            }
          }, 100);
        }}>
        <Plot config={exampleConfig} />
      </PanelSetup>
    );
  })
  .add("timestampMethod: headerStamp", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            ...exampleConfig,
            paths: [
              { value: "/some_topic/location.pose.velocity", enabled: true, timestampMethod: "headerStamp" },
              { value: "/boolean_topic.data", enabled: true, timestampMethod: "headerStamp" },
            ],
          }}
        />
      </PanelSetup>
    );
  })
  .add("long path", () => {
    return (
      <PanelSetup fixture={fixture} style={{ maxWidth: 250 }}>
        <Plot
          config={{
            ...exampleConfig,
            paths: [{ value: "/some_topic/location.pose.velocity", enabled: true, timestampMethod: "receiveTime" }],
          }}
        />
      </PanelSetup>
    );
  })
  .add("disabled path", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            ...exampleConfig,
            paths: [
              { value: "/some_topic/location.pose.velocity", enabled: false, timestampMethod: "receiveTime" },
              { value: "/some_topic/location.pose.acceleration", enabled: true, timestampMethod: "receiveTime" },
            ],
          }}
        />
      </PanelSetup>
    );
  })
  .add("reference line", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            xAxisVal: "timestamp",
            paths: [
              { value: "0", enabled: true, timestampMethod: "receiveTime" },
              // Test typing a period for decimal values. value: "1.", enabled: true, timestampMethod: "receiveTime",
              { value: "1.", enabled: true, timestampMethod: "receiveTime" },
              { value: "1.5", enabled: true, timestampMethod: "receiveTime" },
              { value: "1", enabled: false, timestampMethod: "receiveTime" },
            ],
            minYValue: "-1",
            maxYValue: "2",
            showLegend: true,
          }}
        />
      </PanelSetup>
    );
  })
  .add("with min and max Y values", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            xAxisVal: "timestamp",
            paths: [{ value: "/some_topic/location.pose.velocity", enabled: true, timestampMethod: "receiveTime" }],
            minYValue: "1",
            maxYValue: "2.8",
            showLegend: true,
          }}
        />
      </PanelSetup>
    );
  })
  .add("with just min Y value less than minimum value", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            xAxisVal: "timestamp",
            paths: [{ value: "/some_topic/location.pose.velocity", enabled: true, timestampMethod: "receiveTime" }],
            minYValue: "1",
            maxYValue: "",
            showLegend: true,
          }}
        />
      </PanelSetup>
    );
  })
  .add("with just min Y value more than minimum value", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            xAxisVal: "timestamp",
            paths: [{ value: "/some_topic/location.pose.velocity", enabled: true, timestampMethod: "receiveTime" }],
            minYValue: "1.4",
            maxYValue: "",
            showLegend: true,
          }}
        />
      </PanelSetup>
    );
  })
  .add("with just max Y value less than maximum value", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            xAxisVal: "timestamp",
            paths: [{ value: "/some_topic/location.pose.velocity", enabled: true, timestampMethod: "receiveTime" }],
            minYValue: "",
            maxYValue: "1.8",
            showLegend: true,
          }}
        />
      </PanelSetup>
    );
  })
  .add("with just max Y value more than maximum value", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            xAxisVal: "timestamp",
            paths: [{ value: "/some_topic/location.pose.velocity", enabled: true, timestampMethod: "receiveTime" }],
            minYValue: "",
            maxYValue: "2.8",
            showLegend: true,
          }}
        />
      </PanelSetup>
    );
  })
  .add("scatter plot plus line graph plus reference line", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            ...exampleConfig,
            paths: [
              { value: "/some_topic/state.items[:].speed", enabled: true, timestampMethod: "receiveTime" },
              { value: "/some_topic/location.pose.velocity", enabled: true, timestampMethod: "receiveTime" },
              { value: "3", enabled: true, timestampMethod: "receiveTime" },
            ],
          }}
        />
      </PanelSetup>
    );
  })
  .add("open x-axis dropdown menu", () => {
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          const xAxisDropdown = document.querySelectorAll("[data-test=plot-legend-x-axis-menu]")[0];
          xAxisDropdown.click();
        }}>
        <Plot config={exampleConfig} />
      </PanelSetup>
    );
  })
  .add("index-based x-axis for array", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            ...exampleConfig,
            xAxisVal: "index",
            paths: [
              { value: "/some_topic/state.items[:].speed", enabled: true, timestampMethod: "receiveTime" },
              // Should show up only in the legend: For now index plots always use playback data, and ignore preloaded data.
              { value: "/preloaded_topic.data", enabled: true, timestampMethod: "receiveTime" },
            ],
          }}
        />
      </PanelSetup>
    );
  })
  .add("custom x-axis topic", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            ...exampleConfig,
            xAxisVal: "custom",
            paths: [{ value: "/some_topic/location.pose.acceleration", enabled: true, timestampMethod: "receiveTime" }],
            xAxisPath: { value: "/some_topic/location.pose.velocity", enabled: true },
          }}
        />
      </PanelSetup>
    );
  })
  .add("current custom x-axis topic", () => {
    // As above, but just shows a single point instead of the whole line.
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            ...exampleConfig,
            xAxisVal: "currentCustom",
            paths: [{ value: "/some_topic/location.pose.acceleration", enabled: true, timestampMethod: "receiveTime" }],
            xAxisPath: { value: "/some_topic/location.pose.velocity", enabled: true },
          }}
        />
      </PanelSetup>
    );
  })
  .add("custom x-axis topic with mismatched data lengths", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            ...exampleConfig,
            xAxisVal: "custom",
            paths: [
              // Extra items in y-axis
              { value: "/some_topic/location.pose.acceleration", enabled: true, timestampMethod: "receiveTime" },
              // Same number of items
              { value: "/some_topic/location_subset.pose.acceleration", enabled: true, timestampMethod: "receiveTime" },
              // Fewer items in y-axis
              { value: "/some_topic/state.items[:].speed", enabled: true, timestampMethod: "receiveTime" },
            ],
            xAxisPath: { value: "/some_topic/location_subset.pose.velocity", enabled: true },
          }}
        />
      </PanelSetup>
    );
  })
  .add("super close values", () => {
    return (
      <PanelSetup
        fixture={{
          datatypes: { "std_msgs/Float32": { fields: [{ name: "data", type: "float32", isArray: false }] } },
          topics: [{ name: "/some_number", datatype: "std_msgs/Float32" }],
          activeData: { startTime: { sec: 0, nsec: 0 }, endTime: { sec: 10, nsec: 0 }, isPlaying: false, speed: 0.2 },
          frame: {
            "/some_number": [
              {
                topic: "/some_number",
                receiveTime: { sec: 0, nsec: 0 },
                message: { data: 1.8548483304974972 },
              },
              {
                topic: "/some_number",
                receiveTime: { sec: 1, nsec: 0 },
                message: { data: 1.8548483304974974 },
              },
            ],
          },
        }}>
        <Plot
          config={{
            ...exampleConfig,
            paths: [{ value: "/some_number.data", enabled: true, timestampMethod: "receiveTime" }],
          }}
        />
      </PanelSetup>
    );
  })
  .add("time values", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Plot
          config={{
            ...exampleConfig,
            xAxisVal: "custom",
            paths: [{ value: "/some_topic/location.pose.velocity", enabled: true, timestampMethod: "receiveTime" }],
            xAxisPath: { value: "/some_topic/location.header.stamp", enabled: true },
          }}
        />
      </PanelSetup>
    );
  })
  .add("preloaded data in binary blocks", () => {
    localStorage.setItem("experimentalFeaturesSettings", JSON.stringify({ preloading: "alwaysOn" }));
    return (
      <PanelSetup fixture={withEndTime(fixture, { sec: 2, nsec: 0 })}>
        <Plot
          config={{
            ...exampleConfig,
            paths: [
              { value: "/preloaded_topic.data", enabled: true, timestampMethod: "receiveTime" },
              { value: "/preloaded_topic.data", enabled: true, timestampMethod: "headerStamp" },
            ],
          }}
        />
      </PanelSetup>
    );
  })
  .add("mixed streamed and preloaded data", () => {
    localStorage.setItem("experimentalFeaturesSettings", JSON.stringify({ preloading: "alwaysOn" }));
    return (
      <PanelSetup fixture={withEndTime(fixture, { sec: 3, nsec: 0 })}>
        <Plot
          config={{
            ...exampleConfig,
            paths: [
              { value: "/some_topic/state.items[0].speed", enabled: true, timestampMethod: "receiveTime" },
              { value: "/preloaded_topic.data", enabled: true, timestampMethod: "receiveTime" },
            ],
          }}
        />
      </PanelSetup>
    );
  })
  .add("preloaded data and its derivative", () => {
    localStorage.setItem("experimentalFeaturesSettings", JSON.stringify({ preloading: "alwaysOn" }));
    return (
      <PanelSetup fixture={withEndTime(fixture, { sec: 2, nsec: 0 })}>
        <Plot
          config={{
            ...exampleConfig,
            paths: [
              { value: "/preloaded_topic.data", enabled: true, timestampMethod: "receiveTime" },
              { value: "/preloaded_topic.data.@derivative", enabled: true, timestampMethod: "receiveTime" },
            ],
          }}
        />
      </PanelSetup>
    );
  });
