// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import * as React from "react";

import "react-resizable/css/styles.css";

import styles from "./index.module.scss";
import Resizable, { type ResizeHandleAxis, type ContainerSize } from "webviz-core/src/components/Resizable";

type Props = {
  children: any,
  className?: string,
  style?: { [string]: any },
  // React-resizable props
  resizable?: boolean,
  resizeHandles?: ?(ResizeHandleAxis[]),
  maxConstraints?: [number, number],
  minConstraints?: [number, number],
  initialSize?: ?[number, number],
  onResize?: (size: ContainerSize) => void,
};

// a small component which wraps its children in menu styles
// and provides a helper { Item } component which can be used
// to render typical menu items with text & an icon
const Menu = ({
  children,
  className,
  style,
  resizable,
  resizeHandles,
  maxConstraints,
  minConstraints,
  initialSize,
  onResize,
}: Props) => {
  const classes = cx(styles.container, className);

  if (!resizable) {
    return (
      <div className={classes} style={style}>
        {children}
      </div>
    );
  }

  return (
    <Resizable
      resizeHandles={resizeHandles}
      maxConstraints={maxConstraints}
      minConstraints={minConstraints}
      initialSize={initialSize}
      onResize={onResize}>
      {({ ref, width, height, minWidth, minHeight }) => (
        <div
          className={classes}
          ref={ref}
          style={{
            ...style,
            ...{
              width,
              height,
              minWidth,
              minHeight,
            },
          }}>
          {children}
        </div>
      )}
    </Resizable>
  );
};

export default Menu;
