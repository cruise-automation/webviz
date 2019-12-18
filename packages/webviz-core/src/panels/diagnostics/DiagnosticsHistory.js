// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortedIndexBy } from "lodash";
import { useCallback, type Node } from "react";

import {
  type DiagnosticStatusArray,
  type DiagnosticsById,
  type DiagnosticId,
  type DiagnosticsByLevel,
  LEVELS,
  type Level,
  computeDiagnosticInfo,
} from "./util";
import * as PanelAPI from "webviz-core/src/PanelAPI";

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

export function useDiagnostics(topic: string): DiagnosticsBuffer {
  const { reducedValue: diagnostics } = PanelAPI.useMessages<DiagnosticsBuffer>({
    topics: [topic],

    restore: useCallback(
      () => ({
        diagnosticsById: new Map(),
        sortedAutocompleteEntries: [],
        diagnosticsByLevel: {
          [LEVELS.OK]: new Map(),
          [LEVELS.WARN]: new Map(),
          [LEVELS.ERROR]: new Map(),
          [LEVELS.STALE]: new Map(),
        },
      }),
      []
    ),

    addMessage: useCallback((buffer, message) => {
      const statusArray: DiagnosticStatusArray = message.message;
      if (statusArray.status.length === 0) {
        return buffer;
      }
      for (const status of statusArray.status) {
        const info = computeDiagnosticInfo(status, statusArray.header.stamp);

        // update diagnosticsByLevel
        const keys: Level[] = (Object.keys(buffer.diagnosticsByLevel): any);
        for (const key of keys) {
          const diags = buffer.diagnosticsByLevel[key];

          if (status.level !== key && diags.has(info.id)) {
            diags.delete(info.id);
          }
        }
        if (status.level in buffer.diagnosticsByLevel) {
          buffer.diagnosticsByLevel[status.level].set(info.id, info);
        } else {
          console.warn("unrecognized status level", status);
        }

        // add to sortedAutocompleteEntries if we haven't seen this id before
        if (!buffer.diagnosticsById.has(info.id)) {
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
    }, []),
  });

  return diagnostics;
}

export default function DiagnosticsHistory({ children, topic }: Props) {
  const diagnostics = useDiagnostics(topic);
  return children(diagnostics);
}
