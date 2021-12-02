//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useLayoutEffect } from "react";

import { generateAtlas } from "../commands/GLText";

const MAX_ATLAS_WIDTH = 2048;

const SDFGenerator = ({ atlasConfigs }) => {
  const canvasRef = React.useRef();
  const atlasData = React.useRef({ textureWidth: MAX_ATLAS_WIDTH, textureHeight: MAX_ATLAS_WIDTH });

  const regenerateAtlas = React.useCallback(async () => {
    const canEl = canvasRef.current;
    if (canEl) {
      const { charInfo, textureWidth, textureHeight, textureData } = generateAtlas(atlasConfigs, MAX_ATLAS_WIDTH);
      atlasData.current = { charInfo, textureData, textureWidth, textureHeight };

      const ctx = canEl.getContext("2d");
      canEl.width = textureWidth;
      canEl.height = textureHeight;
      ctx.clearRect(0, 0, canEl.width, canEl.height);
      ctx.putImageData(makeRGBAImageData(ctx, textureData, textureWidth, textureHeight), 0, 0);
    }
  }, [atlasConfigs]);

  const downloadAtlasFiles = React.useCallback(() => {
    const canEl = canvasRef.current;
    if (canEl) {
      const { charInfo, textureWidth, textureHeight, textureData } = atlasData.current;
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

  // Regenerate the atlas once all fonts have loaded
  useLayoutEffect(() => {
    // $FlowFixMe - Flow doesn't understand document.fonts
    document.fonts.ready.then(() => {
      regenerateAtlas();
    });
  }, []);

  return (
    <div style={{ margin: 16 }}>
      <button style={{ margin: 16 }} onClick={regenerateAtlas}>
        Regenerate atlas
      </button>
      <button style={{ margin: 16 }} onClick={downloadAtlasFiles}>
        Download atlas files
      </button>
      <canvas
        ref={canvasRef}
        width={atlasData.current.textureWidth}
        height={atlasData.current.textureHeight}
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
  const a = Object.assign(document.createElement("a"), {
    href: data,
    download: fileName,
  });
  if (document.body) {
    document.body.appendChild(a);
  }
  a.style.display = "none";
  a.click();
  a.remove();
}

export default SDFGenerator;
