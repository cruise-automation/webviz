// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CrosshairsGpsIcon from "@mdi/svg/svg/crosshairs-gps.svg";
import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import MenuLeftIcon from "@mdi/svg/svg/menu-left.svg";
import CompassOutlineIcon from "@mdi/svg/svg/navigation.svg";
import { sortBy, debounce } from "lodash";
import React, { memo, createRef, useCallback, useState } from "react";
import shallowequal from "shallowequal";
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
  tree.roots.forEach((root) => setDepth(root, 0));

  return tree;
};

type Props = {
  transforms: any,
  tfToFollow?: string,
  followOrientation?: boolean,
  onFollowChange: (tfId?: string | false, followOrientation?: boolean) => void,
};

function* getDescendants(nodes: TfTreeNode[]) {
  for (const node of nodes) {
    yield node;
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

const defaultFollowTfFrame = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.defaultFollowTransformFrame;

const arePropsEqual = (prevProps, nextProps) => {
  if (!nextProps.tfToFollow) {
    const tfTree = buildTfTree(nextProps.transforms.values());
    const allNodes = Array.from(getDescendants(tfTree.roots));
    const nodesWithoutDefaultFollowTfFrame = allNodes && allNodes.length && !defaultFollowTfFrame;
    if (nodesWithoutDefaultFollowTfFrame) {
      return false;
    }
  }
  return shallowequal(prevProps, nextProps);
};

const FollowTFControl = memo<Props>((props: Props) => {
  const { transforms, tfToFollow, followOrientation, onFollowChange } = props;
  const [forceShowFrameList, setForceShowFrameList] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [lastSelectedFrame, setLastSelectedFrame] = useState(undefined);

  const tfTree = buildTfTree(transforms.values());
  const allNodes = Array.from(getDescendants(tfTree.roots));
  const nodesWithoutDefaultFollowTfFrame = allNodes && allNodes.length && !defaultFollowTfFrame;
  const newFollowTfFrame = allNodes && allNodes[0] && allNodes[0].tf && allNodes[0].tf.id;

  const autocomplete = createRef<Autocomplete>();

  const getDefaultFollowTransformFrame = useCallback(
    () => {
      return nodesWithoutDefaultFollowTfFrame ? newFollowTfFrame : defaultFollowTfFrame;
    },
    [nodesWithoutDefaultFollowTfFrame, newFollowTfFrame]
  );

  const getFollowButtonTooltip = useCallback(
    () => {
      if (!tfToFollow) {
        if (lastSelectedFrame) {
          return `Follow ${lastSelectedFrame}`;
        }
        return `Follow ${getDefaultFollowTransformFrame()}`;
      } else if (!followOrientation) {
        return "Follow Orientation";
      }
      return "Unfollow";
    },
    [tfToFollow, followOrientation, lastSelectedFrame, getDefaultFollowTransformFrame]
  );

  const onClickFollowButton = useCallback(
    () => {
      if (!tfToFollow) {
        if (lastSelectedFrame) {
          return onFollowChange(lastSelectedFrame);
        }
        return onFollowChange(getDefaultFollowTransformFrame());
      } else if (!followOrientation) {
        return onFollowChange(tfToFollow, true);
      }
      return onFollowChange(false);
    },
    [tfToFollow, lastSelectedFrame, onFollowChange, getDefaultFollowTransformFrame, followOrientation]
  );

  const onSelectFrame = useCallback(
    (id: string, item: mixed, autocompleteNode: Autocomplete) => {
      setLastSelectedFrame(id === getDefaultFollowTransformFrame() ? undefined : id);
      onFollowChange(id, followOrientation);
      autocompleteNode.blur();
    },
    [setLastSelectedFrame, getDefaultFollowTransformFrame, onFollowChange, followOrientation]
  );

  const openFrameList = useCallback(
    (event: SyntheticEvent<Element>) => {
      event.preventDefault();
      setForceShowFrameList(true);
      if (autocomplete.current) {
        autocomplete.current.focus();
      }
    },
    [setForceShowFrameList, autocomplete]
  );

  // slight delay to prevent the arrow from disappearing when you're trying to click it
  const onMouseLeaveDebounced = useCallback(
    debounce(() => {
      setHovering(false);
    }, 200),
    [setHovering]
  );

  const onMouseEnter = useCallback(
    () => {
      onMouseLeaveDebounced.cancel();
      setHovering(true);
    },
    [onMouseLeaveDebounced, setHovering]
  );

  const followingCustomFrame = tfToFollow && tfToFollow !== getDefaultFollowTransformFrame();
  const showFrameList = lastSelectedFrame != null || forceShowFrameList || followingCustomFrame;
  const selectedFrameId = tfToFollow || lastSelectedFrame;
  const selectedItem = selectedFrameId ? { tf: { id: selectedFrameId }, depth: 0 } : undefined;

  return (
    <Container
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeaveDebounced}
      style={{ color: tfToFollow ? undefined : colors.textMuted }}>
      {showFrameList && (
        <Autocomplete
          ref={autocomplete}
          items={allNodes}
          getItemValue={treeNodeToTfId}
          getItemText={getItemText}
          selectedItem={selectedItem}
          placeholder={selectedItem ? getItemText(selectedItem) : "choose a target frame"}
          onSelect={onSelectFrame}
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
          onBlur={() => {
            setForceShowFrameList(false);
            setHovering(false);
          }}
        />
      )}
      {showFrameList ? (
        <Icon onClick={openFrameList}>
          <MenuDownIcon />
        </Icon>
      ) : hovering ? (
        <Icon
          tooltip={"Select Another Frame\u2026"}
          onClick={openFrameList}
          tooltipProps={{ placement: "top" }}
          style={{ color: "white" }}>
          <MenuLeftIcon />
        </Icon>
      ) : null}
      <Button tooltipProps={{ placement: "top" }} onClick={onClickFollowButton} tooltip={getFollowButtonTooltip()}>
        <Icon style={{ color: tfToFollow ? colors.accent : "white" }}>
          {followOrientation ? <CompassOutlineIcon /> : <CrosshairsGpsIcon />}
        </Icon>
      </Button>
    </Container>
  );
}, arePropsEqual);
export default FollowTFControl;
