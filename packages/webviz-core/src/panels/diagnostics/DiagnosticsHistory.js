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
  type DiagnosticStatusArray,
  type DiagnosticsById,
  type DiagnosticId,
  type DiagnosticsByLevel,
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
|};

type Props = {|
  children: (DiagnosticsBuffer) => Node,
  topic: string,
|};

// Exported for tests
export function addMessage(buffer: DiagnosticsBuffer, message: Message): DiagnosticsBuffer {
  const statusArray: DiagnosticStatusArray = message.message;
  if (statusArray.status.length === 0) {
    return buffer;
  }
  for (const status of statusArray.status) {
    const info = computeDiagnosticInfo(status, statusArray.header.stamp);

    const oldInfo = buffer.diagnosticsById.get(info.id);

    // update diagnosticsByLevel
    if (status.level in buffer.diagnosticsByLevel) {
      buffer.diagnosticsByLevel[status.level].set(info.id, info);
      // Remove it from the old map if its level has changed.
      if (oldInfo && oldInfo.status.level !== status.level) {
        buffer.diagnosticsByLevel[oldInfo.status.level].delete(info.id);
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
    }

    // update diagnosticsById
    buffer.diagnosticsById.set(info.id, info);
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
