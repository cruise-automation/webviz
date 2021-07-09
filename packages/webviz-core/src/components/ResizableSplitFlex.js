// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";
import styled from "styled-components";

const getDraggingCursor = (column) => (column ? "row-resize" : "col-resize");

const SContainer = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
`;

const SSide = styled.div`
  display: flex;
  flex: 1 1 auto;
  overflow: hidden;
  position: absolute;
  height: 100%;
  width: 100%;
  align-items: stretch;
`;

const SDraggableBorder = styled.div`
  width: ${({ column }) => (column ? "100%" : "2px")};
  height: ${({ column }) => (!column ? "100%" : "2px")};
  background: #777;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  opacity: ${({ dragging }) => (dragging ? 1 : 0)};
  pointer-events: ${({ dragging }) => (dragging ? "none" : "auto")};
  cursor: ${({ column }) => getDraggingCursor(column)};

  &:hover {
    opacity: 1;
  }
`;

type Props = {|
  children: React.Node[],
  column?: boolean,
  defaultSplitPercent?: number,
  splitPercent?: number,
  onChange?: (number) => void,
|};

const convertPercentToAbsolute = (valueRaw: string | number, containerSize: number): number => {
  const valueAsStr = `${valueRaw}`;
  const value = parseFloat(valueAsStr);
  if (valueAsStr.includes("%")) {
    return value / 100;
  }
  return value / containerSize;
};
// A container similar to <Flex> that adds a draggable, split border between the container's child elements.
const ResizableSplitFlex = ({ children, column, defaultSplitPercent, splitPercent, onChange }: Props) => {
  const resizingCursor = getDraggingCursor(column);
  const positionPropName = column ? "top" : "left";
  const sizePropName = column ? "height" : "width";
  const minStyleName = column ? "minHeight" : "minWidth";
  const maxStyleName = column ? "maxHeight" : "maxWidth";

  // const containerRef = React.useRef<?HTMLElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [containerRef, setContainerRef] = React.useState(undefined);

  const [splitPercentInternal, setSplitPercent] = React.useState(defaultSplitPercent ?? 0.5);
  const splitPercentToUse = splitPercent ?? splitPercentInternal;

  const childrenStyles = React.useMemo(
    () =>
      React.Children.map(children, (element) => {
        if (!React.isValidElement(element)) {
          return {};
        }

        const { minHeight, maxHeight, minWidth, maxWidth } = element.props.style || {};
        return { minHeight, maxHeight, minWidth, maxWidth };
      }),
    [children]
  );

  const setContainerRefCallback = React.useCallback((element) => {
    if (element) {
      setContainerRef(element);
    }
  }, []);

  const getConstrainedMinMax = React.useCallback(() => {
    if (containerRef) {
      const { height, width } = containerRef.getBoundingClientRect();
      const containerSize = column ? height : width;
      const absoluteStyles = childrenStyles.map((styles) => {
        const minVal = styles[minStyleName];
        const maxVal = styles[maxStyleName];
        return {
          min: minVal && convertPercentToAbsolute(minVal, containerSize),
          max: maxVal && convertPercentToAbsolute(maxVal, containerSize),
        };
      });

      const constrainedMin = Math.max(absoluteStyles[0].min ?? 0, 1 - (absoluteStyles[1].max ?? 1));
      const constrainedMax = Math.min(absoluteStyles[0].max ?? 1, 1 - (absoluteStyles[1].min ?? 0));
      return [constrainedMin, constrainedMax];
    }
    return [0, 1];
  }, [childrenStyles, column, containerRef, maxStyleName, minStyleName]);

  const stylesByChildType = React.useMemo(() => {
    const [constrainedMin, constrainedMax] = getConstrainedMinMax();
    const constrainedSplit = Math.max(constrainedMin, Math.min(splitPercentToUse, constrainedMax));
    return {
      first: { [sizePropName]: `${constrainedSplit * 100}%` },
      border: { [positionPropName]: `${constrainedSplit * 100}%` },
      second: {
        [positionPropName]: `${constrainedSplit * 100}%`,
        [sizePropName]: `${(1 - constrainedSplit) * 100}%`,
      },
    };
  }, [getConstrainedMinMax, positionPropName, sizePropName, splitPercentToUse]);

  const dragStart = React.useCallback(() => setDragging(true), []);
  const dragStop = React.useCallback(() => setDragging(false), []);
  const drag = React.useCallback((ev: MouseEvent) => {
    if (containerRef) {
      const { height, width, top, left } = containerRef.getBoundingClientRect();
      const cursorDistance = column ? ev.clientY : ev.clientX;
      const minEdge = column ? top : left;
      const containerSize = column ? height : width;
      const newSplit = (cursorDistance - minEdge) / containerSize;
      setSplitPercent(newSplit);
      if (onChange) {
        onChange(newSplit);
      }
    }
  }, [column, containerRef, onChange]);

  React.useEffect(() => {
    if (dragging) {
      document.addEventListener("mouseup", dragStop);
      document.addEventListener("mousemove", drag);
    }
    return () => {
      document.removeEventListener("mouseup", dragStop);
      document.removeEventListener("mousemove", drag);
    };
  }, [drag, dragStop, dragging]);

  return (
    <SContainer ref={setContainerRefCallback} style={{ cursor: dragging ? resizingCursor : "default" }}>
      <SSide column={column} style={stylesByChildType.first}>
        {children[0]}
      </SSide>
      <SDraggableBorder dragging={dragging} column={column} onMouseDown={dragStart} style={stylesByChildType.border} />
      <SSide column={column} style={stylesByChildType.second}>
        {children[1]}
      </SSide>
    </SContainer>
  );
};
export default ResizableSplitFlex;
