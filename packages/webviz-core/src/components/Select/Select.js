// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import classnames from "classnames";
import * as React from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

import styles from "./Select.module.scss";
import Icon from "webviz-core/src/components/Icon";
import colors from "webviz-core/src/styles/colors";

const cx = classnames.bind(styles);

const SEmpty = styled.div`
  padding: 8px 12px;
  color: ${colors.textMuted};
  font-style: italic;
`;

type Props = {|
  children: React.Node,
  // specify text specifically if the value is not a string
  text?: ?string,
  value: any,
  icon: React.Node,
  onChange: (value: any) => void,
  fromBelow?: boolean,
  disabled?: boolean,
  dataTestId?: string,
|};

type State = {
  isOpen: boolean,
};

export default class Select extends React.Component<Props, State> {
  static defaultProps = {
    icon: <MenuDownIcon />,
  };

  el: ?HTMLDivElement;

  state = {
    isOpen: false,
  };

  close = () => {
    this.setState({ isOpen: false });
    window.removeEventListener("click", this.close);
  };

  open = (e: SyntheticEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (this.props.disabled) {
      return;
    }

    this.setState({ isOpen: true });
    // let this event hit the window before adding close listener
    setImmediate(() => {
      window.addEventListener("click", this.close);
    });
  };

  renderOpen() {
    const { value, children, onChange } = this.props;
    const mappedChildren = React.Children.map(children, (child) => {
      // if the child does not have a value prop, just return it
      // e.g. <hr />
      if (!child.props.value) {
        return child;
      }
      const onClick = (e: SyntheticEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
        if (child.props.disabled) {
          return;
        }
        const childValue = child.props.value;
        // don't allow <hr /> clicks to close
        if (!childValue) {
          return;
        }
        this.close();
        onChange(child.props.value);
      };
      const active = value === child.props.value;
      return React.cloneElement(child, { onClick, active });
    });
    const { body } = document;
    const { el } = this;
    // satisfy flow
    if (!body || !el) {
      return;
    }
    const box = el.getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();

    const style = {
      top: undefined,
      bottom: undefined,
      left: box.left,
      width: box.width,
    };

    if (this.props.fromBelow) {
      style.bottom = bodyBox.bottom - box.bottom;
    } else {
      style.top = box.top;
    }

    return createPortal(
      <div style={style} className={styles.menu}>
        {mappedChildren && mappedChildren.length ? mappedChildren : <SEmpty>No options available</SEmpty>}
      </div>,
      body
    );
  }

  render() {
    const { isOpen } = this.state;
    const { fromBelow, text, value, icon, dataTestId, disabled } = this.props;

    return (
      <div ref={(el) => (this.el = el)} className={styles.container} onClick={this.open} data-testid={dataTestId}>
        <div className={cx([styles.select, { [styles.fromBelow]: fromBelow }, { [styles.disabled]: disabled }])}>
          <span className={styles.value}>{text || value}</span>
          <span className={styles.icon}>
            <Icon clickable={!disabled}>{icon}</Icon>
          </span>
        </div>
        {isOpen && this.renderOpen()}
      </div>
    );
  }
}
