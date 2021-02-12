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
  payload: { diagnostics: UserNodeDiagnostics, skipSettingLocalStorage: true },
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

export const setUserNodeDiagnostics = (diagnostics: UserNodeDiagnostics) => ({
  type: "SET_USER_NODE_DIAGNOSTICS",
  payload: { diagnostics, skipSettingLocalStorage: true },
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

export type AddUserNodeLogs = typeof addUserNodeLogs;
export type ClearUserNodeLogs = typeof clearUserNodeLogs;
export type SetUserNodeDiagnostics = typeof setUserNodeDiagnostics;
export type SetUserNodeRosLib = typeof setUserNodeRosLib;

export type UserNodesActions =
  | ADD_USER_NODE_LOGS
  | CLEAR_USER_NODE_LOGS
  | SET_USER_NODE_DIAGNOSTICS
  | SET_USER_NODE_ROS_LIB;
