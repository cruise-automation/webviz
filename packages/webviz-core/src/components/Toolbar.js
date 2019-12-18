// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import styles from "./Toolbar.module.scss";

type Props = {
  children: Array<React$Element<any>> | React$Element<any>,
  style?: any,
  className?: string,
};

const Toolbar = (props: Props) => {
  const { style, className = "" } = props;
  return (
    <div className={`${styles.toolbar} ${className}`} style={style}>
      {props.children}
    </div>
  );
};

Toolbar.displayName = "Toolbar";

export default Toolbar;
