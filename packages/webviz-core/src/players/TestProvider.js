// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { type Time } from "rosbag";

import {
  type ExtensionPoint,
  type InitializationResult,
  type DataProviderMessage,
  type DataProvider,
} from "webviz-core/src/dataProviders/types";
import { type Topic } from "webviz-core/src/players/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

const start = { sec: 0, nsec: 0 };
const end = { sec: 100, nsec: 0 };
const datatypes: RosDatatypes = {
  fooBar: [
    {
      name: "val",
      type: "number",
    },
  ],
  baz: [
    {
      name: "val",
      type: "number",
    },
  ],
};
const topics: Topic[] = [
  {
    name: "/foo/bar",
    datatype: "fooBar",
  },
  {
    name: "/baz",
    datatype: "baz",
  },
];

type GetMessages = (start: Time, end: Time, topics: string[]) => Promise<DataProviderMessage[]>;

export default class TestProvider implements DataProvider {
  _start: Time;
  _end: Time;
  _topics: Topic[];
  _datatypes: RosDatatypes;
  extensionPoint: ExtensionPoint;
  closed: boolean = false;

  constructor({ getMessages }: { getMessages: GetMessages } = {}) {
    this._start = start;
    this._end = end;
    this._topics = topics;
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
    });
  }

  getMessages: GetMessages = (start: Time, end: Time, topics: string[]): Promise<DataProviderMessage[]> => {
    throw new Error("not implemented");
  };

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}
