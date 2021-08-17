// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import React, { useState } from "react";

import TwoDimensionalPlot from "./index";
import PanelSetup, { triggerWheel } from "webviz-core/src/stories/PanelSetup";

const example0 = {
  title: "This is Plot A",
  xAxisLabel: "This is my X axis label",
  yAxisLabel: "This is my Y axis label",
  lines: [
    {
      order: 0,
      label: "solid-line",
      borderDash: [],
      borderColor: "red",
      backgroundColor: "red",
      pointBackgroundColor: "",
      pointBorderColor: "",
      pointBorderWidth: 0,
      pointStyle: "",
      pointRadius: 3,
      data: [{ x: 0, y: 0 }, { x: 5, y: 5 }],
    },
    {
      order: 1,
      label: "dashed-line",
      borderDash: [5, 5],
      borderColor: "pink",
      backgroundColor: "pink",
      pointBackgroundColor: "",
      pointBorderColor: "",
      pointBorderWidth: 0,
      pointStyle: "",
      pointRadius: 3,
      data: [{ x: 1, y: 1.5 }, { x: 5, y: 3.5 }],
    },
  ],
  points: [
    {
      order: 0,
      label: "circle-point",
      borderDash: [],
      borderColor: "",
      backgroundColor: "",
      pointBackgroundColor: "blue",
      pointBorderColor: "",
      pointBorderWidth: 0,
      pointStyle: "",
      pointRadius: 3,
      data: [{ x: 1.5, y: 2.5 }, { x: 3, y: 4 }, { x: 4, y: 3.5 }],
    },
    {
      order: 0,
      label: "cross-point",
      borderDash: [],
      borderColor: "",
      backgroundColor: "",
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
  title: "",
  xAxisLabel: "This is my X axis label",
  yAxisLabel: "This is my Y axis label",
  lines: [
    // This also has a solid-line, but with completely different dimensions. If we don't properly
    // clone these objects, Chart.js might mutate the object above because the label is the same.
    {
      order: 0,
      label: "solid-line",
      borderDash: [],
      borderColor: "",
      backgroundColor: "",
      pointBackgroundColor: "",
      pointBorderColor: "",
      pointBorderWidth: 0,
      pointStyle: "",
      pointRadius: 3,
      data: [{ x: 100, y: 100 }, { x: 200, y: 100 }],
    },
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
        topic: "/plot_a",
        receiveTime: { sec: 1532375120, nsec: 317760607 },
        message: {
          versions: [example0, example1],
        },
      },
    ],
  },
};

function zoomOut(keyObj) {
  const canvasEl = document.querySelector("canvas");

  // Zoom is a continuous event, so we need to simulate wheel multiple times
  if (canvasEl) {
    if (keyObj) {
      document.dispatchEvent(new KeyboardEvent("keydown", keyObj));
    }

    for (let i = 0; i < 5; i++) {
      triggerWheel(canvasEl, 1);
    }
  }
}

function resetZoom(el, N = 5) {
  // It might be possible that the reset zoom button is not available
  // right away, so try a couple of times before throwing an error.
  const resetZoomBtn = el.querySelector("button");
  if (resetZoomBtn) {
    resetZoomBtn.click();
  } else if (N > 0) {
    setTimeout(() => resetZoom(el, N - 1), 200);
  } else {
    throw new Error("Cannot find reset zoom button");
  }
}

storiesOf("<TwoDimensionalPlot>", module)
  .addParameters({
    screenshot: {
      delay: 2500,
    },
  })
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
  .add("with tooltip", () => {
    return (
      <div style={{ width: 300, height: 300 }}>
        <PanelSetup
          fixture={fixture}
          onMount={() => {
            setTimeout(() => {
              const [canvas] = document.getElementsByTagName("canvas");
              const x = 105;
              const y = 190;
              canvas.dispatchEvent(new MouseEvent("mousemove", { pageX: x, pageY: y, clientX: x, clientY: y }));
            }, 100);
          }}>
          <TwoDimensionalPlot config={{ path: { value: "/plot_a.versions[0]" } }} />
        </PanelSetup>
      </div>
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
  })
  .add("zooms horizontally to show reset view button", () => (
    <PanelSetup
      fixture={fixture}
      onMount={() => {
        setTimeout(zoomOut, 200);
      }}>
      <TwoDimensionalPlot config={{ path: { value: "/plot_a.versions[0]" } }} />
    </PanelSetup>
  ))
  .add("zooms vertically to show reset view button", () => (
    <PanelSetup
      fixture={fixture}
      onMount={() => {
        setTimeout(() => zoomOut({ key: "v", code: "KeyV", keyCode: 86, ctrlKey: false, metaKey: false }), 200);
      }}>
      <TwoDimensionalPlot config={{ path: { value: "/plot_a.versions[0]" } }} />
    </PanelSetup>
  ))
  .add("zooms both axes simultaneously to show reset view button", () => (
    <PanelSetup
      fixture={fixture}
      onMount={() => {
        setTimeout(() => zoomOut({ key: "b", code: "KeyB", keyCode: 66, ctrlKey: false, metaKey: false }), 200);
      }}>
      <TwoDimensionalPlot config={{ path: { value: "/plot_a.versions[0]" } }} />
    </PanelSetup>
  ))
  .add("resets zoom", () => (
    <PanelSetup
      fixture={fixture}
      onMount={(el) => {
        setTimeout(zoomOut, 200);
        setTimeout(() => resetZoom(el), 400);
      }}>
      <TwoDimensionalPlot config={{ path: { value: "/plot_a.versions[0]" } }} />
    </PanelSetup>
  ));
