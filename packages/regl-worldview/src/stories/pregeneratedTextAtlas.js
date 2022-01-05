// @flow

import { type GeneratedAtlas } from "../commands/GLText";
import textAtlas from "./textAtlas.json";
// $FlowFixMe - flow doesn't like binary files
import textureAtlasDataUrl from "./textureAtlasData.bin";

export default async function getTextAtlas(): Promise<GeneratedAtlas> {
  const textureDataResponse = await fetch(textureAtlasDataUrl);
  if (!textureDataResponse) {
    throw new Error("Cannot find texture body");
  }
  const buffer = await textureDataResponse.arrayBuffer();
  const textureData = new Uint8Array(buffer, 0, buffer.byteLength);

  return {
    textureData,
    ...textAtlas,
  };
}
