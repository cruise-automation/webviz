// @flow

//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Uint32Array | Float32Array;

export type GLBModel = {
  json: Object,
  accessors?: TypedArray[],
  images?: ImageBitmap[],
};

// Parse a GLB file: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0
//
// Returns an object containing the raw json data as well as parsed images (Image) and
// accessors (TypedArray).
export default async function parseGLB(arrayBuffer: ArrayBuffer): Promise<GLBModel> {
  const data = new DataView(arrayBuffer);
  let offset = 0;

  function readUint32() {
    const value = data.getUint32(offset, true);
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
  if (totalLength !== data.byteLength) {
    throw new Error(`length ${totalLength} doesn't match response length ${data.byteLength}`);
  }

  function findNextChunkOfType(type) {
    do {
      const chunkLength = readUint32();
      const chunkType = readUint32();
      if (chunkType === type) {
        const chunkData = new DataView(data.buffer, offset, chunkLength);
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
    let numComponents;
    // prettier-ignore
    switch (accessorInfo.type) {
      case "SCALAR": numComponents = 1; break;
      case "VEC2": numComponents = 2; break;
      case "VEC3": numComponents = 3; break;
      case "VEC4": numComponents = 4; break;
      case "MAT2": numComponents = 4; break;
      case "MAT3": numComponents = 9; break;
      case "MAT4": numComponents = 16; break;
      default:
        throw new Error(`unrecognized type ${accessorInfo.type}`);
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
      accessorInfo.count * numComponents
    );
  });

  // load embedded images
  const images =
    json.images &&
    (await Promise.all(
      json.images.map((imgInfo) => {
        const bufferView = json.bufferViews[imgInfo.bufferView];
        const data = new DataView(binary.buffer, binary.byteOffset + bufferView.byteOffset, bufferView.byteLength);
        return self.createImageBitmap(new Blob([data], { type: imgInfo.mimeType }));
      })
    ));

  return { json, accessors, images };
}
