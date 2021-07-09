// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export type DebugStats = {
  renderCount: number,
  bufferCount: number,
  elementsCount: number,
  textureCount: number,
  shaderCount: number,
  totalTextureSize: number,
  totalBufferSize: number,
};
