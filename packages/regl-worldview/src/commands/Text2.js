// @flow

import TinySDF from "@mapbox/tiny-sdf";
import React, { useState, useContext } from "react";

import { withPose, toRGBA, defaultBlend, defaultDepth } from "../utils/commandUtils";
import WorldviewReactContext from "../WorldviewReactContext";
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

const FONT_SIZE = 40;
const BUFFER = 10;
const MAX_ATLAS_WIDTH = 500;
const RADIUS = 8;
const CUTOFF = 0.25;
const DEFAULT_COLOR = Object.freeze({ r: 0.5, g: 0.5, b: 0.5, a: 1 });
const DEFAULT_OUTLINE_COLOR = Object.freeze({ r: 1, g: 1, b: 1, a: 1 });
let IMG_EL = null;

function buildAtlas(charSet: Set<string>): FontAtlas {
  const glyphSDFs = {};
  const tinySDF = new TinySDF(FONT_SIZE, BUFFER, RADIUS, CUTOFF, "sans-serif", "normal");

  const fontStyle = `${FONT_SIZE}px sans-serif`;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = fontStyle;

  let canvasWidth = 0;
  const rowHeight = FONT_SIZE + 2 * BUFFER;
  const charInfo = {};

  let x = 0;
  let y = 0;
  for (const char of charSet) {
    const width = ctx.measureText(char).width;
    if (x + width + 2 * BUFFER > MAX_ATLAS_WIDTH) {
      x = 0;
      y += rowHeight;
    }
    charInfo[char] = { x, y, width };
    x += width + 2 * BUFFER;
    // x += FONT_SIZE + 2 * BUFFER;
    canvasWidth = Math.max(canvasWidth, x);
  }

  canvas.width = canvasWidth;
  canvas.height = y + rowHeight;

  ctx.fillStyle = "white";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.textBaseline = "top";
  ctx.font = fontStyle;

  for (const char of charSet) {
    const { x, y, width } = charInfo[char];
    const data = tinySDF.draw(char);
    const imageData = ctx.createImageData(tinySDF.size, tinySDF.size);
    for (let i = 0; i < data.length; i++) {
      imageData.data[4 * i + 0] = 255;
      imageData.data[4 * i + 1] = 255;
      imageData.data[4 * i + 2] = 255;
      imageData.data[4 * i + 3] = data[i];
    }
    // ctx.fillText(char, x, y);
    ctx.putImageData(imageData, x, y);
    ctx.strokeStyle = "red";
    ctx.strokeRect(x, y, imageData.width, imageData.height);
  }
  if (!IMG_EL) {
    document.querySelectorAll("#foobar_img").forEach((el) => el.remove());
    IMG_EL = document.createElement("img");
    IMG_EL.id = "foobar_img";
    IMG_EL.style.position = "absolute";
    IMG_EL.style.top = 0;
    IMG_EL.style.left = 0;
    document.body.appendChild(IMG_EL);
  }
  canvas.toBlob((blob) => (IMG_EL.src = URL.createObjectURL(blob)));

  return { canvas, charInfo };
}

function text(regl: any) {
  const drawText = regl(
    withPose({
      // depth: { enable: true, mask: true },
      // depth: { enable: false, mask: true },
      depth: defaultDepth,
      blend: defaultBlend,
      primitive: "triangle strip",
      // primitive: "line strip",
      vert: `
      precision highp float;

      #WITH_POSE

      uniform mat4 projection, view;
      uniform float pointSize;
      uniform float fontSize;
      uniform float buffer;
      uniform vec2 atlasSize;

      attribute vec2 texCoord;
      attribute vec3 position;

      attribute vec2 srcOffset;
      attribute vec2 srcSize;
      attribute vec2 destOffset;

      // attribute vec4 color;
      // varying vec4 fragColor;
      varying vec2 vTexCoord;
      void main () {
        vec3 pos = applyPose(position * vec3(srcSize.x/fontSize,1.0+2.0*buffer/fontSize,1) + vec3(destOffset/fontSize, 0));
        gl_Position = projection * view * vec4(pos, 1);
        vTexCoord = (srcOffset + texCoord * srcSize)/atlasSize;
        // vTexCoordMax = texCoord + srcOffset + vec2(charWidth, 10/*charHeight*/);
        // fragColor = color;
      }
      `,
      frag: `
      precision highp float;
      uniform sampler2D atlas;
      uniform float outlineThreshold;
      uniform float edgeThreshold;
      uniform float softness;
      uniform vec4 foregroundColor;
      uniform vec4 outlineColor;
      varying vec2 vTexCoord;
      uniform bool debug;
      void main() {
        float dist = texture2D(atlas, vTexCoord).a;
        // gl_FragColor = vec4(1, 1, 1, smoothstep(buffer - gamma, buffer + gamma,dist));
        // float a = smoothstep(buffer - gamma, buffer + gamma,dist);
        // float a = smoothstep(buffer - gamma, buffer + gamma,dist);

        float colorFactor = 1.0;
        // if (dist >= outlineThreshold && dist < edgeThreshold) {
        //   colorFactor = smoothstep(outlineThreshold - softness, outlineThreshold + softness, dist);
        // } else if (dist >= edgeThreshold) {
        //   colorFactor = smoothstep(edgeThreshold - softness, edgeThreshold + softness, dist);
        // }
        colorFactor = smoothstep(edgeThreshold - softness, edgeThreshold + softness, dist);
        // float a = step(1.0 - cutoff, dist);
        // float a2 = step(1.0 - cutoff2, dist);
        gl_FragColor.rgb = mix(outlineColor, foregroundColor, colorFactor).rgb;
        gl_FragColor.a = smoothstep(outlineThreshold - softness, outlineThreshold + softness, dist);
        gl_FragColor = dist < outlineThreshold ? vec4(1,1,0,0) : dist < edgeThreshold ? vec4(1,0,0,1) : vec4(0,1,1,1);

        float outlineStep = smoothstep(outlineThreshold - softness, outlineThreshold + softness, dist);
        float edgeStep = smoothstep(edgeThreshold - softness, edgeThreshold + softness, dist);
        // float colorFactor2 = smoothstep(2.0 - softness, 2.0, outlineStep + edgeStep);
        gl_FragColor.rgb = mix(outlineColor, foregroundColor, edgeStep).rgb;
        gl_FragColor.a = smoothstep(outlineThreshold - softness, outlineThreshold + softness, dist);
        if (debug) {
          gl_FragColor = texture2D(atlas, vTexCoord);
        }
        // gl_FragColor = vec4(1, 1, 1, a);
        if (gl_FragColor.a == 0.) {
          discard;
        }
        // gl_FragColor = texture2D(atlas, vTexCoord);
        // gl_FragColor = vec4(1, 0, 0, 1);
      }
    `,
      count: 4,
      attributes: {
        position: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 0]],
        texCoord: [[0, 1], [0, 0], [1, 1], [1, 0]], // flipped
        srcOffset: (ctx, props) => ({ buffer: regl.buffer(props.srcOffsets), divisor: 1 }), //regl.prop("srcOffsets"),
        destOffset: (ctx, props) => ({ buffer: regl.buffer(props.destOffsets), divisor: 1 }), //regl.prop("destOffsets"),
        srcSize: (ctx, props) => ({ buffer: regl.buffer(props.srcSizes), divisor: 1 }), //regl.prop("charWidths"),
      },
      instances: regl.prop("instances"),
      uniforms: {
        atlas: regl.context("atlas"),
        atlasSize: regl.context("atlasSize"),
        fontSize: regl.context("fontSize"),
        buffer: regl.context("buffer"),

        outlineThreshold: regl.prop("outlineThreshold"),
        edgeThreshold: regl.prop("edgeThreshold"),
        debug: regl.prop("debug"),
        softness: 0.1,

        foregroundColor: (ctx, props) => toRGBA(props.color || props.colors?.[0] || DEFAULT_COLOR),
        outlineColor: (ctx, props) => toRGBA(props.colors?.[1] || DEFAULT_OUTLINE_COLOR),
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
    regl({
      context: {
        atlas: atlasTex({
          data: canvas,
          // flipY: true,
          wrap: "clamp",
          mag: "linear",
          min: "linear",
        }),
        atlasSize: [canvas.width, canvas.height],
        fontSize: FONT_SIZE,
        buffer: BUFFER,
        cutoff: CUTOFF,
      },
    })(() => {
      drawText(
        props.map((marker) => {
          const destOffsets = new Float32Array(marker.text.length * 2);
          const srcSizes = new Float32Array(marker.text.length * 2);
          const srcOffsets = new Float32Array(marker.text.length * 2);
          let x = 0;
          let y = 0;
          let i = 0;
          for (const char of marker.text) {
            if (char === "\n") {
              x = 0;
              y += FONT_SIZE;
              continue;
            }
            const info = charInfo[char];
            destOffsets[2 * i + 0] = x - BUFFER;
            destOffsets[2 * i + 1] = y - BUFFER * 1.5 /*hack for baseline*/;
            srcOffsets[2 * i + 0] = info.x;
            srcOffsets[2 * i + 1] = info.y;
            srcSizes[2 * i + 0] = info.width + 2 * BUFFER;
            srcSizes[2 * i + 1] = FONT_SIZE + 2 * BUFFER;
            x += info.width;
            ++i;
          }
          return {
            ...marker,
            instances: i,
            srcOffsets,
            destOffsets,
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
  const [outlineThreshold, setOutlineThreshold] = useState(0.4);
  const [edgeThreshold, setEdgeThreshold] = useState(0.75);
  const [debug, setDebug] = useState(false);
  const ctx = useContext(WorldviewReactContext);
  return (
    <>
      <Command reglCommand={text} {...props}>
        {props.children.map((child) => ({ ...child, outlineThreshold, edgeThreshold, debug }))}
      </Command>
      <input
        style={{ position: "absolute", top: 140, left: 0 }}
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={outlineThreshold}
        onChange={(e) => {
          setOutlineThreshold(+e.target.value);
          ctx.onDirty();
        }}
      />
      <input
        style={{ position: "absolute", top: 160, left: 0 }}
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={edgeThreshold}
        onChange={(e) => {
          setEdgeThreshold(+e.target.value);
          ctx.onDirty();
        }}
      />
      <input
        style={{ position: "absolute", top: 180, left: 0 }}
        type="checkbox"
        defaultChecked={debug}
        onClick={(e) => {
          setDebug(e.target.checked);
          ctx.onDirty();
        }}
      />
    </>
  );
}
