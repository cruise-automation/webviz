// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Time } from "rosbag";

import type { Header } from "webviz-core/src/types/Messages";

export const LEVELS: { OK: 0, WARN: 1, ERROR: 2, STALE: 3 } = { OK: 0, WARN: 1, ERROR: 2, STALE: 3 };

export const LEVEL_NAMES = {
  [0]: "ok",
  [1]: "warn",
  [2]: "error",
  [3]: "stale",
};

opaque type _DiagnosticId = string;
interface ToString {
  toString(): string;
}

export type DiagnosticId = _DiagnosticId & ToString;

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

export type DiagnosticStatusArray = {|
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
  return `|${hardware_id}|${status.name}|`;
}

export function getDisplayName(hardwareId: string, name: string) {
  if (name.indexOf(hardwareId) === 0) {
    return name;
  }
  return `${hardwareId}: ${name}`;
}

// ensures the diagnostic status message's name consists of both the hardware id and the name
export function computeDiagnosticInfo(status: DiagnosticStatusMessage, stamp: Time): DiagnosticInfo {
  const displayName = getDisplayName(status.hardware_id, status.name);
  return {
    status,
    stamp,
    id: getDiagnosticId(status),
    displayName,
  };
}
