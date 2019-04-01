// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { PureComponent } from "react";

import type { Node } from "./Node";
import TreeNode from "./TreeNode";

// export the node flow type
export type { Node } from "./Node";

type Props = {
  root: Node,
  hideRoot?: boolean,
  onToggleExpand: (node: Node) => void,
  onToggleCheck: (node: Node) => void,
  onEditClick: (e: SyntheticMouseEvent<HTMLElement>, node: Node) => void,
};

export default class Tree extends PureComponent<Props> {
  // make onEditClick optional. A no-op if not supplied
  static defaultProps = {
    onEditClick: () => {},
  };

  renderNode = (node: Node) => {
    const { onToggleExpand, onToggleCheck, onEditClick } = this.props;
    return (
      <TreeNode
        key={node.id}
        depth={0}
        onToggleExpand={onToggleExpand}
        onToggleCheck={onToggleCheck}
        onEditClick={onEditClick}
        node={node}
      />
    );
  };
  render() {
    const { root, hideRoot } = this.props;
    const children = root.children || [];
    if (hideRoot && !children.filter((treeNode: Node) => treeNode.visible).length) {
      return <div style={{ padding: "8px 12px", color: "#666" }}>None</div>;
    }
    return hideRoot ? children.map(this.renderNode) : this.renderNode(root);
  }
}
