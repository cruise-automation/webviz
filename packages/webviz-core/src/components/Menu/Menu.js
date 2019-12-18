// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import * as React from "react";

import styles from "./index.module.scss";

type Props = {
  children: any,
  className?: string,
  style?: { [string]: any },
};

// a small component which wraps its children in menu styles
// and provides a helper { Item } component which can be used
// to render typical menu items with text & an icon
export default class Menu extends React.PureComponent<Props> {
  render() {
    const { children, className, style } = this.props;
    const classes = cx(styles.container, className);
    return (
      <div className={classes} style={style}>
        {children}
      </div>
    );
  }
}
