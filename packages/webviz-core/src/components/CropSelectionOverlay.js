// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback, createContext, useContext, useMemo, useEffect, useState } from "react";
import styled from "styled-components";

import KeyListener from "webviz-core/src/components/KeyListener";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SCropSelectionOverlay = styled.div`
  position: fixed;
  z-index: 1000;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  pointer-events: none;
`;

const SCropMainBox = styled.div`
  position: absolute;
  background: transparent;
  pointer-events: auto;
  cursor: move;
`;

const SEdge = styled.div.attrs(({ x, y, axis }) => ({
  style: {
    top: `${((y + 1) / 2) * 100}%`,
    left: `${((x + 1) / 2) * 100}%`,
    width: axis === "x" ? "1px" : "100%",
    height: axis === "y" ? "1px" : "100%",
  },
}))`
  position: absolute;
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.5);
`;

const SMask = styled.div`
  position: absolute;
  bottom: 100%;
  height: 100vh;
  left: -100vw;
  width: 200vw;
  pointer-events: none;
  background: rgba(64, 0, 0, 0.45);
`;

const SHandle = styled.div.attrs(({ x, y }) => ({
  style: { top: `${((y + 1) / 2) * 100}%`, left: `${((x + 1) / 2) * 100}%` },
}))`
  position: absolute;
  transition: width 0.1s, height 0.1s;
  height: 10px;
  width: 10px;
  background: ${colors.DARK9};
  border-radius: 100%;
  border: 1px solid #ffffff;
  transform: translate(-50%, -50%);
  box-shadow: 0px 1px 8px rgba(0, 0, 0, 0.2);

  &:hover {
    height: 14px;
    width: 14px;
  }
`;

const MIN_SIZE = 10;
const DEFAULT_DRAG_INFO = {
  left: false,
  right: false,
  top: false,
  bottom: false,
  cursor: "default",
  dragging: false,
};

// Points range from -1 to 1 in the crop box's clip space
const TOP_LEFT = [-1, -1];
const TOP_CENTER = [0, -1];
const TOP_RIGHT = [1, -1];
const BOTTOM_RIGHT = [1, 1];
const BOTTOM_CENTER = [0, 1];
const BOTTOM_LEFT = [-1, 1];
const LEFT_CENTER = [-1, 0];
const RIGHT_CENTER = [1, 0];

// Edges represented as pairs of points
const EDGES = [
  [TOP_LEFT, TOP_RIGHT], // top
  [TOP_RIGHT, BOTTOM_RIGHT], // right
  [TOP_LEFT, BOTTOM_LEFT], // left
  [BOTTOM_LEFT, BOTTOM_RIGHT], // bottom
];

// Each of the 9 draggable handles specified in clip space
const DRAG_HANDLE_POINTS = [
  TOP_LEFT,
  LEFT_CENTER,
  BOTTOM_LEFT,
  TOP_CENTER,
  BOTTOM_CENTER,
  TOP_RIGHT,
  RIGHT_CENTER,
  BOTTOM_RIGHT,
];

export type CropConfig = {| width: number, height: number, top: number, left: number |};

export const CropSelectionContext = createContext<{|
  showCropSelection: boolean,
  setShowCropSelection: (boolean) => void,
  updateCrop: ((CropConfig) => $Shape<CropConfig>) => void,
  crop: CropConfig,
|}>({
  updateCrop: () => {
    throw new Error("cannot setCrop before initialization");
  },
  setShowCropSelection: () => {
    throw new Error("cannot setShowCropSelection before initialization");
  },
  showCropSelection: false,
  crop: { top: 0, left: 0, width: 0, height: 0 },
});

export const CropSelectionOverlayProvider = ({
  children,
  initialConfig,
  initialShowSelection,
}: {
  children?: React$Node,
  initialConfig?: CropConfig,
  initialShowSelection?: boolean,
}) => {
  const [crop, updateCrop] = React.useState(initialConfig ?? { width: 200, height: 150, left: 50, top: 50 });
  const [showCropSelection, setShowCropSelection] = React.useState(initialShowSelection ?? false);
  const contextValue = React.useMemo(
    () => ({
      showCropSelection,
      setShowCropSelection,
      updateCrop,
      crop,
    }),
    [crop, showCropSelection]
  );

  return (
    <CropSelectionContext.Provider value={contextValue}>
      {children}
      <CropSelectionOverlay />
    </CropSelectionContext.Provider>
  );
};

export const CropSelectionOverlay = () => {
  const [downPoint, setDownPoint] = useState([0, 0]);
  const [draggingInfo, setDraggingInfo] = useState(DEFAULT_DRAG_INFO);
  const { crop, updateCrop, showCropSelection, setShowCropSelection } = useContext(CropSelectionContext);

  const onMouseUp = useCallback(() => {
    updateCrop(({ top, left, width, height }) => {
      return {
        top: Math.max(0, top),
        left: Math.max(0, left),
        width: Math.min(width + (left < 0 ? left : 0), window.innerWidth - left),
        height: Math.min(height + (top < 0 ? top : 0), window.innerHeight - top),
      };
    });
    return setDraggingInfo(DEFAULT_DRAG_INFO);
  }, [updateCrop]);

  const onMouseDown = useCallback(({ left, right, top, bottom, cursor }, event: MouseEvent) => {
    const { clientX, clientY } = event;
    event.stopPropagation();
    setDownPoint([clientX, clientY]);
    setDraggingInfo({ left, right, top, bottom, cursor, dragging: true });
  }, []);

  const onMouseMove = useCallback((event: MouseEvent) => {
    const { clientX, clientY } = event;
    const dragDelta = [clientX - downPoint[0], clientY - downPoint[1]];
    if (!draggingInfo.dragging) {
      return;
    }

    setDownPoint([clientX, clientY]);
    updateCrop(
      (oldCrop: CropConfig): CropConfig => {
        let { left, top } = oldCrop;
        let right = oldCrop.left + oldCrop.width;
        let bottom = oldCrop.top + oldCrop.height;

        // Update the edge positions based on which of the dragInfo booleans are enabled
        if (draggingInfo.left) {
          left = left + dragDelta[0];
        }
        if (draggingInfo.right) {
          right = right + dragDelta[0];
        }
        if (draggingInfo.top) {
          top = top + dragDelta[1];
        }
        if (draggingInfo.bottom) {
          bottom = bottom + dragDelta[1];
        }
        return { top, left, width: Math.max(MIN_SIZE, right - left), height: Math.max(MIN_SIZE, bottom - top) };
      }
    );
  }, [downPoint, draggingInfo, updateCrop]);

  useEffect(() => {
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);

    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [onMouseMove, onMouseUp]);

  const keyDownHandlers = useMemo(
    () => ({
      Escape: () => setShowCropSelection(false),
    }),
    [setShowCropSelection]
  );

  return (
    showCropSelection && (
      <SCropSelectionOverlay
        style={{ cursor: draggingInfo?.cursor ?? "default", userSelect: draggingInfo ? "none" : "auto" }}>
        <SCropMainBox
          style={crop}
          onMouseDown={(event) =>
            onMouseDown({ left: true, right: true, top: true, bottom: true, cursor: "move" }, event)
          }
          onMouseUp={onMouseUp}>
          <SMask style={{ bottom: "100%", height: "100vh", left: "-100vw" }} />
          <SMask style={{ top: "100%", left: "-100vw", height: "100vh" }} />
          <SMask style={{ top: "0", right: "100%", width: "100vw", height: crop.height }} />
          <SMask style={{ top: "0", left: "100%", width: "100vw", height: crop.height }} />
          {EDGES.map(([ptA, ptB], i) => {
            const [x, y] = ptA;
            const left = ptA[0] + ptB[0] < 0;
            const right = ptA[0] + ptB[0] > 0;
            const top = ptA[1] + ptB[1] < 0;
            const bottom = ptA[1] + ptB[1] > 0;
            const axis = ptA[0] === ptB[0] ? "x" : "y";
            const cursor = axis === "y" ? "row-resize" : "col-resize";
            return (
              <SEdge
                key={i}
                x={x}
                y={y}
                axis={axis}
                onMouseDown={(event) => onMouseDown({ left, right, top, bottom, cursor }, event)}
                onMouseUp={onMouseUp}
                style={{ cursor }}
              />
            );
          })}
          {DRAG_HANDLE_POINTS.map(([x, y]) => {
            return (
              <SHandle
                key={`${x}-${y}`}
                x={x}
                y={y}
                onMouseDown={(event) =>
                  onMouseDown({ left: x < 0, right: x > 0, top: y < 0, bottom: y > 0, cursor: "move" }, event)
                }
              />
            );
          })}
        </SCropMainBox>
        <KeyListener global keyDownHandlers={keyDownHandlers} />
      </SCropSelectionOverlay>
    )
  );
};
