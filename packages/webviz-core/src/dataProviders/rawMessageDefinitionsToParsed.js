// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { fromPairs, keyBy, uniq } from "lodash";

import type { MessageDefinitions, ParsedMessageDefinitions } from "./types";
import type { Topic, ParsedMessageDefinitionsByTopic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import parseMessageDefinitionsCache from "webviz-core/src/util/parseMessageDefinitionsCache";

// Extract one big list of datatypes from the individual connections.
function parsedMessageDefinitionsToDatatypes(
  parsedMessageDefinitionsByTopic: ParsedMessageDefinitionsByTopic,
  topics: Topic[]
): RosDatatypes {
  const topLevelDatatypeNames: string[] = uniq(topics.map(({ datatypeName }) => datatypeName));
  // many topics can have the same datatype, but that shouldn't matter here - we just want any topic.
  const topicNameByDatatypeName: { [string]: string } = fromPairs(
    topics.map(({ name, datatypeName }) => [datatypeName, name])
  );
  const datatypes = {};
  topLevelDatatypeNames.forEach((datatypeName) => {
    const topicName = topicNameByDatatypeName[datatypeName];
    const parsedMessageDefinition = parsedMessageDefinitionsByTopic[topicName];
    parsedMessageDefinition.forEach(({ name, definitions }) => {
      datatypes[name] = { name, fields: definitions };
    });
  });
  return datatypes;
}

export default function rawMessageDefinitionsToParsed(
  messageDefinitions: MessageDefinitions,
  topics: Topic[]
): ParsedMessageDefinitions {
  if (messageDefinitions.type === "parsed") {
    return messageDefinitions;
  }
  const parsedMessageDefinitionsByTopic = {};
  const topicsByName = keyBy(topics, "name");
  for (const topic of Object.keys(messageDefinitions.messageDefinitionsByTopic)) {
    const messageDefinition = messageDefinitions.messageDefinitionsByTopic[topic];
    const typeName = topicsByName[topic].datatypeName;
    const md5 = messageDefinitions.messageDefinitionMd5SumByTopic?.[topic];
    parsedMessageDefinitionsByTopic[topic] = parseMessageDefinitionsCache.parseMessageDefinition(
      messageDefinition,
      typeName,
      md5
    );
  }
  return {
    type: "parsed",
    messageDefinitionsByTopic: messageDefinitions.messageDefinitionsByTopic,
    datatypes: parsedMessageDefinitionsToDatatypes(parsedMessageDefinitionsByTopic, topics),
    parsedMessageDefinitionsByTopic,
  };
}
