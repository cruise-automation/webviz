// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import * as React from "react";

import styles from "./icon.module.scss";
import Tooltip from "webviz-core/src/components/Tooltip";

type Props = {
  children: React.Node,
  xlarge?: boolean,
  large?: boolean,
  medium?: boolean,
  small?: boolean,
  xsmall?: boolean,
  xxsmall?: boolean,
  active?: boolean,
  fade?: boolean,
  onClick?: ?(e: SyntheticMouseEvent<HTMLElement>) => void,
  clickable?: boolean,
  className?: string,
  style?: { [string]: any },
  tooltip?: React.Node,
  tooltipProps?: $Shape<{ ...React.ElementConfig<typeof Tooltip> }>,
  dataTest?: string,
};

const Icon = (props: Props) => {
  const {
    children,
    xlarge,
    large,
    medium,
    small,
    xsmall,
    xxsmall,
    onClick,
    clickable,
    active,
    fade,
    className,
    style,
    tooltip,
    tooltipProps,
    dataTest,
  } = props;
  const classNames = cx("icon", styles.icon, className, {
    [styles.fade]: fade,
    [styles.clickable]: !!onClick || clickable == null || clickable,
    [styles.active]: active,
    [styles.xlarge]: xlarge,
    [styles.large]: large,
    [styles.medium]: medium,
    [styles.small]: small,
    [styles.xsmall]: xsmall,
    [styles.xxsmall]: xxsmall,
  });

  // if we have a click handler
  // cancel the bubbling on the event and process it
  // in our click handler callback; otherwise, let it bubble
  const clickHandler = (e) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }
  };

  return (
    <Tooltip contents={tooltip || null} {...tooltipProps}>
      <span className={classNames} onClick={clickHandler} style={style} data-test={dataTest}>
        {children}
      </span>
    </Tooltip>
  );
};

Icon.displayName = "Icon";

export const WrappedIcon = (props: Props) => {
  return (
    <Icon
      {...props}
      style={{ display: "block", padding: "10px", minHeight: "40px", minWidth: "40px", ...props.style }}
      className={styles.wrappedIcon}
    />
  );
};

WrappedIcon.displayName = "Icon";

export default Icon;
