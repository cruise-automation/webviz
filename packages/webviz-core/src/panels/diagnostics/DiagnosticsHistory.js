// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortedIndexBy } from "lodash";
import * as React from "react";

import {
  type DiagnosticStatusArray,
  type DiagnosticsById,
  type DiagnosticId,
  type DiagnosticsByLevel,
  LEVELS,
  type Level,
  computeDiagnosticInfo,
} from "./util";
import { FrameCompatibility } from "webviz-core/src/components/MessageHistory/FrameCompatibility";
import type { Frame } from "webviz-core/src/types/players";
import { DIAGNOSTIC_TOPIC } from "webviz-core/src/util/globalConstants";

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
  children: (DiagnosticsBuffer) => React.Node,
  frame: Frame,
|};

class DiagnosticsHistory extends React.Component<Props> {
  _buffer: DiagnosticsBuffer = {
    diagnosticsById: new Map(),
    sortedAutocompleteEntries: [],
    diagnosticsByLevel: {
      [LEVELS.OK]: new Map(),
      [LEVELS.WARN]: new Map(),
      [LEVELS.ERROR]: new Map(),
      [LEVELS.STALE]: new Map(),
    },
  };

  render() {
    for (const message of this.props.frame[DIAGNOSTIC_TOPIC] || []) {
      const statusArray: DiagnosticStatusArray = message.message;
      for (const status of statusArray.status) {
        const info = computeDiagnosticInfo(status, statusArray.header.stamp);

        // update diagnosticsByLevel
        const keys: Level[] = (Object.keys(this._buffer.diagnosticsByLevel): any);
        for (const key of keys) {
          const diags = this._buffer.diagnosticsByLevel[key];

          if (status.level !== key && diags.has(info.id)) {
            diags.delete(info.id);
          }
        }
        if (status.level in this._buffer.diagnosticsByLevel) {
          this._buffer.diagnosticsByLevel[status.level].set(info.id, info);
        } else {
          console.warn("unrecognized status level", status);
        }

        // add to sortedAutocompleteEntries if we haven't seen this id before
        if (!this._buffer.diagnosticsById.has(info.id)) {
          const newEntry = {
            hardware_id: info.status.hardware_id,
            name: info.status.name,
            id: info.id,
            displayName: info.displayName,
            sortKey: info.displayName.replace(/^\//, "").toLowerCase(),
          };
          const index = sortedIndexBy(this._buffer.sortedAutocompleteEntries, newEntry, "displayName");
          this._buffer.sortedAutocompleteEntries.splice(index, 0, newEntry);
        }

        // update diagnosticsById
        this._buffer.diagnosticsById.set(info.id, info);
      }
    }

    return this.props.children(this._buffer);
  }
}

export default FrameCompatibility(DiagnosticsHistory, {
  topics: [DIAGNOSTIC_TOPIC],
  historySize: 2000,
});
