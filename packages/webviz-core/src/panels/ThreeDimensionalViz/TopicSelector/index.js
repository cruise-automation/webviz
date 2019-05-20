// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import LayersIcon from "@mdi/svg/svg/layers.svg";
import MagnifyIcon from "@mdi/svg/svg/magnify.svg";
import cx from "classnames";
import { debounce } from "lodash";
import * as React from "react";

import styles from "../Layout.module.scss";
import type { SceneErrors, ErrorDetails } from "../SceneBuilder";
import treeBuilder, { TopicTreeNode, Selections, getId } from "./treeBuilder";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Tree, { type Node } from "webviz-core/src/components/Tree";
import TopicSelectorMenu from "webviz-core/src/panels/ThreeDimensionalViz/TopicSelectorMenu";
import type { Transform } from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { SaveConfig } from "webviz-core/src/types/panels";
import type { Namespace, Topic } from "webviz-core/src/types/players";
import toggle from "webviz-core/src/util/toggle";

import type { ThreeDimensionalVizConfig } from "..";

type Props = {|
  autoTextBackgroundColor: boolean,
  sceneErrors: SceneErrors,
  namespaces: Namespace[],

  // config and props forwarded from the panel
  topics: Topic[],
  checkedNodes: string[],
  expandedNodes: string[],
  modifiedNamespaceTopics: string[],
  pinTopics: boolean,
  transforms: Array<Transform>,
  editedTopics: string[],
  onToggleShowClick: () => void,
  onEditClick: (e: SyntheticMouseEvent<HTMLElement>, topic: string) => void,

  setSelections: (Selections) => void,

  saveConfig: SaveConfig<ThreeDimensionalVizConfig>,
  showTopics: boolean,
|};

type State = {|
  filterText: ?string,
  tree: TopicTreeNode,
  cachedProps: Props,
|};

function renderErrorSection(description: string, values: Map<string, ErrorDetails>) {
  if (values.size === 0) {
    return null;
  }
  const items = [];
  values.forEach((value, topic) => {
    const details = [
      listToString(value.frameIds.size === 1 ? "frame" : "frames", value.frameIds),
      listToString(value.namespaces.size === 1 ? "namespace" : "namespaces", value.namespaces),
    ].filter(Boolean);
    if (details.length > 0) {
      items.push(`${topic} (${details.join("; ")})`);
    } else {
      items.push(topic);
    }
  });
  return (
    <div>
      {`${values.size} topic${values.size === 1 ? "" : "s"} ${description}`}:
      <ul>
        {items.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

function listToString(kind: string, data: Iterable<string>) {
  const items = Array.from(data).filter(Boolean);
  if (items.length === 0) {
    return null;
  }
  return `${kind}: ${items.sort().join(", ")}`;
}

export default class TopicSelector extends React.Component<Props, State> {
  topicList: ?Element;
  filterTextField: ?HTMLInputElement;

  static defaultProps = {
    editedTopics: [],
  };

  // $FlowFixMe, for sure we'll get the state from getDerivedStateFromProps
  state: State = TopicSelector.getDerivedStateFromProps(this.props);

  static getDerivedStateFromProps(nextProps: Props, prevState?: State) {
    const {
      topics,
      namespaces,
      checkedNodes,
      expandedNodes,
      modifiedNamespaceTopics,
      transforms,
      editedTopics,
    } = nextProps;

    // building the tree is kind of expensive
    // so only do it at initialization or when the data changes
    const needsNewTree =
      !prevState ||
      prevState.cachedProps.namespaces !== namespaces ||
      prevState.cachedProps.topics !== topics ||
      prevState.cachedProps.expandedNodes !== expandedNodes ||
      prevState.cachedProps.checkedNodes !== checkedNodes ||
      prevState.cachedProps.editedTopics !== editedTopics ||
      prevState.cachedProps.transforms.length !== transforms.length;

    if (needsNewTree) {
      const filterText = (prevState && prevState.filterText) || undefined;
      const tree = treeBuilder({
        topics,
        namespaces,
        checkedNodes,
        expandedNodes,
        modifiedNamespaceTopics,
        transforms,
        editedTopics,
        filterText,
      });

      nextProps.setSelections(tree.getSelections());

      return {
        filterText,
        tree,
        cachedProps: nextProps,
      };
    }
    return null;
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { showTopics } = this.props;

    if (prevProps.showTopics !== showTopics) {
      if (showTopics && this.filterTextField) {
        this.filterTextField.focus();
      }
    }
  }

  cancelClick = (e: SyntheticMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  _updateTreeDebounced = debounce(() => {
    const tree = treeBuilder({
      topics: this.props.topics,
      filterText: this.state.filterText,
      namespaces: this.props.namespaces,
      checkedNodes: this.props.checkedNodes,
      expandedNodes: this.props.expandedNodes,
      modifiedNamespaceTopics: this.props.modifiedNamespaceTopics,
      transforms: this.props.transforms,
      editedTopics: this.props.editedTopics,
    });

    this.setState({ tree });
    this.props.setSelections(tree.getSelections());
  }, 150);

  onFilterTextChange = (e: SyntheticEvent<HTMLInputElement>) => {
    this.setState({ filterText: e.currentTarget.value });
    this._updateTreeDebounced();
  };

  toggleExpanded = (node: Node) => {
    const { expandedNodes, saveConfig } = this.props;
    const { legacyIds, id } = node;
    // don't invalidate layout url just because a node was expanded/collapsed
    saveConfig(
      { expandedNodes: toggle(expandedNodes, id, (item) => legacyIds.includes(item) || item === id) },
      { keepLayoutInUrl: true }
    );
  };

  onEditClick = (e: SyntheticMouseEvent<HTMLElement>, node: Node) => {
    const topicNode: TopicTreeNode = ((node: any): TopicTreeNode);
    if (!topicNode.topic) {
      return;
    }
    this.props.onEditClick(e, topicNode.topic);
  };

  togglePinTopics = () => {
    const { pinTopics, saveConfig } = this.props;
    saveConfig({ pinTopics: !pinTopics });
  };

  toggleChecked = (node: Node) => {
    const { checkedNodes, saveConfig, modifiedNamespaceTopics, namespaces } = this.props;
    const { namespace, topic } = ((node: any): TopicTreeNode);
    // if we are interacting with a namespace, mark its topic as modified
    // this way when future namespaces show up for this topic, on this page load or after an app reload
    // we don't check them automatically
    if (namespace && topic && !modifiedNamespaceTopics.includes(topic)) {
      // check all namespaces under this topic *except* the clicked one
      const newCheckedNodes = checkedNodes.slice();
      namespaces.forEach((ns) => {
        if (ns.topic === topic && ns.name !== namespace) {
          newCheckedNodes.push(getId(ns));
        }
      });
      saveConfig({
        modifiedNamespaceTopics: modifiedNamespaceTopics.concat(topic),
        checkedNodes: newCheckedNodes,
      });
    } else {
      const { legacyIds, id } = node;
      saveConfig({ checkedNodes: toggle(checkedNodes, id, (item) => legacyIds.includes(item) || item === id) });
    }
  };

  renderErrors() {
    if (!this.hasErrors()) {
      return null;
    }

    const { sceneErrors } = this.props;

    const genericTopicErrors = [];
    for (const [topic, message] of sceneErrors.topicsWithError) {
      const html = <div key={topic}>{`${topic}: ${message}`}</div>;
      genericTopicErrors.push(html);
    }

    return (
      <div className={styles.errors}>
        {renderErrorSection("missing frame ids", sceneErrors.topicsMissingFrameIds)}
        {renderErrorSection(
          `missing transforms to ${sceneErrors.rootTransformID}`,
          sceneErrors.topicsMissingTransforms
        )}
        {genericTopicErrors}
      </div>
    );
  }

  hasErrors() {
    const { sceneErrors } = this.props;
    return (
      sceneErrors.topicsMissingFrameIds.size !== 0 ||
      sceneErrors.topicsMissingTransforms.size !== 0 ||
      sceneErrors.topicsWithError.size !== 0
    );
  }

  render() {
    const { tree } = this.state;
    if (!tree) {
      return null;
    }
    const { pinTopics, showTopics, onToggleShowClick, autoTextBackgroundColor, saveConfig } = this.props;
    const inputStyle = {
      flex: 1,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      margin: 0,
      background: "transparent",
      color: "white",
      paddingLeft: 5,
    };
    const hide = !pinTopics && !showTopics;

    return (
      <>
        <div className={cx(styles.toolbar, styles.left)} style={{ display: hide ? "block" : "none" }}>
          <div className={styles.buttons}>
            <Button onClick={onToggleShowClick} tooltip="Show Topic Picker">
              <Icon style={{ color: "white" }}>
                <LayersIcon />
              </Icon>
            </Button>
            {this.hasErrors() && <div className={styles.errorsBadge} />}
          </div>
        </div>
        <div onClick={this.cancelClick} style={{ display: hide ? "none" : "block" }} className={styles.topicsContainer}>
          <div className={styles.topics}>
            <Flex col clip>
              <Flex row className={styles.filterRow}>
                <Icon style={{ color: "rgba(255,255,255, 0.3", padding: "10px 0 10px 10px" }}>
                  <MagnifyIcon style={{ width: 16, height: 16 }} />
                </Icon>
                <input
                  ref={(el) => (this.filterTextField = el)}
                  type="text"
                  style={inputStyle}
                  placeholder="Type to filter"
                  value={this.state.filterText || ""}
                  onChange={this.onFilterTextChange}
                />
                <TopicSelectorMenu
                  saveConfig={saveConfig}
                  pinTopics={pinTopics}
                  autoTextBackgroundColor={autoTextBackgroundColor}
                />
              </Flex>
              <Flex col scroll>
                <Tree
                  hideRoot
                  onToggleCheck={this.toggleChecked}
                  onToggleExpand={this.toggleExpanded}
                  onEditClick={this.onEditClick}
                  root={tree}
                />
              </Flex>
            </Flex>
            {this.renderErrors()}
          </div>
        </div>
      </>
    );
  }
}
