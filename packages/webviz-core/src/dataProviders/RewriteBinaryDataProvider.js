// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { groupBy } from "lodash";
import { type Time, TimeUtil } from "rosbag";

import BinaryMessageWriter from "../util/binaryObjects/binaryTranslation";
import rawMessageDefinitionsToParsed from "./rawMessageDefinitionsToParsed";
import type {
  DataProviderDescriptor,
  DataProvider,
  GetDataProvider,
  ExtensionPoint,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
  ParsedMessageDefinitions,
} from "webviz-core/src/dataProviders/types";
import type { Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { getObjects } from "webviz-core/src/util/binaryObjects";
import { getContentBasedDatatypes } from "webviz-core/src/util/datatypes";
import { logBatchedEventTotals } from "webviz-core/src/util/logBatchedEvents";
import naturalSort from "webviz-core/src/util/naturalSort";
import sendNotification from "webviz-core/src/util/sendNotification";

export default class RewriteBinaryDataProvider implements DataProvider {
  _provider: DataProvider;
  _extensionPoint: ExtensionPoint;
  _writer: BinaryMessageWriter;
  _rewrittenDatatypeIdsByTopic: { [topic: string]: string };
  _rewrittenDatatypes: RosDatatypes;
  _rewrittenTopics: Topic[];
  _provideUnambiguousDatatypesToPlayer: boolean;

  constructor(
    args: { unambiguousDatatypes?: boolean },
    children: DataProviderDescriptor[],
    getDataProvider: GetDataProvider
  ) {
    this._provider = getDataProvider(children[0]);
    this._provideUnambiguousDatatypesToPlayer = !!args.unambiguousDatatypes;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this._extensionPoint = extensionPoint;
    const result = await this._provider.initialize({ ...extensionPoint, progressCallback: () => {} });

    const { topics } = result;
    // If the child message definitions are not parsed, parse them here.
    const messageDefinitions: ParsedMessageDefinitions =
      result.messageDefinitions.type === "parsed"
        ? result.messageDefinitions
        : rawMessageDefinitionsToParsed(result.messageDefinitions, topics);

    this._writer = new BinaryMessageWriter();
    await this._writer.initialize();

    try {
      const datatypeNamesByTopic = {};
      topics.forEach((topic) => {
        datatypeNamesByTopic[topic.name] = topic.datatypeName;
      });
      const { rewrittenDatatypeIdsByTopic, rewrittenDatatypes } = getContentBasedDatatypes(
        messageDefinitions.messageDefinitionsByTopic,
        messageDefinitions.parsedMessageDefinitionsByTopic,
        datatypeNamesByTopic
      );
      this._rewrittenTopics = topics.map((topic) => ({
        ...topic,
        datatypeId: rewrittenDatatypeIdsByTopic[topic.name],
      }));
      this._rewrittenDatatypes = rewrittenDatatypes;
      this._writer.registerDefinitions(rewrittenDatatypes);
      this._rewrittenDatatypeIdsByTopic = rewrittenDatatypeIdsByTopic;
    } catch (err) {
      sendNotification(
        "Failed to register type definitions",
        err ? `${err.message} - ${err.stack}` : "<unknown error>",
        "app",
        "error"
      );
    }

    return this._provideUnambiguousDatatypesToPlayer
      ? { ...result, messageDefinitions }
      : {
          ...result,
          messageDefinitions: { ...messageDefinitions, datatypes: this._rewrittenDatatypes },
          topics: this._rewrittenTopics,
        };
  }

  async getMessages(start: Time, end: Time, subscriptions: GetMessagesTopics): Promise<GetMessagesResult> {
    const { rosBinaryMessages } = await this._provider.getMessages(start, end, {
      rosBinaryMessages: subscriptions.bobjects,
    });

    const bobjects = [];
    const startTime = performance.now();

    try {
      if (rosBinaryMessages) {
        const messagesByTopic = groupBy(rosBinaryMessages, "topic");
        Object.keys(messagesByTopic).forEach((topic) => {
          const definitionName = this._rewrittenDatatypeIdsByTopic[topic];
          const messages = messagesByTopic[topic];
          const binary = this._writer.rewriteMessages(definitionName, messages);
          const binaryObjects = getObjects(
            this._rewrittenDatatypes,
            this._rewrittenDatatypeIdsByTopic[topic],
            binary.buffer,
            binary.bigString,
            binary.offsets
          );
          bobjects.push(
            ...binaryObjects.map((b, i) => ({
              message: b,
              topic,
              receiveTime: messages[i].receiveTime,
            }))
          );
        });
      }
    } catch (err) {
      sendNotification(
        "Failed to write binary objects",
        err ? `${err.message} - ${err.stack}` : "<unknown error>",
        "app",
        "error"
      );
    }
    const rewriteBinaryDataTimeMs = performance.now() - startTime;
    logBatchedEventTotals("performance", "PLAYBACK_PERFORMANCE", {}, { rewriteBinaryDataTimeMs });

    return {
      bobjects: bobjects.sort(
        (a, b) => TimeUtil.compare(a.receiveTime, b.receiveTime) || naturalSort()(a.topic, b.topic)
      ),
      rosBinaryMessages: undefined,
      parsedMessages: undefined,
    };
  }

  close(): Promise<void> {
    return this._provider.close();
  }

  setUserNodes() {
    throw new Error("Not implemented");
  }
  setGlobalVariables() {
    throw new Error("Not implemented");
  }
}
