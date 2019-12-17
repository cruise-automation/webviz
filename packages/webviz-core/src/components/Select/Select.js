// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import * as React from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

import styles from "./Select.module.scss";
import Icon from "webviz-core/src/components/Icon";
import colors from "webviz-core/src/styles/colors.module.scss";

const SEmpty = styled.div`
  padding: 8px 12px;
  color: ${colors.textMuted};
  font-style: italic;
`;

type Props = {
  children: React.Node,
  // specify text specifically if the value is not a string
  text?: ?string,
  value: any,
  icon: React.Node,
  onChange: (value: any) => void,
};

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
    const style = {
      top: box.top,
      left: box.left,
      width: box.width,
    };
    return createPortal(
      <div style={style} className={styles.menu}>
        {mappedChildren && mappedChildren.length ? mappedChildren : <SEmpty>No options available</SEmpty>}
      </div>,
      body
    );
  }

  render() {
    const { isOpen } = this.state;
    const { text, value, icon } = this.props;
    return (
      <div ref={(el) => (this.el = el)} className={styles.container} onClick={this.open}>
        <div className={styles.select}>
          <span className={styles.value}>{text || value}</span>
          <span className={styles.icon}>
            <Icon>{icon}</Icon>
          </span>
        </div>
        {isOpen && this.renderOpen()}
      </div>
    );
  }
}
