// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// Require fields needed when publishing new node versions
export type PublishedPlaygroundNodeRequired = {|
  outputTopic: string,
  inputTopics: string[],
  description: string,
  sourceCode: string,
|};

// These fields are set on the server
export type PublishedPlaygroundNodeMeta = {|
  versionNumber: number,
  createdAt: number,
  username: string,
  outputTopic: string,
  inputTopics: string[],
  description: string,
  isDeleted?: boolean,
|};

export type PublishedPlaygroundNode = {|
  ...PublishedPlaygroundNodeMeta,
  sourceCode: string,
|};

export type PublishedPlaygroundNodesApi = {
  fetchNodeList(): Promise<$Shape<PublishedPlaygroundNodeMeta>[]>,
  fetchNodes(topics: string[]): Promise<PublishedPlaygroundNode[]>,
  updateNode(node: PublishedPlaygroundNodeRequired): Promise<PublishedPlaygroundNode>,
  deleteNodeByTopic(topic: string): Promise<void>,
};
