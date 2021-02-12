// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { MessageReader, parseMessageDefinition } from "rosbag";

import { FREEZE_MESSAGES } from "webviz-core/src/util/globalConstants";

class ReaderItem {
  md5: string;
  reader: MessageReader;

  constructor(md5: string, messageDefinition: string) {
    this.md5 = md5;
    this.reader = new MessageReader(parseMessageDefinition(messageDefinition), { freeze: FREEZE_MESSAGES });
  }
}

export default class MessageReaderStore {
  storage: { [type: string]: ReaderItem } = {};

  get(type: string, md5: string, messageDefinition: string): MessageReader {
    let item = this.storage[type];
    if (!item) {
      item = new ReaderItem(md5, messageDefinition);
      this.storage[type] = item;
    }
    if (item.md5 !== md5) {
      delete this.storage[type];
      item = new ReaderItem(md5, messageDefinition);
      this.storage[type] = item;
    }
    return item.reader;
  }
}
