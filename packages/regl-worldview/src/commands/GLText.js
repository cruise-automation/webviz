// @flow

import TinySDF from "@mapbox/tiny-sdf";
import memoizeOne from "memoize-one";
import React, { useState } from "react";

import type { Color } from "../types";
import { defaultBlend, defaultDepth } from "../utils/commandUtils";
import Command, { type CommonCommandProps } from "./Command";
import { isColorDark, type TextMarker } from "./Text";

// The GLText command renders text from a Signed Distance Field texture.
// There are many external resources about SDFs and text rendering in WebGL, including:
// https://steamcdn-a.akamaihd.net/apps/valve/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf
// https://blog.mapbox.com/drawing-text-with-signed-distance-fields-in-mapbox-gl-b0933af6f817
// http://hack.chrons.me/opengl-text-rendering/
// https://stackoverflow.com/questions/25956272/better-quality-text-in-webgl
//
// Approach
// ========
// Characters from the font are measured using a <canvas> and the SDFs are drawn into a texture up front
// (and whenever new characters are being rendered). Then one instanced draw call is made with an instance
// per character which reads from the corresponding place in the texture atlas.
//
// Possible future improvements
// ============================
// - Add hitmap support.
// - Allow customization of font style, maybe highlight ranges.
// - Add a scaleInvariant option.
// - Consider a solid rectangular background instead of an outline. This is challenging because the
//   instances currently overlap, so there will be z-fighting, but might be possible using the stencil buffer and multiple draw calls.
// - Somehow support kerning and more advanced font metrics. However, the web font APIs may not
//   provide support for this. Some font info could be generated/stored offline, possibly including the atlas.
// - Explore multi-channel SDFs.

type TextMarkerProps = TextMarker & {
  billboard?: ?boolean,
  highlightedIndices?: Array<number>,
  highlightColor?: ?Color,
};
type Props = {
  ...CommonCommandProps,
  children: $ReadOnlyArray<TextMarkerProps>,
  autoBackgroundColor?: boolean,
};

type FontAtlas = {|
  textureData: Uint8Array,
  textureWidth: number,
  textureHeight: number,
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
const MAX_ATLAS_WIDTH = 512;
const SDF_RADIUS = 8;
const CUTOFF = 0.25;
const BUFFER = 10;

const BG_COLOR_LIGHT = Object.freeze({ r: 1, g: 1, b: 1, a: 1 });
const BG_COLOR_DARK = Object.freeze({ r: 0, g: 0, b: 0, a: 1 });

const memoizedCreateCanvas = memoizeOne((font) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  return ctx;
});

// Build a single font atlas: a texture containing all characters and position/size data for each character.
const createMemoizedBuildAtlas = () =>
  memoizeOne(
    (charSet: Set<string>): FontAtlas => {
      const tinySDF = new TinySDF(FONT_SIZE, BUFFER, SDF_RADIUS, CUTOFF, "sans-serif", "normal");
      const ctx = memoizedCreateCanvas(`${FONT_SIZE}px sans-serif`);

      let textureWidth = 0;
      const rowHeight = FONT_SIZE + 2 * BUFFER;
      const charInfo = {};

      // Measure and assign positions to all characters
      let x = 0;
      let y = 0;
      for (const char of charSet) {
        const width = ctx.measureText(char).width;
        const dx = Math.ceil(width) + 2 * BUFFER;
        if (x + dx > MAX_ATLAS_WIDTH) {
          x = 0;
          y += rowHeight;
        }
        charInfo[char] = { x, y, width };
        x += dx;
        textureWidth = Math.max(textureWidth, x);
      }

      const textureHeight = y + rowHeight;
      const textureData = new Uint8Array(textureWidth * textureHeight);

      // Use tiny-sdf to create SDF images for each character and copy them into a single texture
      for (const char of charSet) {
        const { x, y } = charInfo[char];
        const data = tinySDF.draw(char);
        for (let i = 0; i < tinySDF.size; i++) {
          for (let j = 0; j < tinySDF.size; j++) {
            // if this character is near the right edge, we don't actually copy the whole square of data
            if (x + j < textureWidth) {
              textureData[textureWidth * (y + i) + x + j] = data[i * tinySDF.size + j];
            }
          }
        }
      }

      return { textureData, textureWidth, textureHeight, charInfo };
    }
  );

const vert = `
  precision mediump float;

  uniform mat4 projection, view, billboardRotation;
  uniform float fontSize;
  uniform vec2 atlasSize;

  // per-vertex attributes
  attribute vec2 texCoord;
  attribute vec2 position;

  // per-instance (character) attributes
  attribute vec2 srcOffset;
  attribute float srcWidth;
  attribute vec2 destOffset;

  // per-marker attributes
  attribute vec3 scale;
  attribute float billboard;
  attribute vec2 alignmentOffset;
  attribute float enableBackground;
  attribute float enableHighlight;
  attribute vec4 foregroundColor;
  attribute vec4 backgroundColor;
  attribute vec4 highlightColor;
  attribute vec3 posePosition;
  attribute vec4 poseOrientation;

  varying vec2 vTexCoord;
  varying float vEnableBackground;
  varying vec4 vForegroundColor;
  varying vec4 vBackgroundColor;
  varying vec4 vHighlightColor;
  varying float vEnableHighlight;

  // rotate a 3d point v by a rotation quaternion q
  // like applyPose(), but we need to use a custom per-instance pose
  vec3 rotate(vec3 v, vec4 q) {
    vec3 temp = cross(q.xyz, v) + q.w * v;
    return v + (2.0 * cross(q.xyz, temp));
  }

  void main () {
    vec2 srcSize = vec2(srcWidth, fontSize);
    vec3 markerSpacePos = scale * vec3((destOffset + position * srcSize + alignmentOffset) / fontSize, 0);
    vec3 pos;
    if (billboard == 1.0) {
      pos = (billboardRotation * vec4(markerSpacePos, 1)).xyz + posePosition;
    } else {
      pos = rotate(markerSpacePos, poseOrientation) + posePosition;
    }
    gl_Position = projection * view * vec4(pos, 1);
    vTexCoord = (srcOffset + texCoord * srcSize) / atlasSize;
    vEnableBackground = enableBackground;
    vForegroundColor = foregroundColor;
    vBackgroundColor = backgroundColor;
    vHighlightColor = highlightColor;
    vEnableHighlight = enableHighlight;
  }
`;

const frag = `
  #extension GL_OES_standard_derivatives : enable
  precision mediump float;
  uniform mat4 projection;
  uniform sampler2D atlas;
  uniform float cutoff;

  varying vec2 vTexCoord;
  varying float vEnableBackground;
  varying vec4 vForegroundColor;
  varying vec4 vBackgroundColor;
  varying vec4 vHighlightColor;
  varying float vEnableHighlight;
  void main() {
    float dist = texture2D(atlas, vTexCoord).a;

    // fwidth(dist) is used to provide some anti-aliasing. However it's currently only used
    // when the solid background is enabled, because the alpha blending and
    // depth test don't work together nicely for partially-transparent pixels.
    float edgeStep = smoothstep(1.0 - cutoff - fwidth(dist), 1.0 - cutoff, dist);
    if (vEnableHighlight > 0.5) {
      gl_FragColor = mix(vHighlightColor, vec4(0, 0, 0, 1), edgeStep);
    } else if (vEnableBackground > 0.5) {
      float screenSize = fwidth(vTexCoord.x);
      gl_FragColor = mix(vBackgroundColor, vForegroundColor, edgeStep);
    } else {
      gl_FragColor = vForegroundColor;
      gl_FragColor.a *= step(1.0 - cutoff, dist);
    }

    if (gl_FragColor.a == 0.) {
      discard;
    }
  }
`;

function makeTextCommand() {
  // Keep the set of rendered characters around so we don't have to rebuild the font atlas too often.
  const charSet = new Set();
  const memoizedBuildAtlas = createMemoizedBuildAtlas();

  const command = (regl: any) => {
    const atlasTexture = regl.texture();
    const drawText = regl({
      depth: defaultDepth,
      blend: defaultBlend,
      primitive: "triangle strip",
      vert,
      frag,
      uniforms: {
        atlas: atlasTexture,
        atlasSize: () => [atlasTexture.width, atlasTexture.height],
        fontSize: FONT_SIZE,
        cutoff: CUTOFF,
      },
      instances: regl.prop("instances"),
      count: 4,
      attributes: {
        position: [[0, 0], [0, -1], [1, 0], [1, -1]],
        texCoord: [[0, 0], [0, 1], [1, 0], [1, 1]], // flipped
        srcOffset: (ctx, props) => ({ buffer: props.srcOffsets, divisor: 1 }),
        destOffset: (ctx, props) => ({ buffer: props.destOffsets, divisor: 1 }),
        srcWidth: (ctx, props) => ({ buffer: props.srcWidths, divisor: 1 }),
        scale: (ctx, props) => ({ buffer: props.scale, divisor: 1 }),
        alignmentOffset: (ctx, props) => ({ buffer: props.alignmentOffset, divisor: 1 }),
        billboard: (ctx, props) => ({ buffer: props.billboard, divisor: 1 }),
        foregroundColor: (ctx, props) => ({ buffer: props.foregroundColor, divisor: 1 }),
        backgroundColor: (ctx, props) => ({ buffer: props.backgroundColor, divisor: 1 }),
        highlightColor: (ctx, props) => ({ buffer: props.highlightColor, divisor: 1 }),
        enableBackground: (ctx, props) => ({ buffer: props.enableBackground, divisor: 1 }),
        enableHighlight: (ctx, props) => ({ buffer: props.enableHighlight, divisor: 1 }),
        posePosition: (ctx, props) => ({ buffer: props.posePosition, divisor: 1 }),
        poseOrientation: (ctx, props) => ({ buffer: props.poseOrientation, divisor: 1 }),
      },
    });

    return (props: $ReadOnlyArray<TextMarkerProps>) => {
      let estimatedInstances = 0;
      const prevNumChars = charSet.size;
      for (const { text } of props) {
        if (typeof text !== "string") {
          throw new Error(`Expected typeof 'text' to be a string. But got type '${typeof text}' instead.`);
        }

        for (const char of text) {
          ++estimatedInstances;
          charSet.add(char);
        }
      }
      const charsChanged = charSet.size !== prevNumChars;

      const { textureData, textureWidth, textureHeight, charInfo } = memoizedBuildAtlas(
        // only use a new set if the characters changed, since memoizeOne uses shallow equality
        charsChanged ? new Set(charSet) : charSet
      );

      // re-upload texture only if characters were added
      if (charsChanged) {
        atlasTexture({
          data: textureData,
          width: textureWidth,
          height: textureHeight,
          format: "alpha",
          wrap: "clamp",
          mag: "linear",
          min: "linear",
        });
      }

      const destOffsets = new Float32Array(estimatedInstances * 2);
      const srcWidths = new Float32Array(estimatedInstances);
      const srcOffsets = new Float32Array(estimatedInstances * 2);

      // These don't vary across characters within a marker, but the divisor can't be dynamic so we have to duplicate the data for each character.
      const alignmentOffset = new Float32Array(estimatedInstances * 2);
      const scale = new Float32Array(estimatedInstances * 3);
      const foregroundColor = new Float32Array(estimatedInstances * 4);
      const backgroundColor = new Float32Array(estimatedInstances * 4);
      const highlightColor = new Float32Array(estimatedInstances * 4);
      const enableBackground = new Float32Array(estimatedInstances);
      const billboard = new Float32Array(estimatedInstances);
      const posePosition = new Float32Array(estimatedInstances * 3);
      const poseOrientation = new Float32Array(estimatedInstances * 4);
      const enableHighlight = new Float32Array(estimatedInstances);

      let totalInstances = 0;
      for (const marker of props) {
        let totalWidth = 0;
        let x = 0;
        let y = 0;
        let markerInstances = 0;

        const fgColor = marker.colors?.[0] || marker.color || BG_COLOR_LIGHT;
        const outline = marker.colors?.[1] != null || command.autoBackgroundColor;
        const bgColor =
          marker.colors?.[1] || (command.autoBackgroundColor && isColorDark(fgColor) ? BG_COLOR_LIGHT : BG_COLOR_DARK);
        const hlColor = marker?.highlightColor || { r: 1, b: 0, g: 1, a: 1 };

        for (let i = 0; i < marker.text.length; i++) {
          const char = marker.text[i];
          if (char === "\n") {
            x = 0;
            y = FONT_SIZE;
            continue;
          }
          const info = charInfo[char];
          const index = totalInstances + markerInstances;

          // Calculate per-character attributes
          destOffsets[2 * index + 0] = x;
          destOffsets[2 * index + 1] = -y;
          srcOffsets[2 * index + 0] = info.x + BUFFER;
          srcOffsets[2 * index + 1] = info.y + BUFFER;
          srcWidths[index] = info.width;

          x += info.width;
          totalWidth = Math.max(totalWidth, x);

          // Copy per-marker attributes. These are duplicated per character so that we can draw
          // all characters from all markers in a single draw call.

          billboard[index] = marker.billboard ?? true ? 1 : 0;

          scale[3 * index + 0] = marker.scale.x;
          scale[3 * index + 1] = marker.scale.y;
          scale[3 * index + 2] = marker.scale.z;

          posePosition[3 * index + 0] = marker.pose.position.x;
          posePosition[3 * index + 1] = marker.pose.position.y;
          posePosition[3 * index + 2] = marker.pose.position.z;

          poseOrientation[4 * index + 0] = marker.pose.orientation.x;
          poseOrientation[4 * index + 1] = marker.pose.orientation.y;
          poseOrientation[4 * index + 2] = marker.pose.orientation.z;
          poseOrientation[4 * index + 3] = marker.pose.orientation.w;

          foregroundColor[4 * index + 0] = fgColor.r;
          foregroundColor[4 * index + 1] = fgColor.g;
          foregroundColor[4 * index + 2] = fgColor.b;
          foregroundColor[4 * index + 3] = fgColor.a;

          backgroundColor[4 * index + 0] = bgColor.r;
          backgroundColor[4 * index + 1] = bgColor.g;
          backgroundColor[4 * index + 2] = bgColor.b;
          backgroundColor[4 * index + 3] = bgColor.a;

          highlightColor[4 * index + 0] = hlColor.r;
          highlightColor[4 * index + 1] = hlColor.g;
          highlightColor[4 * index + 2] = hlColor.b;
          highlightColor[4 * index + 3] = hlColor.a;

          enableHighlight[index] = marker.highlightedIndices && marker.highlightedIndices.includes(i) ? 1 : 0;

          enableBackground[index] = outline ? 1 : 0;

          ++markerInstances;
        }

        const totalHeight = y + FONT_SIZE;
        for (let i = 0; i < markerInstances; i++) {
          alignmentOffset[2 * (totalInstances + i) + 0] = -totalWidth / 2;
          alignmentOffset[2 * (totalInstances + i) + 1] = totalHeight / 2;
        }

        totalInstances += markerInstances;
      }

      drawText({
        instances: totalInstances,

        // per-character
        srcOffsets,
        destOffsets,
        srcWidths,

        // per-marker
        alignmentOffset,
        billboard,
        enableBackground,
        enableHighlight,
        foregroundColor,
        backgroundColor,
        highlightColor,
        poseOrientation,
        posePosition,
        scale,
      });
    };
  };
  command.autoBackgroundColor = false;
  return command;
}

export default function GLText(props: Props) {
  const [command] = useState(() => makeTextCommand());
  // HACK: Worldview doesn't provide an easy way to pass a command-level prop into the regl commands,
  // so just attach it to the command object for now.
  command.autoBackgroundColor = props.autoBackgroundColor;
  return <Command reglCommand={command} {...props} />;
}
