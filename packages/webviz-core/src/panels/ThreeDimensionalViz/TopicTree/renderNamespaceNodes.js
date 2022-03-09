// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback, useContext, useMemo } from "react";

import NamespaceMenu from "./NamespaceMenu";
import NodeName from "./NodeName";
import { TooltipRow, TooltipTable, type TreeUINode } from "./renderTreeNodes";
import { SToggles, STreeNodeRow, SLeft, SRightActions } from "./TreeNodeRow";
import type {
  GetIsTreeNodeVisibleInTree,
  OnNamespaceOverrideColorChange,
  SetEditingNamespace,
  TreeTopicNode,
} from "./types";
import VisibilityToggle from "./VisibilityToggle";
import { ThreeDimensionalVizContext } from "webviz-core/src/panels/ThreeDimensionalViz/ThreeDimensionalVizContext";
import { useTopicTreeActions } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/useTopicTree";
import { $WEBVIZ_SOURCE_2, $TF } from "webviz-core/src/util/globalConstants";
import { joinTopics } from "webviz-core/src/util/topicUtils";

export type NamespaceNode = {|
  availableByColumn: boolean[],
  checkedByColumn: boolean[],
  featureKey: string,
  hasNamespaceOverrideColorChangedByColumn: boolean[],
  key: string,
  namespace: string,
  overrideColorByColumn: ?((?string)[]),
  visibleInSceneByColumn: boolean[],
|};

type Props = {|
  children: NamespaceNode[],
  filterText: string,
  getIsTreeNodeVisibleInTree: GetIsTreeNodeVisibleInTree,
  hasFeatureColumn: boolean,
  onNamespaceOverrideColorChange: OnNamespaceOverrideColorChange,
  setEditingNamespace: SetEditingNamespace,
  topicNode: TreeTopicNode,
  diffModeEnabled: boolean,
|};

function NamespaceNodeRow({
  nodeKey,
  featureKey,
  hasNamespaceOverrideColorChangedByColumn,
  namespace,
  checkedByColumn,
  availableByColumn,
  overrideColorByColumn,
  visibleInSceneByColumn,
  filterText,
  topicNodeAvailable,
  unavailableTooltip,
  hasFeatureColumn,
  topicName,
  onNamespaceOverrideColorChange,
  setEditingNamespace,
  diffModeEnabled,
}: {
  nodeKey: string,
  featureKey: string,
  hasNamespaceOverrideColorChangedByColumn: boolean[],
  namespace: string,
  availableByColumn: boolean[],
  checkedByColumn: boolean[],
  overrideColorByColumn: ?((?string)[]),
  visibleInSceneByColumn: boolean[],
  filterText: string,
  topicNodeAvailable: boolean,
  setEditingNamespace: SetEditingNamespace,
  unavailableTooltip: string,
  hasFeatureColumn: boolean,
  topicName: string,
  diffModeEnabled: boolean,
  onNamespaceOverrideColorChange: OnNamespaceOverrideColorChange,
}) {
  const nodeVisibleInScene = !!(visibleInSceneByColumn[0] || visibleInSceneByColumn[1]);

  const { setHoveredMarkerMatchers } = useContext(ThreeDimensionalVizContext);
  const { toggleCheckAllAncestors, toggleNamespaceChecked } = useTopicTreeActions();

  const updateHoveredMarkerMatchers = useCallback((columnIndex, visible) => {
    if (visible) {
      const topic = [topicName, joinTopics($WEBVIZ_SOURCE_2, topicName)][columnIndex];
      setHoveredMarkerMatchers([{ topic, checks: [{ markerKeyPath: ["ns"], value: namespace }] }]);
    }
  }, [namespace, setHoveredMarkerMatchers, topicName]);

  const onMouseLeave = useCallback(() => setHoveredMarkerMatchers([]), [setHoveredMarkerMatchers]);
  const mouseEventHandlersByColumnIdx = useMemo(() => {
    return new Array(2).fill().map((topic, columnIndex) => ({
      onMouseEnter: () => updateHoveredMarkerMatchers(columnIndex, true),
      onMouseLeave,
    }));
  }, [updateHoveredMarkerMatchers, onMouseLeave]);

  const onToggle = useCallback((columnIndex) => {
    toggleNamespaceChecked({ topicName, namespace, columnIndex });
    updateHoveredMarkerMatchers(columnIndex, !visibleInSceneByColumn[columnIndex]);
  }, [toggleNamespaceChecked, topicName, namespace, updateHoveredMarkerMatchers, visibleInSceneByColumn]);
  const onAltToggle = useCallback((columnIndex) => {
    toggleCheckAllAncestors(nodeKey, columnIndex, topicName);
    updateHoveredMarkerMatchers(columnIndex, !visibleInSceneByColumn[columnIndex]);
  }, [toggleCheckAllAncestors, nodeKey, topicName, updateHoveredMarkerMatchers, visibleInSceneByColumn]);

  return (
    <STreeNodeRow visibleInScene={nodeVisibleInScene}>
      <SLeft data-test={`ns~${namespace}`}>
        <NodeName
          displayName={namespace}
          topicName={""}
          tooltips={[
            <TooltipRow key={namespace}>
              <TooltipTable>
                <tbody>
                  <tr>
                    <th>Namespace:</th>
                    <td>
                      <tt>{namespace}</tt>
                    </td>
                  </tr>
                </tbody>
              </TooltipTable>
            </TooltipRow>,
          ]}
          searchText={filterText}
        />
      </SLeft>
      <SRightActions>
        <SToggles>
          {availableByColumn.map((available, columnIndex) => (
            <VisibilityToggle
              // Some namespaces are statically available. But we want to make sure the parent topic is also available
              // before showing it as available.
              available={topicNodeAvailable && available}
              checked={checkedByColumn[columnIndex]}
              dataTest={`visibility-toggle~${nodeKey}~column${columnIndex}`}
              key={columnIndex}
              onAltToggle={() => onAltToggle(columnIndex)}
              onToggle={() => onToggle(columnIndex)}
              overrideColor={overrideColorByColumn && overrideColorByColumn[columnIndex]}
              size="SMALL"
              unavailableTooltip={unavailableTooltip}
              visibleInScene={!!visibleInSceneByColumn[columnIndex]}
              {...mouseEventHandlersByColumnIdx[columnIndex]}
              diffModeEnabled={diffModeEnabled}
              columnIndex={columnIndex}
            />
          ))}
        </SToggles>
        <NamespaceMenu
          disableBaseColumn={!availableByColumn[0]}
          disableFeatureColumn={!availableByColumn[1]}
          featureKey={featureKey}
          hasFeatureColumn={hasFeatureColumn && availableByColumn[1]}
          hasNamespaceOverrideColorChangedByColumn={hasNamespaceOverrideColorChangedByColumn}
          namespace={namespace}
          nodeKey={nodeKey}
          onNamespaceOverrideColorChange={onNamespaceOverrideColorChange}
          overrideColorByColumn={overrideColorByColumn}
          providerAvailable={topicNodeAvailable}
          setEditingNamespace={setEditingNamespace}
          topicName={topicName}
        />
      </SRightActions>
    </STreeNodeRow>
  );
}

// Must use function instead of React component as Tree/TreeNode can only accept TreeNode as children.
export default function renderNamespaceNodes({
  children,
  filterText,
  getIsTreeNodeVisibleInTree,
  hasFeatureColumn,
  onNamespaceOverrideColorChange,
  setEditingNamespace,
  topicNode,
  diffModeEnabled,
}: Props): TreeUINode[] {
  const topicNodeAvailable = topicNode.availableByColumn[0] || topicNode.availableByColumn[1];

  // TODO(Audrey): remove the special tooltip once we add 2nd bag support for map and tf namespaces.
  const unavailableTooltip =
    topicNode.topicName === $TF || topicNode.topicName === "/metadata" ? "Unsupported" : "Unavailable";

  const commonRowProps = {
    filterText,
    topicNodeAvailable,
    onNamespaceOverrideColorChange,
    setEditingNamespace,
    unavailableTooltip,
    hasFeatureColumn,
    topicName: topicNode.topicName,
    diffModeEnabled,
  };

  return children
    .filter(({ key }) => getIsTreeNodeVisibleInTree(key))
    .map(
      ({
        key,
        featureKey,
        hasNamespaceOverrideColorChangedByColumn,
        namespace,
        checkedByColumn,
        availableByColumn,
        overrideColorByColumn,
        visibleInSceneByColumn,
      }) => {
        const title = (
          <NamespaceNodeRow
            {...{
              featureKey,
              hasNamespaceOverrideColorChangedByColumn,
              namespace,
              checkedByColumn,
              availableByColumn,
              overrideColorByColumn,
              visibleInSceneByColumn,
              nodeKey: key,
              ...commonRowProps,
            }}
          />
        );
        return { key, title };
      }
    );
}
