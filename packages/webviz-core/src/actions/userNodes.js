// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { keyBy } from "lodash";

import { setUserNodes } from "webviz-core/src/actions/panels";
import filterMap from "webviz-core/src/filterMap";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { UserNodeLogs } from "webviz-core/src/players/UserNodePlayer/types";
import type { CompiledUserNodeDataById } from "webviz-core/src/types/panels";
import type {
  PublishedPlaygroundNode,
  PublishedPlaygroundNodeMeta,
  PublishedPlaygroundNodeRequired,
} from "webviz-core/src/types/PublishedPlaygroundNodesApi";
import type { Dispatch, GetState } from "webviz-core/src/types/Store";

type SET_COMPILED_USER_NODE_DATA = {
  type: "SET_COMPILED_USER_NODE_DATA",
  payload: { compiledNodeData: CompiledUserNodeDataById, skipSettingLocalStorage: boolean },
};
type ADD_USER_NODE_LOGS = {
  type: "ADD_USER_NODE_LOGS",
  payload: UserNodeLogs,
};

type CLEAR_USER_NODE_LOGS = {
  type: "CLEAR_USER_NODE_LOGS",
  payload: string,
};

type SET_USER_NODE_ROS_LIB = {
  type: "SET_USER_NODE_ROS_LIB",
  payload: string,
};

type SET_PUBLISHED_NODES_LIST = {
  type: "SET_PUBLISHED_NODES_LIST",
  payload: PublishedPlaygroundNodeMeta[],
};

type SET_PUBLISHED_NODES_BY_TOPIC = {
  type: "SET_PUBLISHED_NODES_BY_TOPIC",
  payload: { [string]: PublishedPlaygroundNode },
};

export const setCompiledNodeData = (compiledNodeData: CompiledUserNodeDataById) => ({
  type: "SET_COMPILED_USER_NODE_DATA",
  payload: { compiledNodeData, skipSettingLocalStorage: true },
});

export const addUserNodeLogs = (payload: UserNodeLogs) => ({
  type: "ADD_USER_NODE_LOGS",
  payload,
});

export const clearUserNodeLogs = (payload: string) => ({
  type: "CLEAR_USER_NODE_LOGS",
  payload,
});

export const setUserNodeRosLib = (payload: string) => ({
  type: "SET_USER_NODE_ROS_LIB",
  payload,
});

export const setPublishedNodesList = (payload: PublishedPlaygroundNodeMeta[]) => ({
  type: "SET_PUBLISHED_NODES_LIST",
  payload,
});

export const setPublishedNodesByTopic = (payload: { [string]: PublishedPlaygroundNode }) => ({
  type: "SET_PUBLISHED_NODES_BY_TOPIC",
  payload,
});

// A thunk that fetches and stores the list of all published nodes
export const fetchPublishedNodesList = () => async (dispatch: Dispatch) => {
  const publishedNodesApi = getGlobalHooks().getPublishedNodesApi();
  if (publishedNodesApi) {
    publishedNodesApi.fetchNodeList().then((publishedNodes) => {
      dispatch(setPublishedNodesList(publishedNodes));
    });
  }
};

// A thunk that returns the full source code for a list of published node topics.
export const fetchPublishedNodes = (topics: string[]) => async (
  dispatch: Dispatch,
  getState: GetState
): Promise<PublishedPlaygroundNode[]> => {
  const publishedNodesApi = getGlobalHooks().getPublishedNodesApi();
  const { publishedNodesByTopic } = getState().userNodes;

  const topicsWithoutCachedSource = topics.filter((topic) => !publishedNodesByTopic[topic]);
  if (publishedNodesApi && topicsWithoutCachedSource.length > 0) {
    const publishedNodes = await publishedNodesApi.fetchNodes(topicsWithoutCachedSource);
    const newPublishedNodesByTopic = keyBy(publishedNodes, ({ outputTopic }) => outputTopic);
    dispatch(setPublishedNodesByTopic({ ...publishedNodesByTopic, ...newPublishedNodesByTopic }));

    return topics.map((topic) => newPublishedNodesByTopic[topic]);
  }
  return filterMap(topics, (topic) => publishedNodesByTopic[topic]);
};

export const publishNode = (nodeToPublish: PublishedPlaygroundNodeRequired, selectedNodeId: string) => async (
  dispatch: Dispatch
): Promise<PublishedPlaygroundNode> => {
  const publishedNodesApi = getGlobalHooks().getPublishedNodesApi();

  const publishedNode = await publishedNodesApi.updateNode(nodeToPublish);
  dispatch(setUserNodes({ [selectedNodeId]: { name: publishedNode.outputTopic, published: true } }));
  dispatch(fetchPublishedNodesList());
  return publishedNode;
};

export type AddUserNodeLogs = typeof addUserNodeLogs;
export type ClearUserNodeLogs = typeof clearUserNodeLogs;
export type SetCompiledNodeData = typeof setCompiledNodeData;
export type SetUserNodeRosLib = typeof setUserNodeRosLib;
export type SetPublishedNodesList = typeof setPublishedNodesList;
export type SetPublishedNodesByTopic = typeof setPublishedNodesByTopic;

export type UserNodesActions =
  | ADD_USER_NODE_LOGS
  | CLEAR_USER_NODE_LOGS
  | SET_COMPILED_USER_NODE_DATA
  | SET_USER_NODE_ROS_LIB
  | SET_PUBLISHED_NODES_LIST
  | SET_PUBLISHED_NODES_BY_TOPIC;
