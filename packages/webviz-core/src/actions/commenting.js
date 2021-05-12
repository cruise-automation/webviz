// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { Dispatcher, Comment } from "webviz-core/src/reducers";

const COMMENTING_ACTION_TYPES = {
  SET_FETCHED_COMMENTS_BASE: "SET_FETCHED_COMMENTS_BASE",
  SET_FETCHED_COMMENTS_FEATURE: "SET_FETCHED_COMMENTS_FEATURE",
  SET_SOURCE_TO_SHOW: "SET_SOURCE_TO_SHOW",
  SET_IS_SIDEBAR_OPEN: "SET_IS_SIDEBAR_OPEN",
  SET_IS_EDITOR_OPEN: "SET_IS_EDITOR_OPEN",
};

type SET_FETCHED_COMMENTS_BASE = { type: "SET_FETCHED_COMMENTS_BASE", payload: Comment[] };
export const setFetchedCommentsBase = (payload: Comment[]): Dispatcher<SET_FETCHED_COMMENTS_BASE> => (dispatch) => {
  return dispatch({ type: COMMENTING_ACTION_TYPES.SET_FETCHED_COMMENTS_BASE, payload });
};

type SET_FETCHED_COMMENTS_FEATURE = { type: "SET_FETCHED_COMMENTS_FEATURE", payload: Comment[] };
export const setFetchedCommentsFeature = (payload: Comment[]): Dispatcher<SET_FETCHED_COMMENTS_FEATURE> => (
  dispatch
) => {
  return dispatch({ type: COMMENTING_ACTION_TYPES.SET_FETCHED_COMMENTS_FEATURE, payload });
};

export type CommentSourceToShow = "Both" | "Base" | "Feature";
type SET_SOURCE_TO_SHOW = { type: "SET_SOURCE_TO_SHOW", payload: CommentSourceToShow };
export const setSourceToShow = (payload: CommentSourceToShow): Dispatcher<SET_SOURCE_TO_SHOW> => (dispatch) => {
  return dispatch({ type: COMMENTING_ACTION_TYPES.SET_SOURCE_TO_SHOW, payload });
};

type SET_IS_SIDEBAR_OPEN = { type: "SET_IS_SIDEBAR_OPEN", payload: boolean };
export const setIsSidebarOpen = (payload: boolean): Dispatcher<SET_IS_SIDEBAR_OPEN> => (dispatch) => {
  return dispatch({ type: COMMENTING_ACTION_TYPES.SET_IS_SIDEBAR_OPEN, payload });
};

type SET_IS_EDITOR_OPEN = { type: "SET_IS_EDITOR_OPEN", payload: boolean };
export const setIsEditorOpen = (payload: boolean): Dispatcher<SET_IS_EDITOR_OPEN> => (dispatch) => {
  return dispatch({ type: COMMENTING_ACTION_TYPES.SET_IS_EDITOR_OPEN, payload });
};

export type CommentingActions =
  | SET_FETCHED_COMMENTS_BASE
  | SET_FETCHED_COMMENTS_FEATURE
  | SET_SOURCE_TO_SHOW
  | SET_IS_SIDEBAR_OPEN
  | SET_IS_EDITOR_OPEN;
