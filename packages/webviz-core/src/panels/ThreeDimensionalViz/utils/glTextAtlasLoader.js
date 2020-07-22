// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { memoize } from "lodash";

// The textureAtlasData.bin texture is a hardcoded text atlas, and it is tied to the values in the textAtlas.json. I
// generated this by modifying the GLText command from regl-worldview and capturing the output of the
// `memoizedGenerateAtlas` function there. I used a max texture width of 2048 to ensure that this works on all computers
// using Webviz (max texture width is system-dependent but should always be at least 2048), and also used the default
// hardcoded alphabet that Webviz uses.

import textAtlas from "./textAtlas.json";
// $FlowFixMe flow doesn't like file-loader
import glTextAtlasUrl from "./textureAtlasData.bin";

const errorMessage = "Error fetching /textureAtlasData for GLText, generating it client-side";

export type TextAtlas = {|
  textureData: Uint8Array,
  textureWidth: number,
  textureHeight: number,
  charInfo: { [char: string]: {| x: number, y: number, width: number |} },
|};

async function getTextAtlas(): Promise<?TextAtlas> {
  // Don't try to fetch this in tests, it won't work.
  if (process.env.NODE_ENV === "test") {
    return;
  }

  let textureData;
  try {
    const textureDataResponse = await fetch(glTextAtlasUrl);
    if (textureDataResponse.status === 200) {
      const buffer = await textureDataResponse.arrayBuffer();
      textureData = new Uint8Array(buffer, 0, buffer.byteLength);
    }
  } catch (error) {
    console.error(errorMessage, error);
    return;
  }

  if (!textureData) {
    console.error(errorMessage);
    return;
  }

  const expectedSize = textAtlas.textureWidth * textAtlas.textureHeight;
  if (textureData.length !== expectedSize) {
    console.error(`Expected texture size of ${expectedSize} but got ${textureData.length}`);
    return;
  }

  return {
    textureData,
    ...textAtlas,
  };
}

export default memoize<[], Promise<?TextAtlas>>(getTextAtlas);
