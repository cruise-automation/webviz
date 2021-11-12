//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useLayoutEffect } from "react";

import { createMemoizedGenerateAtlas } from "../commands/GLText";

const ALPHABET = (() => {
  const start = 32; // SPACE
  const end = 125; // "}"
  return new Array(end - start + 1).fill().map((_, i) => String.fromCodePoint(start + i));
})();

const maxWidth = 2048;

const SDFGenerator = ({ fontSize }) => {
  const canvasRef = React.useRef();
  const sdfsRef = React.useRef({ textureWidth: maxWidth, textureHeight: maxWidth });

  const generateAtlas = React.useCallback(() => {
    const canEl = canvasRef.current;
    if (canEl) {
      const charSet = new Set(ALPHABET);
      const { charInfo, textureWidth, textureHeight, textureData } = createMemoizedGenerateAtlas()(
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

  useLayoutEffect(() => generateAtlas(), []);

  return (
    <div>
      <button onClick={generateAtlas}>generate</button>
      <button onClick={onClick}>download</button>
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
