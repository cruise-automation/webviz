// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { addMessages, defaultDiagnosticsBuffer } from "./useDiagnostics";
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
});

const diagnosticInfoAtLevel = (level: Level): DiagnosticInfo => {
  const { message } = messageAtLevel(level);
  return computeDiagnosticInfo(message.status[0], message.header.stamp);
};

describe("addMessages", () => {
  it("adds a message at the right warning level", () => {
    const message = messageAtLevel(LEVELS.OK);
    const info = diagnosticInfoAtLevel(LEVELS.OK);
    const hardwareId = `|${info.status.hardware_id}|`;
    expect(addMessages(defaultDiagnosticsBuffer(), [message])).toEqual({
      diagnosticsByNameByTrimmedHardwareId: new Map([[info.status.hardware_id, new Map([[info.status.name, info]])]]),
      sortedAutocompleteEntries: [
        {
          displayName: info.status.hardware_id,
          hardware_id: info.status.hardware_id,
          id: hardwareId,
          name: undefined,
          sortKey: info.status.hardware_id.toLowerCase(),
        },
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
    const hardwareId = `|${info.status.hardware_id}|`;
    expect(addMessages(defaultDiagnosticsBuffer(), [message1, message2])).toEqual({
      diagnosticsByNameByTrimmedHardwareId: new Map([[info.status.hardware_id, new Map([[info.status.name, info]])]]),
      sortedAutocompleteEntries: [
        {
          displayName: info.status.hardware_id,
          hardware_id: info.status.hardware_id,
          id: hardwareId,
          name: undefined,
          sortKey: info.status.hardware_id.toLowerCase(),
        },
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
