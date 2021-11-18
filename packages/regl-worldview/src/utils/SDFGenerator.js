//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useLayoutEffect } from "react";
import { createGlobalStyle } from "styled-components";

import { generateAtlas } from "../commands/GLText";

import MaterialDesignIconsWoff2 from "!!file-loader!@mdi/font/fonts/materialdesignicons-webfont.woff2";

const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: "Material Design Icons";
    src: url("${MaterialDesignIconsWoff2}") format("woff2");
    font-weight: normal;
    font-style: normal;
  }
`;

const ALPHABET = (() => {
  const start = 32; // SPACE
  const end = 125; // "}"
  return new Array(end - start + 1).fill().map((_, i) => String.fromCodePoint(start + i));
})();

export const ICON_SVG_BY_TYPE2 = {
  // Supported icons, add more if needed.
  "alpha-r": "\u{F0AFF}",
  "alpha-t": "\u{F0B01}",
  "arrow-collapse-down": "\u{F0792}",
  "arrow-collapse-left": "\u{F0793}",
  "arrow-collapse-right": "\u{F0794}",
  "arrow-collapse-up": "\u{F0795}",
  "arrow-decision": "\u{F09BB}",
  "arrow-left": "\u{F004D}",
  "arrow-right": "\u{F0054}",
  "arrow-top-left": "\u{F005B}",
  "arrow-top-right": "\u{F005C}",
  "bus-school": "\u{F079F}",
  "car-brake-alert": "\u{F0C48}",
  "car-parking-lights": "\u{F0D63}",
  "hazard-lights": "\u{F0C89}",
  "help-circle-outline": "\u{F0625}",
  "road-variant": "\u{F0462}",
  "signal-off": "\u{F0783}",
  "robot-outline": "\u{F167A}",
  "robot-off-outline": "\u{F167B}",
  bike: "\u{F00A3}",
  bus: "\u{F00E7}",
  car: "\u{F010B}",
  DEFAULT: "\u{F01A7}",
  help: "\u{F02D6}",
  motorbike: "\u{F037C}",
  octagon: "\u{F03C3}",
  train: "\u{F052C}",
  truck: "\u{F053D}",
  walk: "\u{F0583}",
};

const maxWidth = 2048;

const SDFGenerator = ({ fontSize }) => {
  const canvasRef = React.useRef();
  const sdfsRef = React.useRef({ textureWidth: maxWidth, textureHeight: maxWidth });

  const regenerateAtlas = React.useCallback(() => {
    const canEl = canvasRef.current;
    if (canEl) {
      //   const charSet = new Set(Object.values(ICON_SVG_BY_TYPE2));
      const charSet = new Set(ALPHABET);
      const { charInfo, textureWidth, textureHeight, textureData } = generateAtlas(
        charSet,
        charSet.size,
        fontSize,
        maxWidth
      );
      sdfsRef.current = { charInfo, textureData, textureWidth, textureHeight };

      const ctx = canEl.getContext("2d");
      canEl.width = textureWidth;
      canEl.height = textureHeight;
      ctx.clearRect(0, 0, canEl.width, canEl.height);
      ctx.putImageData(makeRGBAImageData(ctx, textureData, textureWidth, textureHeight), 0, 0);
    }
  }, []);

  const onClick = React.useCallback(() => {
    const canEl = canvasRef.current;
    if (canEl) {
      const { charInfo, textureWidth, textureHeight, textureData } = sdfsRef.current;
      const textAtlasJson = {
        charInfo,
        textureWidth,
        textureHeight,
      };
      const textAtlasJsonStr = JSON.stringify(textAtlasJson, null, 2);
      const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(textAtlasJsonStr)}`;
      downloadURL(dataStr, "textAtlas.json");

      const blob = new Blob([textureData], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      downloadURL(url, "textureAtlasData.bin");
      setTimeout(() => window.URL.revokeObjectURL(url));
    }
  }, []);

  useLayoutEffect(() => {
    document.fonts.ready.then(() => {
      regenerateAtlas();
    });
  }, []);

  return (
    <div style={{ margin: 16 }}>
      <GlobalStyle />
      {"Icon : \u{F053D}"}
      <button style={{ margin: 16 }} onClick={regenerateAtlas}>
        Regenerate atlas
      </button>
      <button style={{ margin: 16 }} onClick={onClick}>
        Download atlas files
      </button>
      <canvas
        ref={canvasRef}
        width={sdfsRef.current.textureWidth}
        height={sdfsRef.current.textureHeight}
        style={{ backgroundColor: "white" }}
      />
    </div>
  );
};

// Convert alpha-only to RGBA so we can use `putImageData` for building the composite bitmap
function makeRGBAImageData(ctx, alphaChannel, width, height) {
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < alphaChannel.length; i++) {
    imageData.data[4 * i + 0] = alphaChannel[i];
    imageData.data[4 * i + 1] = alphaChannel[i];
    imageData.data[4 * i + 2] = alphaChannel[i];
    imageData.data[4 * i + 3] = 255;
  }
  return imageData;
}

function downloadURL(data, fileName) {
  const a = document.createElement("a");
  a.href = data;
  a.download = fileName;
  document.body.appendChild(a);
  a.style = "display: none";
  a.click();
  a.remove();
}

export default SDFGenerator;
