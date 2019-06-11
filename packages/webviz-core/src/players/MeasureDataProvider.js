// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time } from "rosbag";

import type {
  ChainableDataProvider,
  ChainableDataProviderDescriptor,
  DataProviderMetadata,
  ExtensionPoint,
  GetDataProvider,
  InitializationResult,
  MessageLike,
} from "webviz-core/src/players/types";
import Logger from "webviz-core/src/util/Logger";

const log = new Logger(__filename);

export function instrumentDataProviderTree(
  treeRoot: ChainableDataProviderDescriptor,
  depth: number = 1
): ChainableDataProviderDescriptor {
  return {
    name: "MeasureDataProvider",
    args: { name: `${new Array(depth * 2 + 1).join("-")}> ${treeRoot.name}` },
    children: [
      {
        ...treeRoot,
        children: treeRoot.children.map((node) => instrumentDataProviderTree(node, depth + 1)),
      },
    ],
  };
}

export default class MeasureDataProvider implements ChainableDataProvider {
  _name: string;
  _provider: ChainableDataProvider;
  _reportMetadataCallback: (DataProviderMetadata) => void = () => {};

  constructor(
    { name }: { name: string },
    children: ChainableDataProviderDescriptor[],
    getDataProvider: GetDataProvider
  ) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to MeasureDataProvider: ${children.length}`);
    }
    this._name = name;
    this._provider = getDataProvider(children[0]);
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this._reportMetadataCallback = extensionPoint.reportMetadataCallback;
    return this._provider.initialize(extensionPoint);
  }

  async getMessages(start: Time, end: Time, topics: string[]): Promise<MessageLike[]> {
    const startMs = Date.now();
    const argsString = `${start.sec}.${start.nsec}, ${end.sec}.${end.nsec}`;
    const result = await this._provider.getMessages(start, end, topics);
    log.info(`MeasureDataProvider(${this._name}): ${Date.now() - startMs}ms for getMessages(${argsString})`);
    return result;
  }

  async close(...args: any): Promise<void> {
    return this._provider.close(...args);
  }
}
