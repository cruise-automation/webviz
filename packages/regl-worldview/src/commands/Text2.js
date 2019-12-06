// @flow

import TinySDF from "@mapbox/tiny-sdf";
import React from "react";

import { withPose } from "../utils/commandUtils";
import Command, { type CommonCommandProps } from "./Command";
import type { TextMarker } from "./Text";

type Props = {
  ...CommonCommandProps,
  children: TextMarker[],
  // autoBackgroundColor?: boolean,
};

type FontAtlas = {|
  canvas: HTMLCanvasElement,
  charInfo: {
    [char: string]: {|
      x: number,
      y: number,
      width: number,
    |},
  },
|};

const FONT_SIZE = 30;

function buildAtlas(charSet: Set<string>): FontAtlas {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let canvasWidth = 0;
  const height = FONT_SIZE;
  const charInfo = {};

  let x = 0;
  let y = 0;
  for (const char of charSet) {
    const width = ctx.measureText(char).width;
    if (x + width > 1024) {
      x = 0;
      y += height;
      canvasWidth = Math.max(canvasWidth, 1024);
    } else {
      x += width;
      canvasWidth = Math.max(canvasWidth, x);
    }
    charInfo[char] = { x, y, width };
  }

  canvas.width = canvasWidth;
  canvas.height = y + height;
  console.log("canvas size", canvas.width, canvas.height);

  ctx.font = `${FONT_SIZE}px sans-serif`;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  // ctx.fillText(`Hi ${Date.now()}`, 0, FONT_SIZE);
  ctx.textBaseline = "top";
  console.log(canvas);

  for (const char of charSet) {
    const { x, y } = charInfo[char];
    ctx.fillText(char, x, y);
  }

  return { canvas, charInfo };
}

function text(regl: any) {
  const glyphSDFs = {};
  const tinySDF = new TinySDF(12, 2, 8, 0.25, "sans-serif", "normal");

  const drawText = regl(
    withPose({
      primitive: "triangle strip",
      vert: `
      precision mediump float;

      #WITH_POSE

      uniform mat4 projection, view;
      uniform float pointSize;

      attribute vec2 texCoord;
      attribute vec3 position;

      attribute vec2 srcOffset;
      attribute vec2 srcSize;
      attribute float charOffset;

      // attribute vec4 color;
      // varying vec4 fragColor;
      varying vec2 vTexCoord;
      void main () {
        vec3 pos = applyPose(position + vec3(charOffset, 0, 0));
        gl_Position = projection * view * vec4(pos, 1);
        vTexCoord = srcOffset + texCoord * srcSize;
        // vTexCoordMax = texCoord + srcOffset + vec2(charWidth, 10/*charHeight*/);
        // fragColor = color;
      }
      `,
      frag: `
      precision mediump float;
      uniform sampler2D atlas;
      varying vec2 vTexCoord;
      void main() {
        gl_FragColor = texture2D(atlas, vTexCoord);
        // gl_FragColor = vec4(1, 0, 0, 1);
      }
    `,
      count: 4,
      attributes: {
        position: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 0]],
        texCoord: [[0, 0], [0, 1], [1, 0], [1, 1]],
        srcOffset: (ctx, props) => ({ buffer: regl.buffer(props.srcOffsets), divisor: 1 }), //regl.prop("srcOffsets"),
        charOffset: (ctx, props) => ({ buffer: regl.buffer(props.charOffsets), divisor: 1 }), //regl.prop("charOffsets"),
        srcSize: (ctx, props) => ({ buffer: regl.buffer(props.srcSizes), divisor: 1 }), //regl.prop("charWidths"),
      },
      instances: regl.prop("instances"),
      uniforms: {
        atlas: regl.context("atlas"),
      },
    })
  );

  const atlasTex = regl.texture();

  return (props) => {
    const charSet = new Set();
    for (const { text } of props) {
      for (const char of text) {
        charSet.add(char);
      }
    }
    const { canvas, charInfo } = buildAtlas(charSet);
    regl({ context: { atlas: atlasTex(canvas) } })(() => {
      drawText(
        props.map((marker) => {
          const charOffsets = new Float32Array(marker.text.length);
          const srcSizes = new Float32Array(marker.text.length * 2);
          const srcOffsets = new Float32Array(marker.text.length * 2);
          let x = 0;
          let i = 0;
          for (const char of marker.text) {
            const info = charInfo[char];
            charOffsets[i] = x / FONT_SIZE;
            srcOffsets[2 * i + 0] = info.x / canvas.width;
            srcOffsets[2 * i + 1] = info.y / canvas.height;
            srcSizes[2 * i + 0] = info.width / canvas.width;
            srcSizes[2 * i + 1] = FONT_SIZE / canvas.height;
            x += info.width;
            ++i;
          }
          return {
            ...marker,
            instances: marker.text.length,
            srcOffsets,
            charOffsets,
            srcSizes,
          };
        })
      );
      // props.map((marker: TextMarker) => {
      //   // const buf = tinySDF.draw(marker.text);
      //   //TODO: redo atlas generation accounting for font widths
      //   const atlas = fontAtlas({
      //     chars,
      //   });
      // })
    });
  };
}

export default function Text(props: Props) {
  return <Command reglCommand={text} {...props} />;
}
