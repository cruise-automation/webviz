// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { UserNodeDiagnostics, UserNodeLogs } from "webviz-core/src/players/UserNodePlayer/types";

type SET_USER_NODE_DIAGNOSTICS = {
  type: "SET_USER_NODE_DIAGNOSTICS",
  payload: UserNodeDiagnostics,
};

type ADD_USER_NODE_LOGS = {
  type: "ADD_USER_NODE_LOGS",
  payload: UserNodeLogs,
};

type CLEAR_USER_NODE_LOGS = {
  type: "CLEAR_USER_NODE_LOGS",
  payload: string,
};

type SET_USER_NODE_TRUST = {
  type: "SET_USER_NODE_TRUST",
  payload: { id: string, trusted: boolean },
};

type SET_USER_NODE_ROS_LIB = {
  type: "SET_USER_NODE_ROS_LIB",
  payload: string,
};

export const setUserNodeDiagnostics = (payload: UserNodeDiagnostics) => ({
  type: "SET_USER_NODE_DIAGNOSTICS",
  payload,
});

export const addUserNodeLogs = (payload: UserNodeLogs) => ({
  type: "ADD_USER_NODE_LOGS",
  payload,
});

export const clearUserNodeLogs = (payload: string) => ({
  type: "CLEAR_USER_NODE_LOGS",
  payload,
});

export const setUserNodeTrust = (payload: { id: string, trusted: boolean }) => ({
  type: "SET_USER_NODE_TRUST",
  payload,
});

export const setUserNodeRosLib = (payload: string) => ({
  type: "SET_USER_NODE_ROS_LIB",
  payload,
});

export type AddUserNodeLogs = typeof addUserNodeLogs;
export type ClearUserNodeLogs = typeof clearUserNodeLogs;
export type SetUserNodeDiagnostics = typeof setUserNodeDiagnostics;
export type SetUserNodeTrust = typeof setUserNodeTrust;
export type SetUserNodeRosLib = typeof setUserNodeRosLib;

export type UserNodesActions =
  | ADD_USER_NODE_LOGS
  | CLEAR_USER_NODE_LOGS
  | SET_USER_NODE_DIAGNOSTICS
  | SET_USER_NODE_TRUST
  | SET_USER_NODE_ROS_LIB;
