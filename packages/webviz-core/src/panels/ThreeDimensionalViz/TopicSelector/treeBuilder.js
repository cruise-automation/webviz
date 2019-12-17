// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import BlurIcon from "@mdi/svg/svg/blur.svg";
import CarIcon from "@mdi/svg/svg/car.svg";
import GridIcon from "@mdi/svg/svg/grid.svg";
import HexagonMultipleIcon from "@mdi/svg/svg/hexagon-multiple.svg";
import HexagonIcon from "@mdi/svg/svg/hexagon.svg";
import PentagonOutlineIcon from "@mdi/svg/svg/pentagon-outline.svg";
import RadarIcon from "@mdi/svg/svg/radar.svg";
import { find } from "lodash";
import * as React from "react";
import styled from "styled-components";

import { type TopicConfig } from "./topicTree";
import filterMap from "webviz-core/src/filterMap";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import {
  type TopicDisplayMode,
  TOPIC_DISPLAY_MODES,
} from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelector/TopicDisplayModeSelector";
import type { Transform } from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { Topic } from "webviz-core/src/players/types";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { Namespace } from "webviz-core/src/types/Messages";
import { POINT_CLOUD_DATATYPE, POSE_STAMPED_DATATYPE } from "webviz-core/src/util/globalConstants";
import naturalSort from "webviz-core/src/util/naturalSort";

type Props = {
  // list of all topics available in the current bag
  topics: Topic[],
  namespaces: Namespace[],
  transforms: Array<Transform>,
  checkedNodes: string[],
  expandedNodes: string[],
  modifiedNamespaceTopics: string[],
  filterText?: ?string,
  editedTopics?: string[],
  canEditDatatype?: ?(string) => boolean,
  topicConfig: TopicConfig,
  topicDisplayMode: TopicDisplayMode,
};

type UpdateTreeProps = {
  topics: Topic[],
  checkedNodes: string[],
  expandedNodes: string[],
  modifiedNamespaceTopics: string[],
  filterText?: ?string,
  editedTopics?: string[],
  canEditDatatype?: ?(string) => boolean,
};

const icons = {
  "visualization_msgs/Marker": <HexagonIcon />,
  "visualization_msgs/MarkerArray": <HexagonMultipleIcon />,
  "nav_msgs/OccupancyGrid": <GridIcon />,
  "sensor_msgs/LaserScan": <RadarIcon />,
  "geometry_msgs/PolygonStamped": <PentagonOutlineIcon />,
  [POINT_CLOUD_DATATYPE]: <BlurIcon />,
  [POSE_STAMPED_DATATYPE]: <CarIcon />,
};

type Selections = {|
  topics: string[],
  namespaces: Namespace[],
  extensions: string[],
|};

// ids for namespace nodes are the topic name, namespace name
// and an 'ns' string to make sure they don't collide in any way with topic names
// they're meant to be opaque and the data within them not parsed or read back out
export function getId(namespace: Namespace) {
  return `ns:${namespace.topic}:${namespace.name}`;
}

const TooltipRow = styled.div`
  margin: 4px 0;
  &:first-child {
    margin-top: 0;
  }
  &:last-child {
    margin-bottom: 0;
  }
`;
const TooltipDescription = styled(TooltipRow)`
  line-height: 1.3;
  max-width: 300px;
`;
const TooltipTable = styled.table`
  th,
  td {
    border: none;
    padding: 0;
  }
  td {
    word-break: break-word;
  }
  max-width: 100%;
  th {
    color: ${colors.textMuted};
  }
`;

export class TopicTreeNode {
  id: string;
  text: string;
  name: ?string;
  icon: ?React.Node;
  expanded: boolean;
  missing: boolean;
  tooltip: React.Node[] = [];
  description: ?string;
  checked: boolean;
  hasCheckbox: boolean;
  disabled: boolean = false;
  children: TopicTreeNode[] = [];
  canEdit: boolean = false;
  hasEdit: boolean = false;
  // whether this node or any descendants match the filter
  descendantFilterMatch: boolean = false;
  // whether the node has been filtered out during search
  filtered: boolean = false;
  // all nodes are visible by default
  // only in flat list mode, visible can be false if hiddenTopics contain the topic node
  visible: boolean = true;
  // true if this node or all descendent nodes are missing from
  // the available topics in a bag
  missing: boolean = false;
  topic: ?string;
  namespace: ?string;
  extension: ?string;
  // outdated ids under which the node might have been checked/expanded
  legacyIds: string[];

  // create a topic node from a json config file node
  static fromJson(config: TopicConfig, topics: Topic[]) {
    const result = new TopicTreeNode(config);
    // extension nodes start as enabled-by-default for now
    if (!config.extension) {
      result.disabled = true;
    }
    if (config.children) {
      const childTopics = Array.isArray(config.children)
        ? config.children
        : topics.filter(config.children).map((topic) => ({ topic: topic.name }));
      childTopics.forEach((child) => result.add(TopicTreeNode.fromJson(child, topics)));
    }
    return result;
  }

  constructor(
    { isSyntheticGroup, name, icon, legacyIds, description, checked, topic, extension }: TopicConfig,
    namespace: ?string
  ) {
    this.text = name || "";
    this.icon = icon;
    this.legacyIds = legacyIds || [];
    this.description = description;
    if (checked) {
      this.checked = true;
      this.hasCheckbox = true;
    }
    this.hasCheckbox = !isSyntheticGroup;

    if (topic) {
      if (namespace) {
        this.namespace = namespace;
        this.id = `ns:${topic}:${namespace}`;
      } else {
        this.legacyIds.push(topic);
        this.id = `t:${topic}`;
      }
      this.text = name || topic;
      this.topic = topic;
    } else if (extension) {
      this.id = `x:${extension}`;
      this.extension = extension;
    } else if (name) {
      this.id = `name:${name}`;
    } else {
      throw new Error("encountered TopicTree node with no topic, extension, or name");
    }
    if (!this.legacyIds.includes(this.text)) {
      this.legacyIds.push(this.text);
    }
  }

  // collect namespaces which belong to this topic node
  // and add them as child nodes - namespaces are the topic name and the namespace
  // separated by a slash like "/lidar_points/cars"
  consumeNamespaces(namespaces: Namespace[]): void {
    const { topic } = this;
    // if we're not a topic node, ignore the namespaces
    if (!topic) {
      return;
    }

    const matching = namespaces.filter((ns) => ns.topic === topic);
    matching.sort(naturalSort("name"));
    matching.forEach((ns) => {
      const node = new TopicTreeNode({ name: ns.name, topic }, ns.name);
      this.add(node);
    });
  }

  add(child: TopicTreeNode): void {
    this.children.push(child);
  }

  // recursively search the tree for a node matching the predicate
  find(predicate: (TopicTreeNode) => boolean): ?TopicTreeNode {
    if (predicate(this)) {
      return this;
    }

    for (let i = 0; i < this.children.length; i++) {
      const match = this.children[i].find(predicate);
      if (match) {
        return match;
      }
    }
  }

  // recursively update this node & its children based on the selected/expanded state
  // collects all node ids along the way to check for duplicates
  updateState(props: UpdateTreeProps, disabled: boolean, ids: string[], ancestorFilterMatch: boolean): void {
    const {
      expandedNodes,
      checkedNodes,
      modifiedNamespaceTopics,
      canEditDatatype,
      editedTopics,
      filterText,
      topics,
    } = props;
    // Wrapper to help handle nodes that were checked under an old-style id.
    const containsThisNode = (nodeIds: string[]) => {
      return nodeIds.includes(this.id) || this.legacyIds.some((id) => nodeIds.includes(id));
    };

    this.expanded = containsThisNode(expandedNodes);
    this.checked = !this.hasCheckbox || containsThisNode(checkedNodes);

    // if a topic hasn't had its namespaces modified, check its namespaces by default
    if (this.namespace && !modifiedNamespaceTopics.includes(this.topic)) {
      this.checked = true;
    }

    // check for duplicate ids
    if (ids.indexOf(this.id) > -1) {
      throw new Error(`Two nodes in the tree share the same id: ${this.id}`);
    }
    ids.push(this.id);

    const topicName = this.topic;
    if (topicName) {
      // topic nodes are disabled if they are not in the list of active topics
      const matchingTopic = find(topics, { name: topicName });
      this.missing = !matchingTopic;
      this.disabled = disabled || this.missing;
      this.canEdit = !!matchingTopic && !!canEditDatatype && canEditDatatype(matchingTopic.datatype);
      this.hasEdit = !!editedTopics && editedTopics.indexOf(topicName) > -1;

      if (matchingTopic) {
        this.tooltip.push(
          <TooltipRow>
            <TooltipTable>
              <tbody>
                <tr>
                  <th>Topic:</th>
                  <td>
                    <tt>{matchingTopic.name}</tt>
                  </td>
                </tr>
                <tr>
                  <th>Type:</th>
                  <td>
                    <tt>{matchingTopic.datatype}</tt>
                  </td>
                </tr>
              </tbody>
            </TooltipTable>
          </TooltipRow>
        );
      } else {
        this.tooltip.push(
          <TooltipRow>
            Topic <tt>{topicName}</tt> is not currently available
          </TooltipRow>
        );
      }
    } else {
      this.disabled = disabled;
    }

    if (this.description) {
      this.tooltip.push(<TooltipDescription>{this.description}</TooltipDescription>);
    }

    let filterMatch = filterText ? this.text.toLocaleLowerCase().includes(filterText.toLowerCase()) : false;
    if (!filterMatch && this.topic) {
      filterMatch = filterText ? this.topic.toLocaleLowerCase().includes(filterText.toLowerCase()) : false;
    }

    let missingChildrenCount = 0;
    const childDisabled = this.disabled || !this.checked;
    this.children.forEach((child) => {
      child.updateState(props, childDisabled, ids, ancestorFilterMatch || filterMatch);
      if (child.missing) {
        missingChildrenCount++;
      }
    });

    // if all the children are missing, mark this node as missing & disabled as well
    if (!topicName && !this.extension && this.children.length === missingChildrenCount) {
      this.disabled = true;
      this.missing = true;
      this.tooltip.push(<TooltipRow>None of the topics in this group are currently available</TooltipRow>);
    }

    if (filterText) {
      this.descendantFilterMatch = filterMatch || this.children.some((child) => child.descendantFilterMatch);
      if (this.descendantFilterMatch || ancestorFilterMatch) {
        this.filtered = false;
        this.expanded = true;
      } else {
        this.filtered = true;
      }
    } else {
      this.filtered = false;
    }
  }

  _collectSelections(selections: Selections): void {
    if (this.disabled || !this.checked) {
      return;
    }

    // namespace nodes do not have children
    if (this.topic && this.namespace) {
      selections.namespaces.push({ topic: this.topic, name: this.namespace });
      return;
    } else if (this.topic) {
      selections.topics.push(this.topic);
    } else if (this.extension) {
      selections.extensions.push(this.extension);
    }

    if (this.children) {
      // eslint-disable-next-line no-underscore-dangle
      this.children.forEach((child) => child._collectSelections(selections));
    }
  }

  // walks the tree and gets the selected topics and namespaces
  // based on cascading checked/unchecked state of parents
  getSelections(): Selections {
    const selections: Selections = { topics: [], namespaces: [], extensions: [] };
    this._collectSelections(selections);
    return selections;
  }
}

export const UNGROUPED_NAME = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.ungroupedNodesCategory;

function createUngroupedNode(ungroupedNodes: TopicTreeNode[]): TopicTreeNode {
  const prefixes = {};
  const getPrefix = (node: TopicTreeNode) => {
    return node.text.split("/")[1];
  };

  ungroupedNodes.forEach((node) => {
    const prefix = `/${getPrefix(node)}`;
    if (!prefix) {
      return;
    }
    prefixes[prefix] = prefixes[prefix] || 0;
    prefixes[prefix] += 1;
  });

  const prefixNodes = filterMap(Object.keys(prefixes), (prefix) => {
    const count = prefixes[prefix];
    if (count < 3) {
      return undefined;
    }
    return new TopicTreeNode({ name: prefix, isSyntheticGroup: true, children: [] });
  });

  let unprefixedNodes = ungroupedNodes.filter((node) => {
    const prefix = `/${getPrefix(node)}`;
    const prefixNode = prefixNodes.find((pfx) => pfx.text === prefix);
    if (!prefixNode) {
      return true;
    }
    prefixNode.add(node);
    return false;
  });

  unprefixedNodes = unprefixedNodes.concat(prefixNodes);

  const sortNodesByName = naturalSort("text");

  prefixNodes.forEach((prefixNode) => {
    prefixNode.children = prefixNode.children.sort(sortNodesByName);
  });

  // sort the uncategorized nodes by topic name
  unprefixedNodes.sort(sortNodesByName);

  const parentNode = new TopicTreeNode({ name: UNGROUPED_NAME, children: [] });
  unprefixedNodes.forEach((node) => parentNode.add(node));

  return parentNode;
}

// build tree - use either the json config supplied
// or optionally a custom config used in testing
export default function buildTree({
  topics,
  transforms,
  namespaces,
  topicDisplayMode,
  topicConfig,
  ...rest
}: Props): TopicTreeNode {
  const rootNode = TopicTreeNode.fromJson(topicConfig, topics);
  rootNode.disabled = false;
  rootNode.checked = true;
  const ungroupedNodes = [];
  const showSelectedTopicsOnly = topicDisplayMode === TOPIC_DISPLAY_MODES.SHOW_SELECTED.value;
  const showFlattenedTopics = topicDisplayMode !== TOPIC_DISPLAY_MODES.SHOW_TREE.value;

  const { hasBlacklistTopics, icons: configIcons } = getGlobalHooks().perPanelHooks().ThreeDimensionalViz;

  // apply the topics from the bag to the tree
  topics.forEach((topic: Topic) => {
    if (hasBlacklistTopics(topic.name)) {
      return;
    }

    const icon = {
      ...configIcons,
      ...icons,
    }[topic.datatype];
    if (!icon) {
      return;
    }
    let node = rootNode.find((foundNode) => foundNode.topic === topic.name);
    // enable the existing node if it exists
    if (node) {
      node.disabled = false;
      node.icon = icon;
    } else {
      node = new TopicTreeNode({ topic: topic.name });
      node.icon = icon;
      ungroupedNodes.push(node);
    }
    node.consumeNamespaces(namespaces);
  });

  const tfRootNode = rootNode.find((node) => node.id === "name:TF");
  if (transforms.length > 0) {
    if (tfRootNode) {
      const checkedNodesSet = new Set(rest.checkedNodes);
      transforms.forEach((transform) => {
        const nodeId = `x:TF.${transform.id}`;
        const addChildTfNode =
          !showFlattenedTopics || (showFlattenedTopics && (checkedNodesSet.has(nodeId) || !showSelectedTopicsOnly));
        if (addChildTfNode) {
          const node = new TopicTreeNode({
            name: `TF / ${transform.id}`,
            extension: `TF.${transform.id}`,
            disabled: false,
          });
          tfRootNode.add(node);
        }
      });
    } else {
      console.warn("Couldn't find tf category node");
    }
  }

  // skip creating ungroupedNode when showing flattened topics since it's handled in getTopicConfig
  if (!showFlattenedTopics) {
    const ungroupedNode = createUngroupedNode(ungroupedNodes);
    // sort the uncategorized nodes by topic name
    ungroupedNode.children = ungroupedNode.children.sort(naturalSort("text"));
    rootNode.add(ungroupedNode);
  }
  updateTree(rootNode, { topics, ...rest });
  return rootNode;
}

export function updateTree(tree: TopicTreeNode, props: UpdateTreeProps): TopicTreeNode {
  const ids: string[] = [];
  tree.children.forEach((child) => {
    child.updateState(props, false, ids, false);
  });
  return tree;
}
