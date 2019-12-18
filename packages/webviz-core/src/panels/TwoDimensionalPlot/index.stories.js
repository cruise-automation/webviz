// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import * as React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import TwoDimensionalPlot from "./index";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const fixture = {
  topics: [{ name: "/plot_a", datatype: "dummy" }],
  frame: {
    "/plot_a": [
      {
        op: "message",
        topic: "/plot_a",
        datatype: "webviz_msgs/2DPlotMsg",
        receiveTime: { sec: 1532375120, nsec: 317760607 },
        message: {
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
          polygons: [
            {
              label: "polygon",
              borderColor: "lightgray",
              backgroundColor: "lightgray",
              data: [{ x: 3, y: 1 }, { x: 4, y: 2 }, { x: 4.5, y: 1.5 }],
            },
          ],
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
        <TwoDimensionalPlot config={{ path: { value: "/plot_a" } }} />
      </PanelSetup>
    );
  })
  .add("example with custom min/max window", () => {
    return (
      <PanelSetup fixture={fixture}>
        <TwoDimensionalPlot
          config={{ path: { value: "/plot_a" }, minXVal: "0.5", maxXVal: "6.5", minYVal: "0.5", maxYVal: "4.5" }}
        />
      </PanelSetup>
    );
  })
  .add("example with some custom min/max vals set", () => {
    return (
      <PanelSetup fixture={fixture}>
        <TwoDimensionalPlot config={{ path: { value: "/plot_a" }, maxYVal: "10" }} />
      </PanelSetup>
    );
  })
  .add("empty topic", () => {
    return (
      <PanelSetup fixture={fixture}>
        <TwoDimensionalPlot config={{ path: { value: "/plot_b" } }} />
      </PanelSetup>
    );
  });
