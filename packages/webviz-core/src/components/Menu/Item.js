// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MenuLeftIcon from "@mdi/svg/svg/menu-left.svg";
import MenuRightIcon from "@mdi/svg/svg/menu-right.svg";
import cx from "classnames";
import { noop } from "lodash";
import * as React from "react";

import styles from "./index.module.scss";
import Icon from "webviz-core/src/components/Icon";

type ItemProps = {
  className?: string,
  checked?: boolean,
  children: React.Node,
  icon?: React.Node,
  disabled?: boolean,
  onClick?: () => void,
  hasSubMenu?: boolean,
  direction?: "left" | "right",
};

const Item = (props: ItemProps) => {
  const { className = "", checked, children, icon, onClick, disabled, hasSubMenu, direction = "left" } = props;
  const classes = cx(styles.item, className, {
    [styles.active]: checked && !disabled,
    [styles.disabled]: disabled,
  });
  return (
    <div className={classes} onClick={disabled ? noop : onClick}>
      {hasSubMenu && (
        <Icon style={direction === "right" ? { float: "right" } : undefined}>
          {direction === "left" ? <MenuLeftIcon /> : <MenuRightIcon />}
        </Icon>
      )}
      {icon && (
        <span className={styles.icon}>
          <Icon>{icon}</Icon>
        </span>
      )}
      {children}
    </div>
  );
};

Item.displayName = "Menu.Item";
Item.isMenuItem = true;

export default Item;
