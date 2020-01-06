// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import React, { useState } from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import TwoDimensionalPlot from "./index";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const example0 = {
  type: "webviz_msgs/2DPlotMsg",
  title: "This is Plot A",
  xAxisLabel: "This is my X axis label",
  yAxisLabel: "This is my Y axis label",
  lines: [
    { label: "solid-line", borderColor: "red", backgroundColor: "red", data: [{ x: 0, y: 0 }, { x: 5, y: 5 }] },
    {
      order: 1,
      label: "dashed-line",
      borderDash: [5, 5],
      borderColor: "pink",
      backgroundColor: "pink",
      data: [{ x: 1, y: 1.5 }, { x: 5, y: 3.5 }],
    },
  ],
  points: [
    {
      label: "circle-point",
      pointBackgroundColor: "blue",
      data: [{ x: 1.5, y: 2.5 }, { x: 3, y: 4 }, { x: 4, y: 3.5 }],
    },
    {
      label: "cross-point",
      pointBackgroundColor: "teal",
      pointBorderColor: "teal",
      pointBorderWidth: 3,
      pointStyle: "star",
      pointRadius: 10,
      data: [{ x: 2, y: 1 }, { x: 4, y: 1 }],
    },
  ],
};

const example1 = {
  type: "webviz_msgs/2DPlotMsg",
  lines: [
    // This also has a solid-line, but with completely different dimensions. If we don't properly
    // clone these objects, Chart.js might mutate the object above because the label is the same.
    { label: "solid-line", data: [{ x: 100, y: 100 }, { x: 200, y: 100 }] },
  ],
};

const fixture = {
  topics: [{ name: "/plot_a", datatype: "our_plot_type" }],
  datatypes: {
    our_plot_type: {
      fields: [{ isArray: true, isComplex: true, name: "versions", type: "dummy" }],
    },
    dummy: { fields: [] },
  },
  frame: {
    "/plot_a": [
      {
        op: "message",
        topic: "/plot_a",
        datatype: "our_plot_type",
        receiveTime: { sec: 1532375120, nsec: 317760607 },
        message: {
          versions: [example0, example1],
        },
      },
    ],
  },
};
storiesOf("<TwoDimensionalPlot>", module)
  .addDecorator(withScreenshot())
  .add("example", () => {
    return (
      <PanelSetup fixture={fixture}>
        <TwoDimensionalPlot config={{ path: { value: "/plot_a.versions[0]" } }} />
      </PanelSetup>
    );
  })
  .add("example with custom min/max window", () => {
    return (
      <PanelSetup fixture={fixture}>
        <TwoDimensionalPlot
          config={{
            path: { value: "/plot_a.versions[0]" },
            minXVal: "0.5",
            maxXVal: "6.5",
            minYVal: "0.5",
            maxYVal: "4.5",
          }}
        />
      </PanelSetup>
    );
  })
  .add("example with some custom min/max vals set", () => {
    return (
      <PanelSetup fixture={fixture}>
        <TwoDimensionalPlot config={{ path: { value: "/plot_a.versions[0]" }, maxYVal: "10" }} />
      </PanelSetup>
    );
  })
  .add("empty topic", () => {
    return (
      <PanelSetup fixture={fixture}>
        <TwoDimensionalPlot config={{ path: { value: "/plot_b" } }} />
      </PanelSetup>
    );
  })
  .add("switching between similar examples should not mutate anything", () => {
    function Example() {
      const [iteration, setIteration] = useState(0);
      if (iteration < 2) {
        requestAnimationFrame(() => setIteration(iteration + 1));
      }
      // Cycle between versions 0 -> 1 -> 0.
      const version = { "0": 0, "1": 1, "2": 0 }[iteration];

      return <TwoDimensionalPlot config={{ path: { value: `/plot_a.versions[${version}]` } }} />;
    }

    return (
      <PanelSetup fixture={fixture}>
        <Example />
      </PanelSetup>
    );
  });
