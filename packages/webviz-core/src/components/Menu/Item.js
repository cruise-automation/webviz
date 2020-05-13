// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChevronLeftIcon from "@mdi/svg/svg/chevron-left.svg";
import ChevronRightIcon from "@mdi/svg/svg/chevron-right.svg";
import cx from "classnames";
import { noop } from "lodash";
import * as React from "react";

import styles from "./index.module.scss";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";

type ItemProps = {
  className?: string,
  isHeader?: boolean,
  checked?: boolean,
  tooltip?: React.Node,
  children: React.Node,
  icon?: React.Node,
  disabled?: boolean,
  onClick?: ?() => void,
  hasSubMenu?: boolean,
  direction?: "left" | "right",
  dataTest?: string,
  style?: { [attr: string]: string | number },
};

const Item = (props: ItemProps) => {
  const {
    className = "",
    isHeader = false,
    checked,
    children,
    icon,
    onClick,
    disabled,
    hasSubMenu,
    direction = "left",
    tooltip,
    dataTest,
    style,
  } = props;
  const classes = cx(styles.item, className, {
    [styles.active]: checked && !disabled,
    [styles.disabled]: disabled,
    disabled,
    [styles.header]: isHeader,
  });

  const item = (
    <div className={classes} onClick={disabled ? noop : onClick} data-test={dataTest} style={style}>
      {hasSubMenu && direction === "left" && <ChevronLeftIcon className={styles.submenuIconLeft} />}
      {icon && (
        <span className={styles.icon}>
          <Icon>{icon}</Icon>
        </span>
      )}
      <div style={{ flex: "1 1 auto" }}>{children}</div>
      {hasSubMenu && direction === "right" && <ChevronRightIcon className={styles.submenuIconRight} />}
    </div>
  );

  if (tooltip) {
    return <Tooltip contents={tooltip}>{item}</Tooltip>;
  }
  return item;
};

Item.displayName = "Menu.Item";
Item.isMenuItem = true;

export default Item;
