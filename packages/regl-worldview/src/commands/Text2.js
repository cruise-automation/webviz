// @flow

import TinySDF from "@mapbox/tiny-sdf";
import { isEqual } from "lodash";
import memoizeOne from "memoize-one";
import React, { useState } from "react";

import { withPose, toRGBA, defaultBlend, defaultDepth } from "../utils/commandUtils";
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

// Font size used in rendering the atlas. This is independent of the `scale` of the rendered text.
const FONT_SIZE = 40;
const BUFFER = 10;
const BASELINE_ADJUST = FONT_SIZE * 0.2; // hack to make the baseline align near y=0
const MAX_ATLAS_WIDTH = 512;
const SDF_RADIUS = 8;
const CUTOFF = 0.25;
const OUTLINE_CUTOFF = 0.5;
const DEFAULT_COLOR = Object.freeze({ r: 0.5, g: 0.5, b: 0.5, a: 1 });
const DEFAULT_OUTLINE_COLOR = Object.freeze({ r: 1, g: 1, b: 1, a: 1 });
let IMG_EL = null;

const memoizedBuildAtlas = memoizeOne((charSet: Set<string>): FontAtlas => {
  const tinySDF = new TinySDF(FONT_SIZE, BUFFER, SDF_RADIUS, CUTOFF, "sans-serif", "normal");

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
    const { x, y } = charInfo[char];
    const data = tinySDF.draw(char);
    const imageData = ctx.createImageData(tinySDF.size, tinySDF.size);
    for (let i = 0; i < data.length; i++) {
      imageData.data[4 * i + 0] = 255;
      imageData.data[4 * i + 1] = 255;
      imageData.data[4 * i + 2] = 255;
      imageData.data[4 * i + 3] = data[i];
    }
    ctx.putImageData(imageData, x, y);
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
}, isEqual);

function makeTextCommand() {
  // Keep the set of rendered characters around so we don't have to rebuild the font atlas too often.
  const charSet = new Set();

  return (regl: any) => {
    const atlasTexture = regl.texture();

    const drawText = regl(
      withPose({
        // depth: { enable: true, mask: true },
        // depth: { enable: false, mask: true },
        depth: defaultDepth,
        blend: defaultBlend,
        primitive: "triangle strip",
        // primitive: "line strip",
        vert: `
      precision mediump float;

      #WITH_POSE

      uniform mat4 projection, view;
      uniform float pointSize;
      uniform float fontSize;
      uniform float srcHeight;
      uniform vec2 atlasSize;

      attribute vec2 texCoord;
      attribute vec2 position;

      attribute vec2 srcOffset;
      attribute float srcWidth;
      attribute vec2 destOffset;

      // attribute vec4 color;
      // varying vec4 fragColor;
      varying vec2 vTexCoord;
      void main () {
        vec2 srcSize = vec2(srcWidth, srcHeight);
        vec3 pos = applyPose(vec3((destOffset + position * srcSize) / fontSize, 0));
        gl_Position = projection * view * vec4(pos, 1);
        vTexCoord = (srcOffset + texCoord * srcSize) / atlasSize;
      }
      `,
        frag: `
      #extension GL_OES_standard_derivatives : enable
      precision mediump float;
      uniform sampler2D atlas;
      uniform float outlineCutoff;
      uniform float cutoff;
      uniform bool enableOutline;
      uniform vec4 foregroundColor;
      uniform vec4 outlineColor;
      varying vec2 vTexCoord;
      void main() {
        float dist = texture2D(atlas, vTexCoord).a;

        // fwidth(dist) is used to provide some anti-aliasing. However it's currently only used
        // between outline and text, not on the outer border, because the alpha blending and
        // depth test don't look good for partially-transparent pixels.
        if (enableOutline) {
          float edgeStep = smoothstep(1.0 - cutoff - fwidth(dist), 1.0 - cutoff, dist);
          gl_FragColor = mix(outlineColor, foregroundColor, edgeStep);
          gl_FragColor.a *= step(1.0 - outlineCutoff, dist);
        } else {
          gl_FragColor = foregroundColor;
          gl_FragColor.a *= step(1.0 - cutoff, dist);
        }

        if (gl_FragColor.a == 0.) {
          discard;
        }
      }
    `,
        count: 4,
        attributes: {
          position: [[0, 0], [0, 1], [1, 0], [1, 1]],
          texCoord: [[0, 1], [0, 0], [1, 1], [1, 0]], // flipped
          srcOffset: (ctx, props) => ({ buffer: regl.buffer(props.srcOffsets), divisor: 1 }),
          destOffset: (ctx, props) => ({ buffer: regl.buffer(props.destOffsets), divisor: 1 }),
          srcWidth: (ctx, props) => ({ buffer: regl.buffer(props.srcWidths), divisor: 1 }),
        },
        instances: regl.prop("instances"),
        uniforms: {
          atlas: atlasTexture,
          atlasSize: () => [atlasTexture.width, atlasTexture.height],
          fontSize: FONT_SIZE,
          cutoff: CUTOFF,
          outlineCutoff: OUTLINE_CUTOFF,
          srcHeight: FONT_SIZE + 2 * BUFFER,

          foregroundColor: (ctx, props) => toRGBA(props.color || props.colors?.[0] || DEFAULT_COLOR),
          outlineColor: (ctx, props) => toRGBA(props.colors?.[1] || DEFAULT_OUTLINE_COLOR),
          enableOutline: (ctx, props) => props.colors?.[1] != null,
        },
      })
    );

    return (props: TextMarker[]) => {
      const prevNumChars = charSet.size;
      for (const { text } of props) {
        for (const char of text) {
          charSet.add(char);
        }
      }
      const { canvas, charInfo } = memoizedBuildAtlas(charSet);
      if (charSet.size !== prevNumChars) {
        atlasTexture({
          data: canvas,
          // flipY: true,
          wrap: "clamp",
          mag: "linear",
          min: "linear",
        });
      }
      drawText(
        props.map((marker) => {
          const destOffsets = new Float32Array(marker.text.length * 2);
          const srcWidths = new Float32Array(marker.text.length);
          const srcOffsets = new Float32Array(marker.text.length * 2);
          let x = 0;
          let y = 0;
          let instances = 0;
          for (const char of marker.text) {
            if (char === "\n") {
              x = 0;
              y += FONT_SIZE;
              continue;
            }
            const info = charInfo[char];
            destOffsets[2 * instances + 0] = x - BUFFER;
            destOffsets[2 * instances + 1] = y - BUFFER - BASELINE_ADJUST;
            srcOffsets[2 * instances + 0] = info.x;
            srcOffsets[2 * instances + 1] = info.y;
            srcWidths[instances] = info.width + 2 * BUFFER;
            x += info.width;
            ++instances;
          }
          return {
            pose: marker.pose,
            color: marker.color,
            colors: marker.colors,
            instances,
            srcOffsets,
            destOffsets,
            srcWidths,
          };
        })
      );
    };
  };
}

export default function Text(props: Props) {
  const [command] = useState(() => makeTextCommand());
  return <Command reglCommand={command} {...props} />;
}
