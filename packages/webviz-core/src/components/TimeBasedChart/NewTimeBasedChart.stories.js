// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import cloneDeep from "lodash/cloneDeep";
import React, { useState, useCallback } from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import TimeBasedChart from "./NewTimeBasedChart";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import { triggerWheel } from "webviz-core/src/stories/PanelSetup";

const dataX = 0.000057603000000000004;
const dataY = 5.544444561004639;
const path = "/turtle1/pose.x";
const tooltipData = {
  x: dataX,
  y: dataY,
  item: {
    message: {
      op: "message",
      topic: "/turtle1/pose",
      datatype: "turtlesim/Pose",
      receiveTime: { sec: 1396293889, nsec: 214366 },
      message: {
        x: 5.544444561004639,
        y: 5.544444561004639,
        theta: 0,
        linear_velocity: 0,
        angular_velocity: 0,
      },
    },
    queriedData: [{ constantName: "", value: 5.544444561004639, path: "/turtle1/pose.x" }],
  },
  path: "/turtle1/pose.x",
  datasetKey: "0",
  value: 5.544444561004639,
  startTime: { sec: 1396293889, nsec: 156763 },
};

const props = {
  isSynced: true,
  zoom: true,
  width: 867.272705078125,
  height: 1139.1051025390625,
  data: {
    datasets: [
      {
        borderColor: "#4e98e2",
        label: "/turtle1/pose.x",
        key: "0",
        showLine: true,
        fill: false,
        borderWidth: 1,
        pointRadius: 1.5,
        pointHoverRadius: 3,
        pointBackgroundColor: "#74beff",
        pointBorderColor: "transparent",
        path,
        data: [
          {
            x: dataX,
            y: dataY,
            tooltip: tooltipData,
          },
        ],
      },
      {
        borderColor: "#f5774d",
        label: "a42771fb-b547-4c61-bbaa-9059dec68e49",
        key: "1",
        showLine: true,
        fill: false,
        borderWidth: 1,
        pointRadius: 1.5,
        pointHoverRadius: 3,
        pointBackgroundColor: "#ff9d73",
        pointBorderColor: "transparent",
        data: [],
        path: "",
      },
    ],
  },
  tooltips: [tooltipData],
  annotations: [],
  type: "scatter",
  yAxes: [
    {
      id: "Y_AXIS_ID",
      ticks: { precision: 3 },
      gridLines: { color: "rgba(255, 255, 255, 0.2)", zeroLineColor: "rgba(255, 255, 255, 0.2)" },
    },
  ],
  useFixedYAxisWidth: true,
};

function CleansUpTooltipExample() {
  const [hasRenderedOnce, setHasRenderedOnce] = useState<boolean>(false);
  const refFn = useCallback(() => {
    setTimeout(() => {
      const [canvas] = document.getElementsByTagName("canvas");
      const { top, left } = canvas.getBoundingClientRect();
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 363 + left, clientY: 650 + top }));
      setTimeout(() => {
        setHasRenderedOnce(true);
      }, 100);
    }, 200);
  }, []);
  return (
    <div style={{ width: "100%", height: "100%", background: "black" }} ref={refFn}>
      <MockMessagePipelineProvider>{!hasRenderedOnce && <TimeBasedChart {...props} />}</MockMessagePipelineProvider>
    </div>
  );
}

function ZoomExample() {
  const [, forceUpdate] = useState();
  const newProps = cloneDeep(props);
  const newDataPoint = cloneDeep(newProps.data.datasets[0].data[0]);
  newDataPoint.x = 20;
  newProps.data.datasets[0].data[1] = newDataPoint;

  const refFn = useCallback(() => {
    setTimeout(() => {
      const canvasEl = document.querySelector("canvas");
      // Zoom is a continuous event, so we need to simulate wheel multiple times
      if (canvasEl) {
        for (let i = 0; i < 5; i++) {
          triggerWheel(canvasEl, 1);
        }
        setTimeout(() => {
          forceUpdate();
        }, 10);
      }
    }, 200);
  }, []);

  return (
    <div style={{ width: 800, height: 800, background: "black" }} ref={refFn}>
      <MockMessagePipelineProvider>
        <TimeBasedChart {...newProps} width={800} height={800} />
      </MockMessagePipelineProvider>
    </div>
  );
}

storiesOf("<NewTimeBasedChart>", module)
  .addDecorator(withScreenshot({ delay: 500 }))
  .add("default", () => {
    return (
      <div style={{ width: "100%", height: "100%", background: "black" }}>
        <MockMessagePipelineProvider>
          <TimeBasedChart {...props} />
        </MockMessagePipelineProvider>
      </div>
    );
  })
  .add("with tooltip and vertical bar", () => {
    return (
      <div
        style={{ width: "100%", height: "100%", background: "black" }}
        ref={() => {
          setTimeout(() => {
            const [canvas] = document.getElementsByTagName("canvas");
            const { top, left } = canvas.getBoundingClientRect();
            document.dispatchEvent(new MouseEvent("mousemove", { clientX: 363 + left, clientY: 400 + top }));
          }, 200);
        }}>
        <MockMessagePipelineProvider>
          <TimeBasedChart {...props} />
        </MockMessagePipelineProvider>
      </div>
    );
  })
  .add("can zoom and then update with new data without resetting the zoom", () => <ZoomExample />)
  .add("cleans up the tooltip when removing the panel", () => {
    return <CleansUpTooltipExample />;
  });
