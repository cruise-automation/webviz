// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import React, { useState, useCallback } from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import { OldTimeBasedChart as TimeBasedChart } from ".";

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
        data: [
          {
            x: 0.000057603000000000004,
            y: 5.544444561004639,
            tooltip: {
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
                queriedData: [{ value: 5.544444561004639, path: "/turtle1/pose.x" }],
              },
              path: "/turtle1/pose.x",
              value: 5.544444561004639,
              startTime: { sec: 1396293889, nsec: 156763 },
            },
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
      },
    ],
  },
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
      {!hasRenderedOnce && <TimeBasedChart {...props} />}
    </div>
  );
}

storiesOf("<TimeBasedChart>", module)
  .addDecorator(withScreenshot({ delay: 500 }))
  .add("default", () => {
    return (
      <div style={{ width: "100%", height: "100%", background: "black" }}>
        <TimeBasedChart {...props} />
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
            const x = 414 + left;
            const y = 672 + top;
            canvas.dispatchEvent(new MouseEvent("mousemove", { screenX: x, clientX: x, screenY: y, clientY: y }));
          }, 200);
        }}>
        <TimeBasedChart {...props} />
      </div>
    );
  })
  .add("cleans up the tooltip when removing the panel", () => {
    return <CleansUpTooltipExample />;
  });
