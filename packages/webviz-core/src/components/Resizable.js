// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ResizeIcon from "@mdi/svg/svg/resize-bottom-right.svg";
import * as React from "react";
import { Resizable } from "react-resizable";
import "react-resizable/css/styles.css";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";

export type ResizeHandleAxis = "s" | "w" | "e" | "n" | "sw" | "nw" | "se" | "ne";

const SHandle = styled.div`
  position: absolute;
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  padding: 0 3px 3px 0;

  // Copied wholesale from react-resizable.
  .react-resizable-handle-sw {
    bottom: 0;
    left: 0;
    cursor: sw-resize;
    transform: rotate(90deg);
  }
  .react-resizable-handle-se {
    bottom: 0;
    right: 0;
    cursor: se-resize;
  }
  .react-resizable-handle-nw {
    top: 0;
    left: 0;
    cursor: nw-resize;
    transform: rotate(180deg);
  }
  .react-resizable-handle-ne {
    top: 0;
    right: 0;
    cursor: ne-resize;
    transform: rotate(270deg);
  }
  .react-resizable-handle-w,
  .react-resizable-handle-e {
    top: 50%;
    margin-top: -10px;
    cursor: ew-resize;
  }
  .react-resizable-handle-w {
    left: 0;
    transform: rotate(135deg);
  }
  .react-resizable-handle-e {
    right: 0;
    transform: rotate(315deg);
  }
  .react-resizable-handle-n,
  .react-resizable-handle-s {
    left: 50%;
    margin-left: -10px;
    cursor: ns-resize;
  }
  .react-resizable-handle-n {
    top: 0;
    transform: rotate(225deg);
  }
  .react-resizable-handle-s {
    bottom: 0;
    transform: rotate(45deg);
  }
`;

export type ContainerSize = [number, number];

type Props = {
  children: ({
    ref: { current: ?HTMLElement },
    width: ?number,
    height: ?number,
    minWidth: ?number,
    minHeight: ?number,
  }) => React.Node,
  resizeHandles?: ?(ResizeHandleAxis[]),
  maxConstraints?: ContainerSize,
  minConstraints?: ContainerSize,
  initialSize?: ?ContainerSize,
  onResize?: (size: ContainerSize) => void,
};

// a small component which wraps its children in menu styles
// and provides a helper { Item } component which can be used
// to render typical menu items with text & an icon
export default function ResizableComponent({
  children,
  resizeHandles,
  maxConstraints,
  minConstraints,
  onResize,
  initialSize,
}: Props) {
  const [{ width, height }, setDims] = React.useState(
    initialSize ? { width: initialSize[0], height: initialSize[1] } : { width: 0, height: 0 }
  );
  const childRef = React.useRef();

  const handleResize = React.useCallback((
    _: SyntheticEvent<>,
    { size }: { size: { width: ?number, height: ?number } }
  ) => {
    const newWidth = size.width || childRef.current?.clientWidth;
    const newHeight = size.height || childRef.current?.clientHeight;
    setDims({
      width: newWidth,
      height: newHeight,
    });
    if (onResize && newWidth != null && newHeight != null) {
      onResize([newWidth, newHeight]);
    }
  }, [onResize]);

  React.useLayoutEffect(() => {
    if (childRef?.current) {
      setDims({
        width: childRef.current?.clientWidth,
        height: childRef.current?.clientHeight,
      });
    }
  }, []);

  return (
    <Resizable
      width={width}
      height={height}
      handle={(axis: ResizeHandleAxis, ref: { current: ?HTMLElement }) => (
        <SHandle ref={ref} className={`react-resizable-handle-${axis}`}>
          <Icon style={{ cursor: "inherit" }}>
            <ResizeIcon />
          </Icon>
        </SHandle>
      )}
      onResize={handleResize}
      maxConstraints={maxConstraints}
      minConstraints={minConstraints}
      resizeHandles={resizeHandles}>
      {children({
        ref: childRef,
        width,
        height,
        minWidth: minConstraints && minConstraints[0],
        minHeight: minConstraints && minConstraints[1],
      })}
    </Resizable>
  );
}
