// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortedIndexBy } from "lodash";

import {
  type DiagnosticStatusArrayMsg,
  type DiagnosticsById,
  type DiagnosticId,
  computeDiagnosticInfo,
  getDiagnosticId,
  trimHardwareId,
} from "./util";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { Message } from "webviz-core/src/players/types";

export type DiagnosticAutocompleteEntry = {|
  name: ?string, // Null for "combined hardware_id" entries for showing diagnostics with any name.
  hardware_id: string,
  id: DiagnosticId,
  displayName: string,
  sortKey: string,
|};

export type DiagnosticsBuffer = {|
  diagnosticsByNameByTrimmedHardwareId: Map<string, DiagnosticsById>,
  sortedAutocompleteEntries: DiagnosticAutocompleteEntry[],
|};

// Returns whether the buffer has been modified
function maybeAddMessageToBuffer(buffer: DiagnosticsBuffer, message: Message): boolean {
  const { header, status: statusArray }: DiagnosticStatusArrayMsg = message.message;
  if (statusArray.length === 0) {
    return false;
  }

  for (const status of statusArray) {
    const info = computeDiagnosticInfo(status, header.stamp);
    let newHardwareId = false;
    let newDiagnostic = false;
    const trimmedHardwareId = trimHardwareId(status.hardware_id);
    const hardwareDiagnosticsByName = buffer.diagnosticsByNameByTrimmedHardwareId.get(trimmedHardwareId);
    if (hardwareDiagnosticsByName == null) {
      newHardwareId = true;
      newDiagnostic = true;
      buffer.diagnosticsByNameByTrimmedHardwareId.set(trimmedHardwareId, new Map([[status.name, info]]));
    } else {
      const previousNumberOfDiagnostics = hardwareDiagnosticsByName.size;
      hardwareDiagnosticsByName.set(status.name, info);
      newDiagnostic = hardwareDiagnosticsByName.size > previousNumberOfDiagnostics;
    }

    // add to sortedAutocompleteEntries if we haven't seen this id before
    if (newDiagnostic) {
      const newEntry = {
        hardware_id: status.hardware_id,
        name: status.name,
        id: info.id,
        displayName: info.displayName,
        sortKey: info.displayName.replace(/^\//, "").toLowerCase(),
      };
      const index = sortedIndexBy(buffer.sortedAutocompleteEntries, newEntry, "displayName");
      buffer.sortedAutocompleteEntries.splice(index, 0, newEntry);

      if (newHardwareId) {
        const newHardwareEntry = {
          hardware_id: info.status.hardware_id,
          id: getDiagnosticId(status.hardware_id),
          name: undefined,
          displayName: info.status.hardware_id,
          sortKey: info.status.hardware_id.replace(/^\//, "").toLowerCase(),
        };
        const hardwareIdx = sortedIndexBy(buffer.sortedAutocompleteEntries, newHardwareEntry, "displayName");
        buffer.sortedAutocompleteEntries.splice(hardwareIdx, 0, newHardwareEntry);
      }
    }
  }
  return true;
}

// Exported for tests
export function addMessages(buffer: DiagnosticsBuffer, messages: $ReadOnlyArray<Message>): DiagnosticsBuffer {
  // maybeAddMessageToBuffer mutates the buffer instead of doing an immutable update for performance
  // reasons. There are large numbers of diagnostics messages, and often many diagnostics panels in
  // a layout.
  let modified = false;
  for (const message of messages) {
    modified = maybeAddMessageToBuffer(buffer, message) || modified;
  }
  // We shallow-copy the buffer when it changes to help users know when to rerender.
  return modified ? { ...buffer } : buffer;
}

// Exported for tests
export function defaultDiagnosticsBuffer(): DiagnosticsBuffer {
  return {
    diagnosticsByNameByTrimmedHardwareId: new Map(),
    sortedAutocompleteEntries: [],
  };
}

export default function useDiagnostics(topic: string): DiagnosticsBuffer {
  return PanelAPI.useMessageReducer<DiagnosticsBuffer>({
    topics: [topic],
    restore: defaultDiagnosticsBuffer,
    addMessages,
  });
}
