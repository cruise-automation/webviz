// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useRef, useEffect } from "react";
import styled from "styled-components";

import Dimensions from "webviz-core/src/components/Dimensions";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const CANVAS_HEIGHT = 5;
const LOADED_COLOR = colors.RED;
const UNLOADED_COLOR = colors.GRAY;

type Props = {
  blockLoadingStates: boolean[],
  canvasWidth: number,
};

const SProgressWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: ${CANVAS_HEIGHT}px;
  width: 100%;
  position: relative;
`;

function BlockLoadingProgressBase({ canvasWidth, blockLoadingStates }: Props) {
  const canvasRef = useRef<?HTMLCanvasElement>(undefined);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || blockLoadingStates.length === 0) {
      return;
    }
    // Update canvas based on blockLoadingStates.
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rectWidth = canvasWidth / blockLoadingStates.length;
    let rangeStartIdx = 0;
    blockLoadingStates.forEach((loadingState, idx) => {
      if (blockLoadingStates[rangeStartIdx] !== loadingState) {
        // Loading state changed, draw all the previous blocks.
        ctx.fillStyle = !loadingState ? LOADED_COLOR : UNLOADED_COLOR;
        ctx.beginPath();
        ctx.rect(rectWidth * rangeStartIdx, 0, (idx - rangeStartIdx) * rectWidth, CANVAS_HEIGHT);
        ctx.fill();
        rangeStartIdx = idx;
      }
      // Reached the end and draw the last part.
      if (idx === blockLoadingStates.length - 1) {
        ctx.fillStyle = loadingState ? LOADED_COLOR : UNLOADED_COLOR;
        ctx.beginPath();
        ctx.rect(rectWidth * rangeStartIdx, 0, (idx - rangeStartIdx + 1) * rectWidth, CANVAS_HEIGHT);
        ctx.fill();
      }
    });
  }, [blockLoadingStates, canvasWidth]);

  return <canvas width={canvasWidth} height={CANVAS_HEIGHT} ref={canvasRef} />;
}

export default function BlockLoadingProgress(props: $Diff<Props, { canvasWidth: number }>) {
  return (
    <SProgressWrapper>
      <Dimensions>{({ width }) => <BlockLoadingProgressBase {...props} canvasWidth={width} />}</Dimensions>
    </SProgressWrapper>
  );
}
