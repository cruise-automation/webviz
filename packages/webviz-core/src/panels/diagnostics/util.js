// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortBy, truncate } from "lodash";
import type { Time } from "rosbag";

import { type DiagnosticsBuffer } from "webviz-core/src/panels/diagnostics/useDiagnostics";
import type { Header } from "webviz-core/src/types/Messages";
import fuzzyFilter from "webviz-core/src/util/fuzzyFilter";

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

// diagnostic_msgs/DiagnosticStatus
export type DiagnosticStatusMessage = {|
  name: string,
  hardware_id: string,
  level: Level,
  message: string,
  values: KeyValue[],
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

// Remove leading slash from hardware_id if present.
export function trimHardwareId(hardwareId: string): string {
  return hardwareId.startsWith("/") ? hardwareId.slice(1) : hardwareId;
}

export function getDiagnosticId(hardwareId: string, name: ?string): DiagnosticId {
  const trimmedHardwareId = trimHardwareId(hardwareId);
  return name != null ? `|${trimmedHardwareId}|${name}|` : `|${trimmedHardwareId}|`;
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
    id: getDiagnosticId(status.hardware_id, status.name),
    displayName,
  };
}

export function getDiagnosticsByLevel(buffer: DiagnosticsBuffer): {| [Level]: DiagnosticInfo[] |} {
  const ret = {
    [LEVELS.OK]: [],
    [LEVELS.WARN]: [],
    [LEVELS.ERROR]: [],
    [LEVELS.STALE]: [],
  };
  for (const diagnosticsByName of buffer.diagnosticsByNameByTrimmedHardwareId.values()) {
    for (const diagnostic of diagnosticsByName.values()) {
      ret[diagnostic.status.level].push(diagnostic);
    }
  }
  return ret;
}

export const getSortedDiagnostics = (
  nodes: DiagnosticInfo[],
  hardwareIdFilter: string,
  pinnedIds: DiagnosticId[]
): DiagnosticInfo[] => {
  const unpinnedNodes = nodes.filter(({ id }) => !pinnedIds.includes(id));
  if (!hardwareIdFilter) {
    return sortBy(unpinnedNodes, (info) => info.displayName.replace(/^\//, ""));
  }
  // fuzzyFilter sorts by match accuracy.
  return fuzzyFilter(unpinnedNodes, hardwareIdFilter, ({ displayName }) => displayName);
};
