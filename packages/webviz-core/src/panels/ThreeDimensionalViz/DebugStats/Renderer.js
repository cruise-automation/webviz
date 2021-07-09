// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React from "react";

import { type DebugStats } from "./types";

const style = {
  position: "absolute",
  bottom: 5,
  right: 5,
  backgroundColor: "rgba(1, 1, 1, 0.2)",
  padding: 5,
  fontFamily: "monospace",
};

// Looks at the regl stats and throws errors if it seems we're going over acceptable (arbitrary) max ranges.
// The maxes are arbitrarily set to be an order of magnitude higher than the 'steady state' of a pretty loaded webviz scene to
// allow for plenty of headroom.
function validate(stats) {
  if (stats.bufferCount > 500) {
    throw new Error(`Possible gl buffer leak detected. Buffer count: ${stats.bufferCount}`);
  }
  if (stats.elementsCount > 500) {
    throw new Error(`Possible gl elements leak detected. Buffer count: ${stats.elementsCount}`);
  }
  if (stats.textureCount > 500) {
    throw new Error(`Possible gl texture leak detected. Texture count: ${stats.textureCount}`);
  }
  // We should likely have far fewer than 100 shaders...they only get created when regl "compiles" a command.
  // Nevertheless, we should check in case there's some wild code somewhere constantly recompiling a command.
  if (stats.shaderCount > 100) {
    throw new Error(`Possible gl shader leak detected. Shader count: ${stats.shaderCount}`);
  }
}

type Props = {|
  debugStats: DebugStats,
|};

// Shows debug regl stats in the 3d panel.  Crashes the panel if regl stats drift outside of acceptable ranges.
// TODO(bmc): move to regl-worldview at some point
export default function Renderer(props: Props) {
  const { debugStats } = props;
  if (debugStats) {
    validate(debugStats);
    const {
      renderCount,
      bufferCount,
      textureCount,
      elementsCount,
      shaderCount,
      totalTextureSize,
      totalBufferSize,
    } = debugStats;
    const textureSize = (totalTextureSize / (1024 * 1024)).toFixed(1);
    const bufferSize = (totalBufferSize / (1024 * 1024)).toFixed(1);

    return (
      <div style={style}>
        <div>renders: {renderCount}</div>
        <div>
          buffers: {bufferCount} ({bufferSize}) Mb
        </div>
        <div>
          textures: {textureCount} ({textureSize}) Mb
        </div>
        <div>elements: {elementsCount}</div>
        <div>shaders: {shaderCount}</div>
      </div>
    );
  }
  return null;
}
