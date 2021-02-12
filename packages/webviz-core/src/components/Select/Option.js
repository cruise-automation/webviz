// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import * as React from "react";

import styles from "./Option.module.scss";
import Icon from "webviz-core/src/components/Icon";

type Props = {
  // value is used by the Select component
  value?: any, // eslint-disable-line
  children: React.Node,
  onClick?: (e: SyntheticMouseEvent<HTMLDivElement>) => void,
  disabled: boolean,
  active: boolean,
  rightIcon?: React.Node,
};

export default class Option extends React.Component<Props> {
  static defaultProps = {
    disabled: false,
    active: false,
  };

  renderRightIcon() {
    const { rightIcon } = this.props;
    if (!rightIcon) {
      return;
    }
    return (
      <span style={{ float: "right" }}>
        <Icon>{rightIcon}</Icon>
      </span>
    );
  }

  render() {
    const { onClick, active, disabled, children } = this.props;
    const className = cx(styles.container, {
      [styles.active]: active,
      [styles.disabled]: disabled,
    });
    return (
      <div className={className} onClick={onClick}>
        {children}
        {this.renderRightIcon()}
      </div>
    );
  }
}
