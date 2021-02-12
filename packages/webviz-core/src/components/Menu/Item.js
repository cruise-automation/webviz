// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckCircleIcon from "@mdi/svg/svg/check-circle.svg";
import CheckIcon from "@mdi/svg/svg/check.svg";
import ChevronLeftIcon from "@mdi/svg/svg/chevron-left.svg";
import ChevronRightIcon from "@mdi/svg/svg/chevron-right.svg";
import cx from "classnames";
import { noop } from "lodash";
import * as React from "react";
import styled from "styled-components";

import styles from "./index.module.scss";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";

const SContentWrapper = styled.div`
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  // need this for text truncation https://css-tricks.com/flexbox-truncated-text/
  min-width: 0px;
`;

type ItemProps = {
  className?: string,
  isHeader?: boolean,
  checked?: boolean,
  highlighted?: boolean,
  tooltip?: React.Node,
  children: React.Node,
  icon?: React.Node,
  iconSize?: "xxsmall" | "xsmall" | "small" | "medium" | "large" | "xlarge",
  isDropdown?: boolean,
  disabled?: boolean,
  onClick?: ?() => void,
  hasSubMenu?: boolean,
  direction?: "left" | "right",
  dataTest?: string,
  style?: { [attr: string]: string | number },
  hoverForScreenshots?: boolean,
};

const Item = (props: ItemProps) => {
  const {
    className = "",
    isHeader = false,
    checked,
    highlighted,
    children,
    icon,
    iconSize,
    isDropdown,
    onClick,
    disabled,
    hasSubMenu,
    direction = "left",
    tooltip,
    dataTest,
    style,
    hoverForScreenshots,
  } = props;
  const classes = cx(styles.item, className, {
    [styles.active]: highlighted && !disabled,
    [styles.disabled]: disabled,
    disabled,
    [styles.header]: isHeader,
    [styles.hoverForScreenshot]: hoverForScreenshots,
  });

  const item = (
    <div className={classes} onClick={disabled ? noop : onClick} data-test={dataTest} style={style}>
      {hasSubMenu && direction === "left" && <ChevronLeftIcon className={styles.submenuIconLeft} />}
      {icon && (
        <span className={styles.icon}>
          <Icon {...{ [iconSize || "small"]: true }}>{icon}</Icon>
        </span>
      )}
      <SContentWrapper>
        {children}
        {checked && !isDropdown && (
          <Icon {...{ [iconSize || "small"]: true }} style={{ marginLeft: "5px" }}>
            <CheckCircleIcon />
          </Icon>
        )}
      </SContentWrapper>
      {hasSubMenu && direction === "right" && <ChevronRightIcon className={styles.submenuIconRight} />}
      {checked && isDropdown && (
        <Icon {...{ [iconSize || "small"]: true }}>
          <CheckIcon />
        </Icon>
      )}
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
