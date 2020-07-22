// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time } from "rosbag";

import { CoreDataProviders } from "webviz-core/src/dataProviders/constants";
import type {
  DataProvider,
  DataProviderDescriptor,
  DataProviderMetadata,
  ExtensionPoint,
  GetDataProvider,
  GetMessagesExtra,
  InitializationResult,
} from "webviz-core/src/dataProviders/types";
import type { Message } from "webviz-core/src/players/types";
import Logger from "webviz-core/src/util/Logger";

const log = new Logger(__filename);

// Wrap each DataProvider in the tree with a MeasureDataProvider.
export function instrumentTreeWithMeasureDataProvider(
  treeRoot: DataProviderDescriptor,
  depth: number = 1
): DataProviderDescriptor {
  return {
    name: CoreDataProviders.MeasureDataProvider,
    args: { name: `${new Array(depth * 2 + 1).join("-")}> ${treeRoot.name}` },
    children: [
      {
        ...treeRoot,
        children: treeRoot.children.map((node) => instrumentTreeWithMeasureDataProvider(node, depth + 1)),
      },
    ],
  };
}

// Log to the console how long each `getMessages` call takes.
export default class MeasureDataProvider implements DataProvider {
  _name: string;
  _provider: DataProvider;
  _reportMetadataCallback: (DataProviderMetadata) => void = () => {};

  constructor({ name }: { name: string }, children: DataProviderDescriptor[], getDataProvider: GetDataProvider) {
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

  async getMessages(start: Time, end: Time, topics: string[], extra?: ?GetMessagesExtra): Promise<Message[]> {
    const startMs = Date.now();
    const argsString = `${start.sec}.${start.nsec}, ${end.sec}.${end.nsec}`;
    const result = await this._provider.getMessages(start, end, topics, extra);
    log.info(
      `MeasureDataProvider(${this._name}): ${Date.now() - startMs}ms for ${
        result.length
      } messages from getMessages(${argsString})`
    );
    return result;
  }

  async close(...args: any): Promise<void> {
    return this._provider.close(...args);
  }
}
