// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { range } from "lodash";
import * as React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import ImageCanvas from "webviz-core/src/panels/ImageView/ImageCanvas";

const cameraInfo = {
  width: 400,
  height: 300,
  distortion_model: "plumb_bob",
  D: [-0.437793, 0.183639, -0.003738, -0.001327, 0],
  K: [2339.067676, 0, 903.297282, 0, 2323.624869, 566.425547, 0, 0, 1],
  R: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  P: [2170.145996, 0, 899.453592, 0, 0, 2275.496338, 568.217702, 0, 0, 0, 1, 0],
  binning_x: 1,
  binning_y: 1,
  roi: {
    x_offset: 0,
    y_offset: 0,
    height: 0,
    width: 0,
    do_rectify: false,
  },
};

const imageData = (() => {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 400, 300);
  gradient.addColorStop(0, "cyan");
  gradient.addColorStop(1, "green");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 300);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "red";
  ctx.strokeRect(0, 0, 400, 300);
  return canvas.toDataURL().replace(/^data:image\/png;base64,/, "");
})();

function marker(type: number, props: {}) {
  return {
    op: "message",
    topic: "/foo",
    receiveTime: { sec: 0, nsec: 0 },
    datatype: "visualization_msgs/ImageMarker",
    message: { ...props, type },
  };
}

const imageMessage = {
  op: "message",
  datatype: "dummy",
  topic: "/foo",
  receiveTime: { sec: 0, nsec: 0 },
  message: { data: imageData },
};

function makeLines(xOffset: number) {
  return [
    { x: xOffset + 30, y: 50 },
    { x: xOffset + 32, y: 58 },
    { x: xOffset + 45, y: 47 },
    { x: xOffset + 60, y: 50 },
    { x: xOffset + 65, y: 40 },
    { x: xOffset + 40, y: 45 },
  ];
}

const markers = [
  // circles
  marker(0, {
    position: { x: 40, y: 20 },
    scale: 5,
    thickness: 2,
    outline_color: { r: 255, g: 127, b: 0 },
  }),
  marker(0, {
    position: { x: 55, y: 20 },
    scale: 5,
    thickness: -1,
    outline_color: { r: 255, g: 0, b: 255 },
  }),
  marker(1, {
    thickness: 1,
    points: [{ x: 40, y: 20 }, { x: 40, y: 30 }, { x: 30, y: 30 }],
    outline_color: { r: 0, g: 0, b: 255 },
  }),
  // line strip
  marker(1, {
    thickness: 2,
    points: makeLines(0),
    outline_color: { r: 255, g: 255, b: 255 },
  }),
  // line list
  marker(2, {
    thickness: 2,
    points: makeLines(50),
    outline_color: { r: 127, g: 127, b: 255 },
  }),
  // polygon
  marker(3, {
    thickness: 2,
    points: makeLines(100),
    outline_color: { r: 127, g: 127, b: 255 },
  }),
  marker(3, {
    thickness: -10,
    points: makeLines(150),
    outline_color: { r: 127, g: 255, b: 127 },
  }),
  marker(3, {
    thickness: -10,
    points: [{ x: 100, y: 20 }, { x: 120, y: 20 }, { x: 120, y: 30 }, { x: 100, y: 30 }],
    outline_color: { r: 127, g: 255, b: 127 },
  }),
  marker(3, {
    thickness: 1,
    points: [{ x: 100, y: 20 }, { x: 120, y: 20 }, { x: 120, y: 30 }, { x: 100, y: 30 }],
    outline_color: { r: 0, g: 0, b: 0 },
  }),
  marker(3, {
    thickness: -10,
    points: [{ x: 150, y: 20 }, { x: 170, y: 20 }, { x: 170, y: 30 }, { x: 150, y: 30 }],
    outline_color: { r: 127, g: 255, b: 127 },
  }),
  // points
  marker(4, {
    points: range(50).map((i) => ({ x: 20 + 5 * i, y: 130 + 10 * Math.sin(i / 2) })),
    fill_color: { r: 255, g: 0, b: 0 },
  }),
  marker(4, {
    scale: 1,
    points: range(50).map((i) => ({ x: 20 + 5 * i, y: 150 + 10 * Math.sin(i / 2) })),
    fill_color: { r: 127, g: 255, b: 0 },
  }),
  marker(4, {
    scale: 2,
    points: range(50).map((i) => ({ x: 20 + 5 * i, y: 170 + 10 * Math.sin(i / 2) })),
    fill_color: { r: 0, g: 0, b: 255 },
  }),
  marker(4, {
    scale: 2,
    points: range(50).map((i) => ({ x: 20 + 5 * i, y: 190 + 10 * Math.sin(i / 2) })),
    outline_colors: range(50).map((i) => ({
      r: Math.round(255 * Math.min(1, (2 * i) / 50)),
      g: Math.round(255 * Math.min(1, (2 * (i - 15)) / 50)),
      b: Math.round(255 * Math.min(1, (2 * (i - 30)) / 50)),
    })),
    fill_color: { r: 0, g: 0, b: 255 },
  }),
  // text
  marker(5, {
    text: { data: "Hello!" },
    position: { x: 30, y: 100 },
    scale: 1,
    outline_color: { r: 255, g: 127, b: 127 },
  }),
  marker(5, {
    text: { data: "Hello!" },
    position: { x: 130, y: 100 },
    scale: 1,
    outline_color: { r: 255, g: 127, b: 127 },
    filled: true,
    fill_color: { r: 50, g: 50, b: 50 },
  }),
  marker(0, {
    position: { x: 30, y: 100 },
    scale: 2,
    thickness: -1,
    outline_color: { r: 255, g: 255, b: 0 },
  }),
  marker(0, {
    position: { x: 130, y: 100 },
    scale: 2,
    thickness: -1,
    outline_color: { r: 255, g: 255, b: 0 },
  }),
];

const topics = ["/camera_front_medium/image_rect_color_compressed", "/storybook_image"];

storiesOf("<ImageCanvas>", module)
  .addDecorator(withScreenshot())
  .add("markers", () => (
    <div>
      <h2>original markers</h2>
      <ImageCanvas
        transformMarkers={false}
        saveConfig={() => {}}
        topic={topics[0]}
        image={imageMessage}
        cameraInfo={cameraInfo}
        markers={markers}
      />
      <br />
      <h2>transformed markers</h2>
      <ImageCanvas
        transformMarkers
        saveConfig={() => {}}
        topic={topics[1]}
        image={imageMessage}
        cameraInfo={cameraInfo}
        markers={markers}
      />
    </div>
  ));
