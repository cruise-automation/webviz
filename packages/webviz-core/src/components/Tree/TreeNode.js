// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import BlockHelperIcon from "@mdi/svg/svg/block-helper.svg";
import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxBlankIcon from "@mdi/svg/svg/checkbox-blank.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import FolderIcon from "@mdi/svg/svg/folder.svg";
import LeadPencilIcon from "@mdi/svg/svg/lead-pencil.svg";
import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import MenuUpIcon from "@mdi/svg/svg/menu-up.svg";
import cx from "classnames";
import React, { Component } from "react";

import styles from "./index.module.scss";
import type { Node } from "./Node";
import Icon from "webviz-core/src/components/Icon";
import Tooltip from "webviz-core/src/components/Tooltip";
import colors from "webviz-core/src/styles/colors.module.scss";

type Props = {
  node: Node,
  depth: number,
  onToggleExpand: (node: Node) => void,
  onToggleCheck: (node: Node) => void,
  onEditClick: (e: SyntheticMouseEvent<HTMLElement>, node: Node) => void,
};

export default class TreeNode extends Component<Props> {
  onCheckboxClick = () => {
    const { onToggleCheck, node } = this.props;
    if (!node.disabled && node.hasCheckbox) {
      onToggleCheck(node);
    }
  };

  onExpandClick = (e: SyntheticEvent<HTMLElement>) => {
    const { onToggleExpand, node } = this.props;
    // if the node has no children, have the entire container be a hitbox for toggling checked
    if (node.children && node.children.length) {
      onToggleExpand(node);
    } else {
      this.onCheckboxClick();
    }
  };

  renderChildren() {
    const { node, onToggleCheck, onToggleExpand, onEditClick, depth } = this.props;
    if (!node.expanded || !node.children) {
      return null;
    }
    return node.children.map((child) => {
      return (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          onToggleCheck={onToggleCheck}
          onToggleExpand={onToggleExpand}
          onEditClick={onEditClick}
        />
      );
    });
  }

  getCheckboxIcon() {
    const { checked, disabled, missing, hasCheckbox, children } = this.props.node;
    if (!hasCheckbox) {
      return children && children.length && <FolderIcon />;
    }
    if (missing) {
      return <BlockHelperIcon className={styles.blockHelperIcon} />;
    }
    if (checked) {
      return disabled ? <CheckboxBlankIcon /> : <CheckboxMarkedIcon />;
    }
    return <CheckboxBlankOutlineIcon />;
  }

  onEditClick = (e: SyntheticMouseEvent<HTMLElement>) => {
    const { onEditClick, node } = this.props;
    if (!node.canEdit) {
      return;
    }
    e.stopPropagation();
    onEditClick(e, node);
  };

  render() {
    const { node, depth } = this.props;
    const { expanded, children, icon, disabled, tooltip, filterMatch, canEdit, hasEdit } = node;

    const expandClasses = cx(styles["expand-icon"], {
      [styles.invisible]: !children || !children.length,
    });

    const headerClasses = cx(styles.header, {
      [styles.hasChildren]: children && children.length,
      [styles.disabled]: disabled,
      [styles.filterMatch]: filterMatch,
      [styles.canEdit]: canEdit,
    });

    const indentWidth = parseInt(styles.indentWidth);
    const paddingLeft = parseInt(styles.paddingLeft);
    const style = { paddingLeft: paddingLeft + depth * indentWidth };

    const checkboxClasses = cx(styles.checkbox);

    const extraIcon = icon ? (
      <span onClick={this.onEditClick}>
        <Icon className={styles["type-icon"]} style={{ color: hasEdit ? colors.accent : "white" }}>
          {icon}
        </Icon>
        <Icon className={styles["type-icon-edit"]}>
          <LeadPencilIcon />
        </Icon>
      </span>
    ) : null;

    // Wrap in a fragment to avoid missing key warnings
    const tooltipContents =
      !tooltip || tooltip.length === 0 ? null : React.createElement(React.Fragment, {}, ...tooltip);

    return (
      <div style={{ display: node.visible ? "" : "none" }}>
        <div style={style} className={headerClasses} onClick={this.onExpandClick}>
          <Icon className={checkboxClasses} onClick={this.onCheckboxClick}>
            {this.getCheckboxIcon()}
          </Icon>
          <span className={styles.text}>
            <Tooltip contents={tooltipContents} offset={{ x: 0, y: 8 }}>
              <span>{node.text}</span>
            </Tooltip>
          </span>
          {extraIcon}
          <Icon className={expandClasses}>{expanded ? <MenuUpIcon /> : <MenuDownIcon />}</Icon>
        </div>
        <div className={styles.children}>{this.renderChildren()}</div>
      </div>
    );
  }
}
