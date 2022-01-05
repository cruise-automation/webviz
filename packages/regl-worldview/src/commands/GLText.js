// @flow

import TinySDF from "@mapbox/tiny-sdf";
import difference from "lodash/difference";
import memoizeOne from "memoize-one";
import React, { useState } from "react";

import type { Color } from "../types";
import { defaultBlend, defaultDepth, toColor } from "../utils/commandUtils";
import { createInstancedGetChildrenForHitmap } from "../utils/getChildrenForHitmapDefaults";
import Command, { type CommonCommandProps } from "./Command";
import { isColorDark, type TextMarker } from "./Text";

// HACK: TinySDF doesn't agree with workers. Until support is added, hack this to make it work.
// TODO(steel): Upstream the fix in memoizedCreateCanvas.
if (!self.document) {
  // $FlowFixMe: Flow doesn't know about OffscreenCanvas.
  self.document = { createElement: () => new OffscreenCanvas(0, 0) };
}

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
// - Allow customization of font style, maybe highlight ranges.
// - Consider a solid rectangular background instead of an outline. This is challenging because the
//   instances currently overlap, so there will be z-fighting, but might be possible using the stencil buffer and multiple draw calls.
// - Somehow support kerning and more advanced font metrics. However, the web font APIs may not
//   provide support for this. Some font info could be generated/stored offline, possibly including the atlas.
// - Explore multi-channel SDFs.

type CharacterLocations = {
  [char: string]: {|
    x: number,
    y: number,
    width: number,
    height: number,
    yOffset: number,
  |},
};

export type GeneratedAtlas = {|
  charInfo: CharacterLocations,
  textureWidth: number,
  textureHeight: number,
  textureData: Uint8Array,
|};

export type AtlasConfig = {|
  fontSize: number,
  fontFamily: string,
  charSet: Set<string>,
|};

type TextMarkerProps = TextMarker & {
  billboard?: ?boolean,
  highlightedIndices?: Array<number>,
  highlightColor?: ?Color,
};

type GLTextProps = {|
  autoBackgroundColor?: boolean,
  scaleInvariantFontSize?: number,
  resolution?: number,
  alphabet?: string[],
  textAtlas?: GeneratedAtlas,
  borderRadius?: number,
  paddingScale?: [number, number],
|};

type Props = {
  // $FlowFixMe: flow does not know how to handle the indexed property in CommonCommandProps
  ...CommonCommandProps,
  ...GLTextProps,
  children: $ReadOnlyArray<TextMarkerProps>,
};

// Font size used in rendering the atlas. This is independent of the `scale` of the rendered text.
const MIN_RESOLUTION = 40;
const DEFAULT_RESOLUTION = 160;
const SDF_RADIUS = 8;
const CUTOFF = 0.25;
const BUFFER = 10;

const BG_COLOR_LIGHT = Object.freeze({ r: 1, g: 1, b: 1, a: 1 });
const BG_COLOR_DARK = Object.freeze({ r: 0, g: 0, b: 0, a: 1 });
const BG_COLOR_TRANSPARENT = Object.freeze({ r: 0, b: 0, g: 0, a: 0 });

const hashMarkerPosition = (marker: TextMarker): string => {
  const { x, y, z } = marker.pose.position;
  // The hash is a simple string with all three components
  return `x${x}y${y}z${z}`;
};

const getMarkerYOffset = (offsets: Map<string, number>, marker: TextMarker) => {
  return offsets.get(hashMarkerPosition(marker)) || 0;
};

const setMarkerYOffset = (offsets: Map<string, number>, marker: TextMarker, yOffset: number) => {
  offsets.set(hashMarkerPosition(marker), yOffset);
};

// Build a single font atlas: a texture containing all characters from all atlasConfigs
export const generateAtlas = (atlasConfigs: AtlasConfig[], maxAtlasWidth: number): GeneratedAtlas => {
  // Render and measure each character using tinySDF
  const sdfDataByChar = {};
  atlasConfigs.forEach((atlasConfig) => {
    const { charSet, fontSize, fontFamily } = atlasConfig;
    const tinySDF = new TinySDF({
      fontSize, // Font size in pixels
      fontFamily: fontFamily || "sans-serif", // CSS font-family
      fontWeight: "normal", // CSS font-weight
      fontStyle: "normal", // CSS font-style
      buffer: BUFFER, // Whitespace buffer around a glyph in pixels
      radius: SDF_RADIUS, // How many pixels around the glyph shape to use for encoding distance
      cutoff: CUTOFF, // How much of the radius (relative) is used for the inside part of the glyph
    });
    charSet.forEach((char) => (sdfDataByChar[char] = tinySDF.draw(char)));
  });

  // Compute positions for every character in the atlas
  const charInfo = {};

  let x = 0;
  let y = 0;
  let maxHeight = 0;
  let textureWidth = 0;
  atlasConfigs.forEach(({ charSet, fontSize }) => {
    for (const char of charSet) {
      const { height, width, glyphAdvance, glyphTop, glyphHeight } = sdfDataByChar[char];
      const lineHeight = height;

      const dx = Math.ceil(width);
      if (x + dx + glyphAdvance > maxAtlasWidth) {
        x = 0;
        y += Math.max(maxHeight, fontSize);
        maxHeight = lineHeight;
      }
      charInfo[char] = { x, y, height: glyphHeight, width: glyphAdvance, yOffset: fontSize - glyphTop };
      x += dx;
      textureWidth = Math.max(textureWidth, x);
      maxHeight = Math.max(maxHeight, lineHeight);
    }
  });

  // Copy each character's SDF image into a single texture
  const textureHeight = y + Math.max(maxHeight);
  const textureData = new Uint8Array(textureWidth * textureHeight);

  atlasConfigs.forEach(({ charSet }) => {
    for (const char of charSet) {
      const { x, y } = charInfo[char];
      const { data, width, height } = sdfDataByChar[char];

      for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
          // if this character is near the right edge, we don't actually copy the whole square of data
          if (x + j < textureWidth) {
            textureData[textureWidth * (y + i) + x + j] = data[i * width + j];
          }
        }
      }
    }
  });

  return {
    charInfo,
    textureWidth,
    textureHeight,
    textureData,
  };
};

const createMemoizedGenerateAtlasConfigs = () =>
  memoizeOne((charSet, charSetSize, fontSize, fontFamily) => [
    {
      charSet,
      fontSize,
      fontFamily,
    },
  ]);

// Build a single font atlas: a texture containing all characters and position/size data for each character.
// We update charSet mutably but monotonically. Pass in the size to invalidate the cache.
const createMemoizedGenerateAtlas = () => memoizeOne(generateAtlas);

const createMemoizedDrawAtlasTexture = () =>
  memoizeOne((textAtlas: GeneratedAtlas, atlasTexture: any) => {
    atlasTexture({
      data: textAtlas.textureData,
      width: textAtlas.textureWidth,
      height: textAtlas.textureHeight,
      format: "alpha",
      wrap: "clamp",
      mag: "linear",
      min: "linear",
    });
  });

const vert = `
  precision mediump float;

  uniform mat4 projection, view, billboardRotation;
  uniform float fontSize;
  uniform vec2 atlasSize;
  uniform bool scaleInvariant;
  uniform float scaleInvariantSize;
  uniform float viewportHeight;
  uniform float viewportWidth;
  uniform bool isPerspective;
  uniform float cameraFovY;
  uniform float cutoff;

  // per-vertex attributes
  attribute vec2 texCoord;
  attribute vec2 position;

  // per-instance (character) attributes
  attribute vec2 srcOffset;
  attribute vec2 charOffset;
  attribute vec2 srcSize;
  attribute vec2 roundedBackgroundSize;
  attribute vec2 backgroundDestSize;
  attribute vec2 destOffset;

  // per-marker attributes
  attribute float billboard;
  attribute vec2 alignmentOffset;
  attribute vec3 posePosition;
  attribute vec3 scale;
  attribute vec4 textColor;
  attribute vec4 poseOrientation;
  attribute vec4 backgroundColor;

  varying vec2 vLineSize;

  varying vec2 vCharBackgroundCoord;
  varying vec2 vTextAtlasCoord;
  varying vec4 vTextColor;
  varying float vBillboard;
  varying vec2 vCharOffset;
  varying float vLineBackgroundRadiusRatio;
  varying vec2 vCharToBackgroundSizeRatio;
  varying vec2 vLineBackgroundCoord;
  varying vec4 vBackgroundColor;

  // rotate a 3d point v by a rotation quaternion q
  // like applyPose(), but we need to use a custom per-instance pose
  vec3 rotate(vec3 v, vec4 q) {
    vec3 temp = cross(q.xyz, v) + q.w * v;
    return v + (2.0 * cross(q.xyz, temp));
  }

  vec4 computeVertexPosition(vec3 markerPos) {
    vec3 pos;
    if (billboard == 1.0) {
      pos = (billboardRotation * vec4(markerPos, 1.0)).xyz + posePosition;
    } else {
      pos = rotate(markerPos, poseOrientation) + posePosition;
    }
    return projection * view * vec4(pos, 1.0);
  }

  void main () {
    // Scale invariance only works for billboards
    bool scaleInvariantEnabled = scaleInvariant && billboard == 1.0;
    vec3 markerSpacePos = vec3((position * backgroundDestSize + destOffset + alignmentOffset) / fontSize, 0);

    if (!scaleInvariantEnabled) {
      // Apply marker scale only when scale invariance is disabled
      markerSpacePos *= scale;
    } else {
      // If scale invariance is enabled, the text will be rendered at a constant
      // scale regardless of the zoom level.
      // The given scaleInvariantSize is in pixels. We need to scale it based on
      // the current canvas resolution to get the proper dimensions later in NDC
      float scaleInvariantFactor = scaleInvariantSize / viewportHeight;
      if (isPerspective) {
        // When using a perspective projection, the effect is achieved by using
        // the w-component for scaling, which is obtained by first projecting
        // the marker position into clip space.
        gl_Position = computeVertexPosition(markerSpacePos);
        scaleInvariantFactor *= gl_Position.w;
        // We also need to take into account the camera's half vertical FOV
        scaleInvariantFactor *= cameraFovY;
      } else {
        // Compute inverse aspect ratio
        float invAspect = viewportHeight / viewportWidth;
        // When using orthographic projection, the scaling factor is obtained from
        // the camera projection itself.
        // We also need applied the inverse aspect ratio
        scaleInvariantFactor *= 2.0 * invAspect / length(projection[0].xyz);
      }
      // Apply scale invariant factor
      markerSpacePos *= scaleInvariantFactor;
    }

    // Compute final vertex position
    gl_Position = computeVertexPosition(markerSpacePos);

    // Compute additions offsets for the char within the background char within the atlas
    vec2 charOffsetCoord = vec2(0.5) - ((backgroundDestSize - srcSize) / 2. + charOffset) / backgroundDestSize;
    vec2 textAtlasCoord = (charOffset + srcOffset + texCoord * backgroundDestSize) / atlasSize;

    // Compute the coords for the full line
    vec2 lineCoord = (texCoord * backgroundDestSize + destOffset) / roundedBackgroundSize;
    vLineBackgroundCoord = vec2(lineCoord.x, texCoord.y) * 2. - 1.; // Transform from [0,1] to [-1,1]

    vCharToBackgroundSizeRatio = (srcSize + ${(BUFFER / 2).toFixed(1)}) / backgroundDestSize;
    vLineBackgroundRadiusRatio = roundedBackgroundSize.y / roundedBackgroundSize.x;
    
    vBackgroundColor = backgroundColor;
    vBillboard = billboard;
    vCharOffset = charOffsetCoord;
    vCharBackgroundCoord = texCoord;
    vTextColor = textColor;
    vTextAtlasCoord = textAtlasCoord;
  }
`;

const frag = `
  #extension GL_OES_standard_derivatives : enable
  precision mediump float;

  uniform bool isHitmap;
  uniform bool scaleInvariant;
  uniform float borderRadiusSize;
  uniform float cutoff;
  uniform float scaleInvariantSize;
  uniform sampler2D atlas;
  uniform float viewportHeight;
  uniform float viewportWidth;
  
  varying float vBillboard;
  varying float vLineBackgroundRadiusRatio;
  varying vec2 vCharBackgroundCoord;
  varying vec2 vCharOffset;
  varying vec2 vCharToBackgroundSizeRatio;
  varying vec2 vLineBackgroundCoord;
  varying vec2 vLineSize;
  varying vec2 vTextAtlasCoord;
  varying vec4 vBackgroundColor;
  varying vec4 vTextColor;

  // fwidth(dist) is used to provide some anti-aliasing. However it's currently only used
  // when the solid background is enabled, because the alpha blending and
  // depth test don't work together nicely for partially-transparent pixels.
  float getAntialisedStep(float dist, float cutoff) {
    return smoothstep(1. - cutoff - fwidth(dist), 1. - cutoff, dist);
  }

  float rectangleMask(vec2 uv, vec2 position, vec2 size) {
    float t = 0.;
    if ((uv.x > position.x - size.x / 2.) && (uv.x < position.x + size.x / 2.)
      && (uv.y > position.y - size.y / 2.) && (uv.y < position.y + size.y / 2.)) {
      t = 1.;
    }
    return t;
  }

  float roundedRectangleMask(vec2 position, vec2 size, float radius) {
    vec2 q = abs(position) - size + radius;
    float borderRadius = min(max(q.x,q.y), 0.) + length(max(q, 0.)) - radius;
    return getAntialisedStep(1. - borderRadius, 0.);
  }

  void main() {
    float dist = texture2D(atlas, vTextAtlasCoord).a;
    float charEdgeStep = getAntialisedStep(dist, cutoff); 

    bool skipInterpolate = scaleInvariant && vBillboard == 1. && scaleInvariantSize <= 20.;
    if (skipInterpolate) {
      // If scale invariant is enabled and scaleInvariantSize is "too small", do not interpolate
      // the raw distance value since at such small scale, the SDF approach causes some
      // visual artifacts.
      // The value used for checking if scaleInvariantSize is "too small" is arbitrary and
      // was defined after some experimentation.
      charEdgeStep = dist;
    }

    // Since the background can be bigger than the character from the atlas,
    // mask out parts of the atlas that fall outside of the character bounds
    float charMask = rectangleMask(vCharBackgroundCoord, vCharOffset, vCharToBackgroundSizeRatio);
    vec4 finalColor = mix(vBackgroundColor, vTextColor, charEdgeStep * charMask);

    // Apply rounded corners
    // Shrink the size of the background by a pixel on each end to help avoid hard edges
    vec2 pixelEdgeScale = 1. - 2. * vec2(1./viewportWidth, 1./viewportHeight);
    vec2 backgroundSize = vec2(1., vLineBackgroundRadiusRatio) * pixelEdgeScale;
    vec2 backgroundPosition = vec2(vLineBackgroundCoord.x, vLineBackgroundCoord.y * vLineBackgroundRadiusRatio);
    float roundedCornerMask = roundedRectangleMask(backgroundPosition, backgroundSize, borderRadiusSize * vLineBackgroundRadiusRatio);
    
    if (!isHitmap) {
      gl_FragColor = vec4(finalColor.rgb, finalColor.a * roundedCornerMask);
    } else {
      gl_FragColor = vTextColor;
    }

    if (gl_FragColor.a == 0.) {
      discard;
    }
  }
`;

function makeTextCommand(alphabet?: string[]) {
  // Keep the set of rendered characters around so we don't have to rebuild the font atlas too often.
  const charSet = new Set(alphabet || []);
  const memoizedGetAtlasConfig = createMemoizedGenerateAtlasConfigs();
  const memoizedGenerateAtlas = createMemoizedGenerateAtlas();
  const memoizedDrawAtlasTexture = createMemoizedDrawAtlasTexture();

  const command = (regl: any) => {
    if (!regl) {
      throw new Error("Invalid regl instance");
    }

    const atlasTexture = regl.texture();

    const drawText = regl({
      // When using scale invariance, we want the text to be drawn on top
      // of other elements. This is achieved by disabling depth testing
      // In addition, make sure the <GLText /> command is the last one
      // being rendered.
      depth: {
        enable: (ctx, props) => (props.scaleInvariant ? false : defaultDepth.enable(ctx, props)),
        mask: (ctx, props) => (props.scaleInvariant ? false : defaultDepth.mask(ctx, props)),
      },
      blend: defaultBlend,
      primitive: "triangle strip",
      vert,
      frag,
      uniforms: {
        atlas: atlasTexture,
        atlasSize: () => [atlasTexture.width, atlasTexture.height],
        fontSize: regl.prop("resolution"),
        cutoff: CUTOFF,
        scaleInvariant: regl.prop("scaleInvariant"),
        scaleInvariantSize: regl.prop("scaleInvariantSize"),
        borderRadiusSize: regl.prop("borderRadiusSize"),
        isHitmap: regl.prop("isHitmap"),
        viewportHeight: regl.context("viewportHeight"),
        viewportWidth: regl.context("viewportWidth"),
        isPerspective: regl.context("isPerspective"),
        cameraFovY: regl.context("fovy"),
      },
      instances: regl.prop("instances"),
      count: 4,
      attributes: {
        position: [[0, 0], [0, -1], [1, 0], [1, -1]],
        texCoord: [[0, 0], [0, 1], [1, 0], [1, 1]], // flipped
        srcOffset: (ctx, props) => ({ buffer: props.srcOffsets, divisor: 1 }),
        charOffset: (ctx, props) => ({ buffer: props.charOffsets, divisor: 1 }),
        destOffset: (ctx, props) => ({ buffer: props.destOffsets, divisor: 1 }),
        srcSize: (ctx, props) => ({ buffer: props.srcSizes, divisor: 1 }),
        roundedBackgroundSize: (ctx, props) => ({ buffer: props.lineSizes, divisor: 1 }),
        backgroundDestSize: (ctx, props) => ({ buffer: props.backgroundDestSizes, divisor: 1 }),
        scale: (ctx, props) => ({ buffer: props.scale, divisor: 1 }),
        alignmentOffset: (ctx, props) => ({ buffer: props.alignmentOffset, divisor: 1 }),
        billboard: (ctx, props) => ({ buffer: props.billboard, divisor: 1 }),
        textColor: (ctx, props) => ({ buffer: props.textColor, divisor: 1 }),
        backgroundColor: (ctx, props) => ({ buffer: props.backgroundColor, divisor: 1 }),
        posePosition: (ctx, props) => ({ buffer: props.posePosition, divisor: 1 }),
        poseOrientation: (ctx, props) => ({ buffer: props.poseOrientation, divisor: 1 }),
      },
    });

    return (props: $ReadOnlyArray<TextMarkerProps>, isHitmap: boolean) => {
      // Split the text into lines
      let estimatedInstances = 0;
      const markersWithSplitText = props.map((marker) => {
        const { text } = marker;
        if (typeof text !== "string") {
          throw new Error(`Expected typeof 'text' to be a string. But got type '${typeof text}' instead.`);
        }

        const charsByLine = text.split("\n").map((line) => Array.from(line));
        charsByLine.forEach((line) => {
          for (const char of text) {
            ++estimatedInstances;
            charSet.add(char);
          }
        });
        return { marker, charsByLine };
      });

      let maybeGeneratedAtlas: ?GeneratedAtlas = command.textAtlas;
      const generatedAtlasChars = maybeGeneratedAtlas ? Object.keys(maybeGeneratedAtlas.charInfo) : [];
      const textChars = Array.from(charSet);
      const generatedAtlasHasAllChars = difference(textChars, generatedAtlasChars).length === 0;
      if (!maybeGeneratedAtlas || !generatedAtlasHasAllChars) {
        // See http://webglstats.com/webgl/parameter/MAX_TEXTURE_SIZE - everyone has at least min 2048 texture size, and
        // almost everyone has at least 4096. With a 2048 width we have ~900 height with a full character set.
        const maxAtlasWidth: number = regl.limits.maxTextureSize || 2048;
        const atlasConfigs = memoizedGetAtlasConfig(charSet, charSet.size, command.resolution, "sans-serif");
        maybeGeneratedAtlas = memoizedGenerateAtlas(atlasConfigs, maxAtlasWidth);
      }
      if (!maybeGeneratedAtlas) {
        return; // Make flow happy
      }
      const generatedAtlas: GeneratedAtlas = maybeGeneratedAtlas;
      memoizedDrawAtlasTexture(generatedAtlas, atlasTexture);

      const destOffsets = new Float32Array(estimatedInstances * 2);
      const backgroundDestSizes = new Float32Array(estimatedInstances * 2);
      const srcSizes = new Float32Array(estimatedInstances * 2);
      const srcOffsets = new Float32Array(estimatedInstances * 2);
      const charOffsets = new Float32Array(estimatedInstances * 2);
      const lineSizes = new Float32Array(estimatedInstances * 2);

      // These don't vary across characters within a marker, but the divisor can't be dynamic so we have to duplicate the data for each character.
      const alignmentOffset = new Float32Array(estimatedInstances * 2);
      const scale = new Float32Array(estimatedInstances * 3);
      const textColor = new Float32Array(estimatedInstances * 4);
      const backgroundColor = new Float32Array(estimatedInstances * 4);
      const billboard = new Float32Array(estimatedInstances);
      const posePosition = new Float32Array(estimatedInstances * 3);
      const poseOrientation = new Float32Array(estimatedInstances * 4);

      let totalInstances = 0;

      // Markers sharing the same position will be rendered in multiple lines.
      // We keep track of offsets for the y-coordinate.
      // We cannot use same value comparison here, so the
      // key of the map is a hash based on the marker's position
      // (see hashMarkerPosition() above).
      const yOffsets = new Map<string, number>();

      for (const { marker, charsByLine } of markersWithSplitText) {
        let totalWidth = 0;
        let x = 0;
        let y = getMarkerYOffset(yOffsets, marker);
        let markerInstances = 0;

        // If we need to render text for hitmap framebuffer, we only render the polygons using
        // the foreground color (which needs to be converted to RGBA since it's a vec4).
        // See comment on fragment shader above
        const fgColor = toColor(
          isHitmap ? marker.color || [0, 0, 0, 1] : marker.colors?.[0] || marker.color || BG_COLOR_LIGHT
        );
        const bgColor = toColor(
          marker.colors?.[1] ||
            (command.autoBackgroundColor && (isColorDark(fgColor) ? BG_COLOR_LIGHT : BG_COLOR_DARK)) ||
            BG_COLOR_TRANSPARENT
        );
        const hlColor = marker?.highlightColor || { r: 1, b: 0, g: 1, a: 1 };
        const hlColorText = isColorDark(hlColor) ? BG_COLOR_LIGHT : BG_COLOR_DARK;

        const paddingScaleX = command.paddingScale?.[0] ?? 1;
        const paddingScaleY = command.paddingScale?.[1] ?? paddingScaleX;

        const paddingX = ((paddingScaleX - 1) * command.resolution) / 2;
        const paddingY = ((paddingScaleY - 1) * command.resolution) / 2;

        const lineHeight = command.resolution + paddingY * 2;

        // In order to make sure there's enough room for glyphs' descenders (i.e. 'g'),
        // we need to apply an extra offset based on the font resolution.
        // The value used to compute the offset is a result of experimentation.
        const charDescenderLineShift = -0.25 * command.resolution;

        let runningGlyphCount = 0;
        for (let lineIndex = 0; lineIndex < charsByLine.length; lineIndex++) {
          const chars = charsByLine[lineIndex];

          // Calculate the entire line's width ahead of time in order to calculate the rounded corners properly
          const totalLineWidth = chars.reduce((total, char) => {
            const info = generatedAtlas.charInfo[char];
            return total + info.width;
          }, paddingX * 2);

          for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const info = generatedAtlas.charInfo[char];
            const index = totalInstances + markerInstances;

            const firstCharOnLine = i === 0;
            const lastCharOnLine = i === chars.length - 1;

            const charIndex = runningGlyphCount + lineIndex + i;
            const charHighlighted =
              !isHitmap && marker.highlightedIndices && marker.highlightedIndices.includes(charIndex);
            const charTextColor = charHighlighted ? hlColorText : fgColor;
            const charBackgroundColor = charHighlighted ? hlColor : bgColor;

            // Calculate per-character attributes
            destOffsets[2 * index + 0] = x;
            destOffsets[2 * index + 1] = -y;

            // The offset from the top-left of the atlas to the top-left corner of each character
            srcOffsets[2 * index + 0] = info.x + BUFFER;
            srcOffsets[2 * index + 1] = info.y + BUFFER;

            // Size of each character in the atlas in pixels
            srcSizes[2 * index + 0] = info.width;
            srcSizes[2 * index + 1] = info.height;

            // The size of the background rectangle in pixels
            backgroundDestSizes[2 * index + 0] =
              info.width + (firstCharOnLine ? paddingX : 0) + (lastCharOnLine ? paddingX : 0);
            backgroundDestSizes[2 * index + 1] = lineHeight;

            // The size of all characters in the line in pixels. Used for rounded corners
            lineSizes[2 * index + 0] = totalLineWidth;
            lineSizes[2 * index + 1] = lineHeight;

            // Additional offset for each character within the background rectangle in pixels
            charOffsets[2 * index + 0] = firstCharOnLine ? -paddingX : 0;
            charOffsets[2 * index + 1] = -(info.yOffset ?? 0) - charDescenderLineShift - paddingY;

            x += backgroundDestSizes[2 * index + 0];
            totalWidth = Math.max(totalWidth, x);

            // Copy per-marker attributes. These are duplicated per character so that we can draw
            // all characters from all markers in a single draw call.

            billboard[index] = Number(marker.billboard ?? true);

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

            textColor[4 * index + 0] = charTextColor.r;
            textColor[4 * index + 1] = charTextColor.g;
            textColor[4 * index + 2] = charTextColor.b;
            textColor[4 * index + 3] = charTextColor.a;

            backgroundColor[4 * index + 0] = charBackgroundColor.r;
            backgroundColor[4 * index + 1] = charBackgroundColor.g;
            backgroundColor[4 * index + 2] = charBackgroundColor.b;
            backgroundColor[4 * index + 3] = charBackgroundColor.a;

            ++markerInstances;
          }

          // Reset values for the next line
          x = 0;
          y += lineHeight;
          runningGlyphCount += chars.length;
        }
        y -= lineHeight;

        const totalHeight = y + command.resolution;
        for (let i = 0; i < markerInstances; i++) {
          alignmentOffset[2 * (totalInstances + i) + 0] = -totalWidth / 2;
          alignmentOffset[2 * (totalInstances + i) + 1] = totalHeight / 2;
        }

        // Compute the y-coordinate's offset for the next overlapped marker, if any.
        // Basically, we add as many offsets as numbers of lines in the marker's text.
        // Since the y-coordinate is inverted when computing destOffset[] a few lines above
        // we need an additional command.resolution offset (precomputed in totalHeight).
        setMarkerYOffset(yOffsets, marker, totalHeight + charsByLine.length * command.resolution);

        totalInstances += markerInstances;
      }

      drawText({
        instances: totalInstances,

        isHitmap: !!isHitmap,
        resolution: command.resolution,
        borderRadiusSize: command.borderRadius || 0,
        scaleInvariant: command.scaleInvariant,
        scaleInvariantSize: command.scaleInvariantSize,

        // per-character
        srcOffsets,
        charOffsets,
        destOffsets,
        srcSizes,
        lineSizes,
        backgroundDestSizes,
        textColor,
        backgroundColor,

        // per-marker
        alignmentOffset,
        billboard,
        poseOrientation,
        posePosition,
        scale,
      });
    };
  };
  command.autoBackgroundColor = false;
  return command;
}

export const makeGLTextCommand = (props: GLTextProps) => {
  const command = makeTextCommand(props.alphabet);
  // HACK: Worldview doesn't provide an easy way to pass a command-level prop into the regl commands,
  // so just attach it to the command object for now.
  command.autoBackgroundColor = props.autoBackgroundColor;
  command.resolution = Math.max(MIN_RESOLUTION, props.resolution || DEFAULT_RESOLUTION);
  command.scaleInvariant = props.scaleInvariantFontSize != null;
  command.scaleInvariantSize = props.scaleInvariantFontSize ?? 0;
  command.textAtlas = props.textAtlas;
  command.borderRadius = props.borderRadius;
  command.paddingScale = props.paddingScale;

  return command;
};

export default function GLText(props: Props) {
  const [command] = useState(() => makeGLTextCommand(props));
  const getChildrenForHitmap = createInstancedGetChildrenForHitmap(1);

  return <Command getChildrenForHitmap={getChildrenForHitmap} reglCommand={command} {...props} />;
}
