// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CrosshairsGpsIcon from "@mdi/svg/svg/crosshairs-gps.svg";
import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import MenuLeftIcon from "@mdi/svg/svg/menu-left.svg";
import CompassOutlineIcon from "@mdi/svg/svg/navigation.svg";
import { sortBy, debounce } from "lodash";
import * as React from "react";
import styled from "styled-components";

import { type Transform } from "./Transforms";
import Autocomplete from "webviz-core/src/components/Autocomplete";
import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import colors from "webviz-core/src/styles/colors.module.scss";

type TfTreeNode = {
  tf: Transform,
  children: TfTreeNode[],
  depth: number,
};

type TfTree = {
  roots: TfTreeNode[],
  nodes: { [string]: TfTreeNode },
};

const treeNodeToTfId = (node) => node.tf.id;

const buildTfTree = (transforms: Transform[]): TfTree => {
  const tree: TfTree = {
    roots: [],
    nodes: {},
  };
  // Create treeNodes for all tfs.
  for (const tf of transforms) {
    if (tree.nodes[tf.id]) {
      continue;
    }
    tree.nodes[tf.id] = {
      tf,
      children: [],
      depth: 0,
    };
  }

  // Now add children to their parents treenode.
  for (const tf of transforms) {
    if (tf.parent) {
      const parentTreeNode = tree.nodes[tf.parent.id];
      parentTreeNode.children.push(tree.nodes[tf.id]);
    } else {
      tree.roots.push(tree.nodes[tf.id]);
    }
  }

  // Cast the list to satisfy flow (because Object.values returns array of mixed).
  const allNodes = ((Object.values(tree.nodes): any): TfTreeNode[]);
  // Do a final pass sorting all the children lists.
  for (const node of allNodes) {
    node.children = sortBy(node.children, treeNodeToTfId);
  }
  tree.roots = sortBy(tree.roots, treeNodeToTfId);

  // Calculate depths
  const setDepth = (node: TfTreeNode, depth: number) => {
    node.depth = depth;
    node.children.forEach((child) => setDepth(child, depth + 1));
  };
  tree.roots.forEach((root) =>
    setDepth(root, root.tf.id === getGlobalHooks().perPanelHooks().ThreeDimensionalViz.rootTransformFrame ? -1 : 0)
  );

  return tree;
};

type Props = {
  transforms: any,
  tfToFollow?: string,
  followingOrientation?: boolean,
  onFollowChange: (tfId?: string | false, followOrientation?: boolean) => void,
};

function* getDescendants(nodes: TfTreeNode[]) {
  for (const node of nodes) {
    if (node.tf.id !== getGlobalHooks().perPanelHooks().ThreeDimensionalViz.rootTransformFrame) {
      yield node;
    }
    yield* getDescendants(node.children);
  }
}

function getItemText(node: TfTreeNode | { tf: { id: string }, depth: number }) {
  return "".padEnd(node.depth * 4) + node.tf.id;
}

const Container = styled.div`
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  position: relative;
`;

type State = {|
  forceShowFrameList: boolean,
  hovering: boolean,
  lastSelectedFrame: string | void,
|};

export default class FollowTFControl extends React.PureComponent<Props, State> {
  state = {
    forceShowFrameList: false,
    hovering: false,
    lastSelectedFrame: undefined,
  };

  _autocomplete = React.createRef<Autocomplete>();

  _getFollowButtonTooltip() {
    const { tfToFollow, followingOrientation } = this.props;
    const { lastSelectedFrame } = this.state;
    if (!tfToFollow) {
      if (lastSelectedFrame) {
        return `Follow ${lastSelectedFrame}`;
      }
      return `Follow ${getGlobalHooks().perPanelHooks().ThreeDimensionalViz.defaultFollowTransformFrame}`;
    } else if (!followingOrientation) {
      return "Follow Orientation";
    }
    return "Unfollow";
  }

  _onClickFollowButton = () => {
    const { tfToFollow, followingOrientation, onFollowChange } = this.props;
    const { lastSelectedFrame } = this.state;
    if (!tfToFollow) {
      if (lastSelectedFrame) {
        return onFollowChange(lastSelectedFrame);
      }
      return onFollowChange(getGlobalHooks().perPanelHooks().ThreeDimensionalViz.defaultFollowTransformFrame);
    } else if (!followingOrientation) {
      return onFollowChange(tfToFollow, true);
    }
    return onFollowChange(false);
  };

  _onSelectFrame = (id: string, item: mixed, autocomplete: Autocomplete) => {
    const { onFollowChange, followingOrientation } = this.props;
    this.setState({
      lastSelectedFrame:
        id === getGlobalHooks().perPanelHooks().ThreeDimensionalViz.defaultFollowTransformFrame ? undefined : id,
    });
    onFollowChange(id, followingOrientation);
    autocomplete.blur();
  };

  _openFrameList = (event: SyntheticEvent<Element>) => {
    event.preventDefault();
    this.setState({ forceShowFrameList: true }, () => {
      if (this._autocomplete.current) {
        this._autocomplete.current.focus();
      }
    });
  };

  _onMouseEnter = () => {
    this._onMouseLeaveDebounced.cancel();
    this.setState({ hovering: true });
  };

  // slight delay to prevent the arrow from disappearing when you're trying to click it
  _onMouseLeaveDebounced = debounce(() => {
    this.setState({ hovering: false });
  }, 200);

  render() {
    const { transforms, tfToFollow, followingOrientation } = this.props;
    const { forceShowFrameList, hovering, lastSelectedFrame } = this.state;

    const tfTree = buildTfTree(transforms.values());
    const allNodes = Array.from(getDescendants(tfTree.roots));

    const followingCustomFrame =
      tfToFollow && tfToFollow !== getGlobalHooks().perPanelHooks().ThreeDimensionalViz.defaultFollowTransformFrame;
    const showFrameList = lastSelectedFrame != null || forceShowFrameList || followingCustomFrame;

    const selectedFrameId = tfToFollow || lastSelectedFrame;
    const selectedItem = selectedFrameId ? { tf: { id: selectedFrameId }, depth: 0 } : undefined;

    return (
      <Container
        onMouseEnter={this._onMouseEnter}
        onMouseLeave={this._onMouseLeaveDebounced}
        style={{ color: tfToFollow ? undefined : colors.textMuted }}>
        {showFrameList && (
          <Autocomplete
            ref={this._autocomplete}
            items={allNodes}
            getItemValue={treeNodeToTfId}
            getItemText={getItemText}
            selectedItem={selectedItem}
            placeholder={selectedItem ? getItemText(selectedItem) : "choose a target frame"}
            onSelect={this._onSelectFrame}
            sortWhenFiltering={false}
            minWidth={0}
            clearOnFocus
            autoSize
            menuStyle={{
              // bump the menu down to reduce likelihood of it appearing while the mouse is
              // already over it, which causes onMouseEnter not to be delivered correctly and
              // breaks selection
              marginTop: 4,
            }}
            onBlur={() =>
              this.setState({
                forceShowFrameList: false,
                hovering: false, // onMouseLeave doesn't get called correctly in all cases
              })
            }
          />
        )}
        {showFrameList ? (
          <Icon onClick={this._openFrameList}>
            <MenuDownIcon />
          </Icon>
        ) : hovering ? (
          <Icon
            tooltip={"Select Another Frame\u2026"}
            onClick={this._openFrameList}
            tooltipProps={{ placement: "top" }}
            style={{ color: "white" }}>
            <MenuLeftIcon />
          </Icon>
        ) : null}
        <Button
          tooltipProps={{ placement: "top" }}
          onClick={this._onClickFollowButton}
          tooltip={this._getFollowButtonTooltip()}>
          <Icon style={{ color: tfToFollow ? colors.accent : "white" }}>
            {followingOrientation ? <CompassOutlineIcon /> : <CrosshairsGpsIcon />}
          </Icon>
        </Button>
      </Container>
    );
  }
}
