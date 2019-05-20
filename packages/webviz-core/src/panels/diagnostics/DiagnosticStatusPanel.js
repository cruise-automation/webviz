// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { Component } from "react";

import DiagnosticsHistory, { type DiagnosticAutocompleteEntry } from "./DiagnosticsHistory";
import DiagnosticStatus from "./DiagnosticStatus";
import helpContent from "./DiagnosticStatusPanel.help.md";
import { getDiagnosticId, getDisplayName } from "./util";
import Autocomplete from "webviz-core/src/components/Autocomplete";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";

export type Config = {
  selectedHardwareId?: ?string,
  selectedName?: ?string,
  splitFraction?: number,
};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
};
// component to display a single diagnostic status from list
class DiagnosticStatusPanel extends Component<Props> {
  static panelType = "DiagnosticStatusPanel";
  static defaultConfig: Config = {};

  _onSelect = (value: string, entry: DiagnosticAutocompleteEntry, autocomplete: Autocomplete) => {
    this.props.saveConfig({
      selectedHardwareId: entry.hardware_id,
      selectedName: entry.name,
    });
    autocomplete.blur();
  };

  render() {
    const { selectedHardwareId, selectedName, splitFraction } = this.props.config;

    let hasSelection = false;
    let selectedId, selectedDisplayName;
    if (selectedHardwareId != null && selectedName != null) {
      hasSelection = true;
      selectedId = getDiagnosticId({ hardware_id: selectedHardwareId, name: selectedName, level: 0, message: "" });
      selectedDisplayName = hasSelection ? getDisplayName(selectedHardwareId, selectedName) : null;
    }

    return (
      <Flex scroll scrollX col>
        <DiagnosticsHistory>
          {(buffer) => {
            const selectedItem = selectedId ? buffer.diagnosticsById.get(selectedId) : null;

            return (
              <>
                <PanelToolbar helpContent={helpContent}>
                  <Autocomplete
                    placeholder={hasSelection ? selectedDisplayName : "Select a diagnostic"}
                    items={buffer.sortedAutocompleteEntries}
                    getItemText={(entry) => entry.displayName}
                    getItemValue={(entry) => entry.id}
                    onSelect={this._onSelect}
                    selectedItem={selectedItem}
                    inputStyle={{ height: "100%" }}
                  />
                </PanelToolbar>
                {selectedItem ? (
                  <DiagnosticStatus
                    info={selectedItem}
                    splitFraction={splitFraction}
                    onChangeSplitFraction={(splitFraction) => this.props.saveConfig({ splitFraction })}
                  />
                ) : selectedId ? (
                  <EmptyState>
                    Waiting for diagnostics from <code>{selectedDisplayName}</code>
                  </EmptyState>
                ) : (
                  <EmptyState>No diagnostic node selected</EmptyState>
                )}
              </>
            );
          }}
        </DiagnosticsHistory>
      </Flex>
    );
  }
}

export default Panel<Config>(DiagnosticStatusPanel);
