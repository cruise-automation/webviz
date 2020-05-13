// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { addMessage, defaultDiagnosticsBuffer } from "./DiagnosticsHistory";
import { computeDiagnosticInfo, type Level, type DiagnosticInfo, LEVELS } from "./util";
import type { Message } from "webviz-core/src/players/types";

const messageAtLevel = (level: Level): Message => ({
  message: {
    status: [
      {
        level,
        name: "MCTM Logger",
        message: "No triggers since launch!",
        hardware_id: "mctm_logger",
        values: [],
      },
    ],
    header: { stamp: { sec: 1547062466, nsec: 1674890 } },
  },
  topic: "/foo",
  receiveTime: { sec: 1547062466, nsec: 1674890 },
  datatype: "bar",
  op: "message",
});

const diagnosticInfoAtLevel = (level: Level): DiagnosticInfo => {
  const { message } = messageAtLevel(level);
  return computeDiagnosticInfo(message.status[0], message.header.stamp);
};

describe("addMessage", () => {
  it("adds a message at the right warning level", () => {
    const message = messageAtLevel(LEVELS.OK);
    const info = diagnosticInfoAtLevel(LEVELS.OK);
    expect(addMessage(defaultDiagnosticsBuffer(), message)).toEqual({
      diagnosticsById: new Map([[info.id, info]]),
      diagnosticsByLevel: {
        [LEVELS.OK]: new Map([[info.id, info]]),
        [LEVELS.WARN]: new Map(),
        [LEVELS.ERROR]: new Map(),
        [LEVELS.STALE]: new Map(),
      },
      sortedAutocompleteEntries: [
        {
          displayName: info.displayName,
          hardware_id: info.status.hardware_id,
          id: info.id,
          name: info.status.name,
          sortKey: info.displayName.toLowerCase(),
        },
      ],
    });
  });

  it("can move a message from one level to another", () => {
    const message1 = messageAtLevel(LEVELS.OK);
    const message2 = messageAtLevel(LEVELS.ERROR);
    const info = diagnosticInfoAtLevel(LEVELS.ERROR);
    expect(addMessage(addMessage(defaultDiagnosticsBuffer(), message1), message2)).toEqual({
      diagnosticsById: new Map([[info.id, info]]),
      diagnosticsByLevel: {
        [LEVELS.OK]: new Map(),
        [LEVELS.WARN]: new Map(),
        [LEVELS.ERROR]: new Map([[info.id, info]]),
        [LEVELS.STALE]: new Map(),
      },
      sortedAutocompleteEntries: [
        {
          displayName: info.displayName,
          hardware_id: info.status.hardware_id,
          id: info.id,
          name: info.status.name,
          sortKey: info.displayName.toLowerCase(),
        },
      ],
    });
  });
});
