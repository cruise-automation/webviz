// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortBy, truncate } from "lodash";
import type { Time } from "rosbag";

import { type DiagnosticsBuffer } from "webviz-core/src/panels/diagnostics/DiagnosticsHistory";
import type { Header } from "webviz-core/src/types/Messages";

// Trim the message if it's too long. We sometimes get crazy massive messages here that can
// otherwise crash our entire UI. I looked at a bunch of messages manually and they are typically
// way smaller than 5KB, so this is a very generous maximum. But feel free to increase it more if
// necessary. Exported for tests.
export const MAX_STRING_LENGTH = 5000; // 5KB

export const LEVELS: { OK: 0, WARN: 1, ERROR: 2, STALE: 3 } = { OK: 0, WARN: 1, ERROR: 2, STALE: 3 };

export const LEVEL_NAMES = {
  [0]: "ok",
  [1]: "warn",
  [2]: "error",
  [3]: "stale",
};

interface ToString {
  toString(): string;
}

export type DiagnosticId = string & ToString;

export type Level = $Values<typeof LEVELS>;

export type KeyValue = {| key: string, value: string |};

export type DiagnosticStatusMessage = {|
  name: string,
  hardware_id: string,
  level: Level,
  message?: string,
  values?: KeyValue[],
|};

export type DiagnosticInfo = {|
  status: DiagnosticStatusMessage,
  stamp: Time,
  id: DiagnosticId,
  displayName: string,
|};

export type DiagnosticStatusArrayMsg = {|
  header: Header,
  status: DiagnosticStatusMessage[],
|};

export type DiagnosticsById = Map<DiagnosticId, DiagnosticInfo>;
export type DiagnosticsByLevel = {| [Level]: DiagnosticsById |};

export function getDiagnosticId(status: DiagnosticStatusMessage): DiagnosticId {
  // Remove leading slash from hardware_id if present.
  let hardware_id = status.hardware_id;
  if (hardware_id.startsWith("/")) {
    hardware_id = hardware_id.substring(1);
  }
  return status.name ? `|${hardware_id}|${status.name}|` : `|${hardware_id}|`;
}

export function getDisplayName(hardwareId: string, name: string) {
  if (name.indexOf(hardwareId) === 0) {
    return name;
  }
  return name ? `${hardwareId}: ${name}` : hardwareId;
}

// ensures the diagnostic status message's name consists of both the hardware id and the name
export function computeDiagnosticInfo(status: DiagnosticStatusMessage, stamp: Time): DiagnosticInfo {
  const displayName = getDisplayName(status.hardware_id, status.name);
  if (status.values && status.values.some(({ value }) => value.length > MAX_STRING_LENGTH)) {
    status = {
      ...status,
      values: status.values
        ? status.values.map((kv) =>
            kv.value.length > MAX_STRING_LENGTH
              ? { key: kv.key, value: truncate(kv.value, { length: MAX_STRING_LENGTH }) }
              : kv
          )
        : undefined,
    };
  }

  return {
    status,
    stamp,
    id: getDiagnosticId(status),
    displayName,
  };
}

export function getNodesByLevel(buffer: DiagnosticsBuffer, level: any): DiagnosticInfo[] {
  return Array.from(buffer.diagnosticsByLevel[level].values());
}

export const getSortedNodes = (
  nodes: DiagnosticInfo[],
  hardwareIdFilter: string,
  pinnedIds: DiagnosticId[]
): DiagnosticInfo[] => {
  return sortBy(
    nodes.filter(
      (info) =>
        pinnedIds.indexOf(info.id) === -1 &&
        (!hardwareIdFilter || (hardwareIdFilter && info.displayName.startsWith(hardwareIdFilter)))
    ),
    (info) => info.displayName.replace(/^\//, "")
  );
};
