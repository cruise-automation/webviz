// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortedIndexBy } from "lodash";
import { type Node } from "react";

import {
  type DiagnosticStatusArrayMsg,
  type DiagnosticsById,
  type DiagnosticId,
  type DiagnosticsByLevel,
  type DiagnosticInfo,
  LEVELS,
  computeDiagnosticInfo,
} from "./util";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { Message } from "webviz-core/src/players/types";

export type DiagnosticAutocompleteEntry = {|
  name: string,
  hardware_id: string,
  id: DiagnosticId,
  displayName: string,
  sortKey: string,
|};

export type DiagnosticsBuffer = {|
  diagnosticsById: DiagnosticsById,
  sortedAutocompleteEntries: DiagnosticAutocompleteEntry[],
  diagnosticsByLevel: DiagnosticsByLevel,
  diagnosticsInOrderReceived: DiagnosticInfo[],
|};

type Props = {|
  children: (DiagnosticsBuffer) => Node,
  topic: string,
|};

// Exported for tests
export function addMessage(buffer: DiagnosticsBuffer, message: Message): DiagnosticsBuffer {
  const { header, status: statusArray }: DiagnosticStatusArrayMsg = message.message;
  if (statusArray.length === 0) {
    return buffer;
  }

  for (const status of statusArray) {
    const info = computeDiagnosticInfo(status, header.stamp);
    const oldInfo = buffer.diagnosticsById.get(info.id);
    const oldHardwareIdInfo = buffer.diagnosticsById.get(`|${info.id.split("|")[1]}|`);

    if (oldInfo) {
      buffer.diagnosticsInOrderReceived = buffer.diagnosticsInOrderReceived.map((node) =>
        node.id === info.id ? info : node
      );
    } else {
      buffer.diagnosticsInOrderReceived.push(info);
    }

    // update diagnosticsByLevel
    if (status.level in buffer.diagnosticsByLevel) {
      buffer.diagnosticsByLevel[status.level].set(info.id, info);
      buffer.diagnosticsById.set(info.id, info);
      buffer.diagnosticsById.set(oldHardwareIdInfo?.id || `|${info.id.split("|")[1]}|`, {
        ...oldHardwareIdInfo,
        status: { ...(oldHardwareIdInfo?.status || info.status), level: status.level, name: "" },
      });
      // Remove it from the old map if its level has changed.
      if (oldInfo && oldInfo.status.level !== status.level) {
        buffer.diagnosticsByLevel[oldInfo.status.level].delete(info.id);
      }
      if (oldHardwareIdInfo && oldHardwareIdInfo.status.level !== status.level) {
        buffer.diagnosticsByLevel[oldHardwareIdInfo.status.level].delete(oldHardwareIdInfo.id);
      }
    } else {
      console.warn("unrecognized status level", status);
    }

    // add to sortedAutocompleteEntries if we haven't seen this id before
    if (oldInfo === undefined) {
      const newEntry = {
        hardware_id: info.status.hardware_id,
        name: info.status.name,
        id: info.id,
        displayName: info.displayName,
        sortKey: info.displayName.replace(/^\//, "").toLowerCase(),
      };
      const index = sortedIndexBy(buffer.sortedAutocompleteEntries, newEntry, "displayName");
      buffer.sortedAutocompleteEntries.splice(index, 0, newEntry);
      buffer.diagnosticsById.set(info.id, info);

      if (oldHardwareIdInfo === undefined) {
        const newHardwareEntry = {
          hardware_id: info.status.hardware_id,
          id: `|${info.id.split("|")[1]}|`,
          name: "",
          displayName: info.status.hardware_id,
          sortKey: info.status.hardware_id.replace(/^\//, "").toLowerCase(),
        };
        const hardwareIdx = sortedIndexBy(buffer.sortedAutocompleteEntries, newHardwareEntry, "displayName");
        buffer.sortedAutocompleteEntries.splice(hardwareIdx, 0, newHardwareEntry);
        buffer.diagnosticsById.set(`|${info.id.split("|")[1]}|`, {
          ...info,
          id: `|${info.id.split("|")[1]}|`,
          displayName: info.status.hardware_id,
          status: { ...info.status, name: "" },
        });
      }
    }
  }
  return { ...buffer };
}

// Exported for tests
export function defaultDiagnosticsBuffer(): DiagnosticsBuffer {
  return {
    diagnosticsById: new Map(),
    sortedAutocompleteEntries: [],
    diagnosticsByLevel: {
      [LEVELS.OK]: new Map(),
      [LEVELS.WARN]: new Map(),
      [LEVELS.ERROR]: new Map(),
      [LEVELS.STALE]: new Map(),
    },
    diagnosticsInOrderReceived: [],
  };
}

export function useDiagnostics(topic: string): DiagnosticsBuffer {
  return PanelAPI.useMessageReducer<DiagnosticsBuffer>({
    topics: [topic],
    restore: defaultDiagnosticsBuffer,
    addMessage,
  });
}

export default function DiagnosticsHistory({ children, topic }: Props) {
  const diagnostics = useDiagnostics(topic);
  return children(diagnostics);
}
