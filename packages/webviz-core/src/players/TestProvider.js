// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type Time } from "rosbag";

import { type ExtensionPoint, type InitializationResult, type DataProvider } from "webviz-core/src/dataProviders/types";
import { type Message, type Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

const defaultStart = { sec: 10, nsec: 0 };
const defaultEnd = { sec: 100, nsec: 0 };
const datatypes: RosDatatypes = {
  fooBar: {
    fields: [
      {
        name: "val",
        type: "number",
      },
    ],
  },
  baz: {
    fields: [
      {
        name: "val",
        type: "number",
      },
    ],
  },
};
const defaultTopics: Topic[] = [{ name: "/foo/bar", datatype: "fooBar" }, { name: "/baz", datatype: "baz" }];
type GetMessages = (start: Time, end: Time, topics: string[]) => Promise<Message[]>;

export default class TestProvider implements DataProvider {
  _start: Time;
  _end: Time;
  _topics: Topic[];
  _datatypes: RosDatatypes;
  extensionPoint: ExtensionPoint;
  closed: boolean = false;

  constructor({ getMessages, topics }: { getMessages?: GetMessages, topics?: Topic[] } = {}) {
    this._start = defaultStart;
    this._end = defaultEnd;
    this._topics = topics ?? defaultTopics;
    this._datatypes = datatypes;
    if (getMessages) {
      this.getMessages = getMessages;
    }
  }

  initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this.extensionPoint = extensionPoint;
    return Promise.resolve({
      start: this._start,
      end: this._end,
      topics: this._topics,
      datatypes: this._datatypes,
      providesParsedMessages: true,
      messageDefinitionsByTopic: {},
    });
  }

  getMessages: GetMessages = (_start: Time, _end: Time, _topics: string[]): Promise<Message[]> => {
    throw new Error("not implemented");
  };

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}
