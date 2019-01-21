// @flow

//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Load a GLB file: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0
//
// Returns an object containing the raw json data as well as parsed images (Image) and
// accessors (TypedArray).
export default async function loadGLB(url: string): Promise<{}> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`failed to fetch GLB: ${response.status}`);
  }
  const responseData = new DataView(await response.arrayBuffer());
  let offset = 0;

  function readUint32() {
    const value = responseData.getUint32(offset, true);
    offset += 4;
    return value;
  }

  // magic header
  const magic = readUint32();
  if (magic !== 0x46546c67) {
    throw new Error(`incorrect magic value 0x${magic.toString(16)}`);
  }

  // Binary glTF version
  const version = readUint32();
  if (version !== 2) {
    throw new Error(`incorrect version ${version}`);
  }

  // total file length
  const totalLength = readUint32();
  if (totalLength !== responseData.byteLength) {
    throw new Error(`length ${totalLength} doesn't match response length ${responseData.byteLength}`);
  }

  function findNextChunkOfType(type) {
    do {
      const chunkLength = readUint32();
      const chunkType = readUint32();
      if (chunkType === type) {
        const chunkData = new DataView(responseData.buffer, offset, chunkLength);
        offset += chunkLength;
        return chunkData;
      }
      offset += chunkLength;
    } while (offset < totalLength);
  }

  const jsonData = findNextChunkOfType(/* JSON */ 0x4e4f534a);
  if (!jsonData) {
    throw new Error("no JSON chunk found");
  }

  const json = JSON.parse(new TextDecoder().decode(jsonData));

  const binary = findNextChunkOfType(/* BIN */ 0x004e4942);
  if (!binary) {
    return { json };
  }

  if (json.buffers[0].uri !== undefined) {
    throw new Error("expected GLB-stored buffer");
  }

  // create a TypedArray for each accessor
  const accessors = json.accessors.map((accessorInfo) => {
    let arrayType;
    // prettier-ignore
    switch (accessorInfo.componentType) {
      case WebGLRenderingContext.BYTE: arrayType = Int8Array; break;
      case WebGLRenderingContext.UNSIGNED_BYTE: arrayType = Uint8Array; break;
      case WebGLRenderingContext.SHORT: arrayType = Int16Array; break;
      case WebGLRenderingContext.UNSIGNED_SHORT: arrayType = Uint16Array; break;
      case WebGLRenderingContext.UNSIGNED_INT: arrayType = Uint32Array; break;
      case WebGLRenderingContext.FLOAT: arrayType = Float32Array; break;
      default:
        throw new Error(`unrecognized componentType ${accessorInfo.componentType}`);
    }
    const bufferView = json.bufferViews[accessorInfo.bufferView];
    if (bufferView.buffer !== 0) {
      throw new Error("only GLB-stored buffers are supported");
    }
    if (bufferView.byteLength % arrayType.BYTES_PER_ELEMENT !== 0) {
      throw new Error("bufferView.byteLength mismatch");
    }
    return new arrayType(
      binary.buffer,
      binary.byteOffset + (bufferView.byteOffset || 0) + (accessorInfo.byteOffset || 0),
      bufferView.byteLength / arrayType.BYTES_PER_ELEMENT
    );
  });

  // load embedded images
  const images = await Promise.all(
    json.images.map(
      (imgInfo) =>
        new Promise((resolve, reject) => {
          const bufferView = json.bufferViews[imgInfo.bufferView];
          const data = new DataView(binary.buffer, binary.byteOffset + bufferView.byteOffset, bufferView.byteLength);
          const url = URL.createObjectURL(new Blob([data], { type: imgInfo.mimeType }));

          const image = new Image();
          image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
          };
          image.onerror = () => {
            URL.revokeObjectURL(url);
            reject();
          };
          image.src = url;
        })
    )
  );

  return { json, accessors, images };
}
