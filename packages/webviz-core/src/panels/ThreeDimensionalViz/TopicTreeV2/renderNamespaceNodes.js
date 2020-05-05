// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Tree } from "antd";
import xor from "lodash/xor";
import React, { type Node } from "react";

import NodeName from "./NodeName";
import { SToggles, STreeNodeRow, SLeft, SRightActions } from "./TreeNodeRow";
import VisibilityToggle, { TOGGLE_SIZE_CONFIG } from "./VisibilityToggle";

const LEFT_SPACING = 12;

export type NamespaceNode = {|
  checked: boolean,
  key: string,
  namespace: string,
|};

type Props = {|
  checkedKeysSet: Set<string>,
  children: NamespaceNode[],
  saveConfig: (any) => void,
  topicName: string,
  width: number,
|};

// Must use function instead of React component as Tree/TreeNode can only accept TreeNode as children.
export default function renderNamespaceNodes({
  checkedKeysSet,
  children,
  saveConfig,
  topicName,
  width,
}: Props): ?(Node[]) {
  return children.map(({ key, namespace, checked }) => {
    return (
      <Tree.TreeNode
        key={key}
        title={
          <STreeNodeRow style={{ width: width - LEFT_SPACING, marginLeft: "-12px", padding: 0 }}>
            <SLeft>
              <NodeName
                style={{ marginLeft: 8 }}
                displayName={namespace}
                nodeKey={key}
                topicName={""}
                searchText={""}
              />
            </SLeft>
            <SRightActions>
              <SToggles>
                <VisibilityToggle
                  checked={checked}
                  onToggle={() => {
                    saveConfig({ checkedNodes: xor(Array.from(checkedKeysSet), [key]) });
                  }}
                  size={TOGGLE_SIZE_CONFIG.SMALL.name}
                  visible // TODO(Audrey): handle actual visibility.
                />
              </SToggles>
            </SRightActions>
          </STreeNodeRow>
        }
      />
    );
  });
}
