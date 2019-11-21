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
import ChevronDownIcon from "@mdi/svg/svg/chevron-down.svg";
import ChevronRightIcon from "@mdi/svg/svg/chevron-right.svg";
import EyeOffOutlineIcon from "@mdi/svg/svg/eye-off-outline.svg";
import EyeOutlineIcon from "@mdi/svg/svg/eye-outline.svg";
import FolderIcon from "@mdi/svg/svg/folder.svg";
import LeadPencilIcon from "@mdi/svg/svg/lead-pencil.svg";
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
  enableVisibilityToggle?: boolean,
  onToggleExpand: (node: Node) => void,
  onToggleVisibility?: (node: Node) => void,
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

  onToggleVisibility = (e: SyntheticEvent<HTMLElement>) => {
    const { onToggleVisibility, node } = this.props;
    if (onToggleVisibility) {
      // stop propagation so it does not trigger expanding/collapsing topics with namespaces
      e.stopPropagation();
      onToggleVisibility(node);
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
    const {
      depth,
      enableVisibilityToggle,
      node,
      onEditClick,
      onToggleCheck,
      onToggleExpand,
      onToggleVisibility,
    } = this.props;
    if (!node.expanded || !node.children) {
      return null;
    }
    return node.children.map((child) => {
      return (
        <TreeNode
          depth={depth + 1}
          enableVisibilityToggle={enableVisibilityToggle}
          key={child.id}
          node={child}
          onEditClick={onEditClick}
          onToggleCheck={onToggleCheck}
          onToggleExpand={onToggleExpand}
          onToggleVisibility={onToggleVisibility}
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
    const { node, depth, enableVisibilityToggle } = this.props;
    const { expanded, children, icon, disabled, tooltip, canEdit, hasEdit, filtered, visible } = node;
    const headerClasses = cx(styles.header, {
      [styles.hasChildren]: children && children.length,
      [styles.disabled]: disabled,
      [styles.canEdit]: canEdit,
    });

    const indentWidth = parseInt(styles.indentWidth);
    const paddingLeft = parseInt(styles.paddingLeft);
    const style = { paddingLeft: paddingLeft + depth * indentWidth };

    const checkboxClasses = cx(styles.checkbox, {
      [styles.disabled]: disabled,
    });

    const extraIcon = icon && (
      <Icon
        fade
        className={cx(styles.extraIcon, { [styles.disabled]: disabled })}
        style={{ color: hasEdit ? colors.accent : "#666" }}>
        {icon}
      </Icon>
    );

    const editIcon = icon && canEdit && (
      <Icon style={{ padding: 4 }} fade tooltip="Edit topic settings" onClick={this.onEditClick}>
        <LeadPencilIcon />
      </Icon>
    );

    let visibilityIcon = null;
    // only enable visibility toggle for topics
    if (enableVisibilityToggle && node.topic && !node.namespace) {
      visibilityIcon = (
        <Icon
          style={{ padding: 4 }}
          fade
          tooltip={visible ? "Hide topic temporarily" : "Show topic"}
          onClick={this.onToggleVisibility}
          dataTest={`node-${node.topic || node.name}`}>
          {visible ? <EyeOutlineIcon /> : <EyeOffOutlineIcon />}
        </Icon>
      );
    }
    // Wrap in a fragment to avoid missing key warnings
    const tooltipContents =
      !tooltip || tooltip.length === 0 ? null : React.createElement(React.Fragment, {}, ...tooltip);

    return (
      <div style={filtered ? { display: "none" } : {}}>
        <div style={style} className={headerClasses} onClick={this.onExpandClick}>
          <Icon className={checkboxClasses} onClick={this.onCheckboxClick}>
            {this.getCheckboxIcon()}
          </Icon>
          {extraIcon}
          <span className={cx("node-text", styles.text)}>
            <Tooltip contents={tooltipContents} offset={{ x: 0, y: 8 }}>
              <span>{node.text}</span>
            </Tooltip>
          </span>
          {visibilityIcon}
          {editIcon}
          <Icon
            className={cx(styles["expand-icon"], {
              [styles.invisible]: !children || !children.length,
            })}
            style={{ left: paddingLeft + depth * indentWidth - 16 }}>
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </Icon>
        </div>
        <div className={styles.children}>{this.renderChildren()}</div>
      </div>
    );
  }
}
