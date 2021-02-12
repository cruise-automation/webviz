// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import memoize from "lodash/memoize";

import type { DepthState, BlendState } from "../types";
import { defaultReglDepth, defaultReglBlend } from "./commandUtils";

const withRenderStateOverrides = (command: any) => (regl: any) => {
  // Generate the render command once
  const reglCommand = command(regl);

  // Use memoization to avoid generating multiple render commands for the same render states
  // for the same render states
  const memoizedRender = memoize(
    (props: { depth: DepthState, blend: BlendState }) => {
      const { depth, blend } = props;
      return regl({ ...reglCommand, depth, blend });
    },
    (...args) => JSON.stringify(args)
  );

  const renderElement = (props) => {
    // Get curstom render states from the given marker. Some commands, like <Arrows />
    // will use the originalMarker property instead. If no custom render states
    // are present, use either the ones provided in the command or the default ones. We do
    // need to provide valid objects in order to make sure the hitmap works correctly.
    const depth = props.depth || props.originalMarker?.depth || reglCommand.depth || defaultReglDepth;
    const blend = props.blend || props.originalMarker?.blend || reglCommand.blend || defaultReglBlend;
    memoizedRender({ depth, blend })(props);
  };

  return (props: any) => {
    if (Array.isArray(props)) {
      props.forEach(renderElement);
    } else {
      renderElement(props);
    }
  };
};

export default withRenderStateOverrides;
