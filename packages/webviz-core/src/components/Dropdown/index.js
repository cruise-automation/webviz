// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import cx from "classnames";
import * as React from "react";

import ChildToggle from "../ChildToggle";
import Icon from "../Icon";
import Menu, { Item } from "../Menu";
import styles from "./index.module.scss";
import Tooltip from "webviz-core/src/components/Tooltip";

type Props = {|
  children?: React.Node,
  value?: any,
  text?: React.Node,
  position: "above" | "below" | "left" | "right",
  disabled?: boolean,
  closeOnChange?: boolean,
  onChange?: (value: any) => void,
  toggleComponent?: React$Element<any>,
  flatEdges: boolean,
  tooltip?: string,
  dataTest?: string,
  noPortal?: boolean,
  btnStyle?: StyleObj,
|};

type State = {
  isOpen: boolean,
};

export default class Dropdown extends React.Component<Props, State> {
  state = { isOpen: false };
  toggle = () => {
    if (!this.props.disabled) {
      this.setState({ isOpen: !this.state.isOpen });
    }
  };

  static defaultProps = {
    flatEdges: true,
    closeOnChange: true,
    position: "below",
  };

  onClick = (value: any) => {
    const { onChange, closeOnChange } = this.props;
    if (onChange) {
      if (closeOnChange) {
        this.setState({ isOpen: false });
      }
      onChange(value);
    }
  };

  renderItem(child: React$Element<any>) {
    const { value } = this.props;
    const checked = Array.isArray(value) ? value.includes(child.props.value) : child.props.value === value;
    const onClick = () => this.onClick(child.props.value);
    if (child.type.isMenuItem === true) {
      return React.cloneElement(child, { checked, onClick });
    }
    return (
      <Item checked={checked} onClick={onClick}>
        {child}
      </Item>
    );
  }

  renderChildren() {
    const { children } = this.props;
    return React.Children.map(children, (child, i) => {
      if (child == null) {
        return null;
      }
      const inner = child.props.value != null ? this.renderItem(child) : child;
      return <span key={i}>{inner}</span>;
    });
  }

  renderButton(): React$Element<any> {
    if (this.props.toggleComponent) {
      return this.props.toggleComponent;
    }
    const { text, value, disabled, tooltip } = this.props;
    const button = (
      <button
        className={cx(styles.button, { disabled })}
        style={this.props.btnStyle || {}}
        data-test={this.props.dataTest}>
        <span className={styles.title}>{text || value}</span>
        <Icon style={{ marginLeft: 4 }}>
          <MenuDownIcon style={{ width: 14, height: 14, opacity: 0.5 }} />
        </Icon>
      </button>
    );
    if (tooltip && !this.state.isOpen) {
      // The tooltip often occludes the first item of the open menu.
      return <Tooltip contents={tooltip}>{button}</Tooltip>;
    }
    return button;
  }

  render() {
    const { isOpen } = this.state;
    const { position, flatEdges } = this.props;
    const style = {
      borderTopLeftRadius: flatEdges && position !== "above" ? "0" : undefined,
      borderTopRightRadius: flatEdges && position !== "above" ? "0" : undefined,
      borderBottomLeftRadius: flatEdges && position === "above" ? "0" : undefined,
      borderBottomRightRadius: flatEdges && position === "above" ? "0" : undefined,
    };
    return (
      <ChildToggle
        style={{ maxWidth: "100%", zIndex: 0 }}
        position={position}
        isOpen={isOpen}
        onToggle={this.toggle}
        dataTest={this.props.dataTest}
        noPortal={this.props.noPortal}>
        {this.renderButton()}
        <Menu style={style}>{this.renderChildren()}</Menu>
      </ChildToggle>
    );
  }
}
