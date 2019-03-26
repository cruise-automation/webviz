// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ArrowCollapseIcon from "@mdi/svg/svg/arrow-collapse.svg";
import cx from "classnames";
import * as React from "react";

import styles from "./ExpandingToolbar.module.scss";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";

// eslint-disable-next-line react/no-unused-prop-types
export class ToolGroup extends React.Component<{ name: string, children: React.Node }> {
  render() {
    return this.props.children;
  }
}

type Props = {|
  icon: React.Node,
  children: React.ChildrenArray<React.Element<typeof ToolGroup>>,
  onExpand?: ?(expanded: boolean) => void,
  className?: ?string,
  tooltip: string,
  selectedTab?: string,
  expanded?: boolean,
|};

type State = {
  expanded: boolean,
  selectedTab?: string,
};

export default class ExpandingToolbar extends React.Component<Props, State> {
  state = {
    expanded: !!this.props.expanded,
    selectedTab: this.props.selectedTab,
  };

  toggleExpanded = () => {
    const { expanded } = this.state;
    const { onExpand } = this.props;
    if (onExpand) {
      onExpand(!expanded);
    }
    this.setState({ expanded: !expanded });
  };

  render() {
    const { expanded, selectedTab } = this.state;
    const { icon, children, className, tooltip } = this.props;
    if (!expanded) {
      return (
        <div className={className}>
          <Button tooltip={tooltip} onClick={this.toggleExpanded}>
            <Icon>{icon}</Icon>
          </Button>
        </div>
      );
    }
    let selectedChild;
    React.Children.forEach(children, (child) => {
      if (!selectedChild || child.props.name === selectedTab) {
        selectedChild = child;
      }
    });
    return (
      <div className={cx(className, styles.expanded)}>
        <Flex row className={styles.tabBar}>
          {React.Children.map(children, (child) => {
            return (
              <Button
                className={cx(styles.tab, { [styles.selected]: child === selectedChild })}
                onClick={() => this.setState({ selectedTab: child.props.name })}>
                {child.props.name}
              </Button>
            );
          })}
          <div className={styles.spaceSeparator} />
          <Button onClick={this.toggleExpanded}>
            <Icon>
              <ArrowCollapseIcon />
            </Icon>
          </Button>
        </Flex>
        <div className={styles.tabBody}>{selectedChild}</div>
      </div>
    );
  }
}
