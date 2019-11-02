// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { hot } from "react-hot-loader/root";

import DiagnosticsHistory, { type DiagnosticAutocompleteEntry } from "./DiagnosticsHistory";
import DiagnosticStatus from "./DiagnosticStatus";
import helpContent from "./DiagnosticStatusPanel.help.md";
import { getDiagnosticId, getDisplayName } from "./util";
import Autocomplete from "webviz-core/src/components/Autocomplete";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TopicToRenderMenu from "webviz-core/src/components/TopicToRenderMenu";
import { DIAGNOSTIC_TOPIC } from "webviz-core/src/util/globalConstants";

export type Config = {
  selectedHardwareId?: ?string,
  selectedName?: ?string,
  splitFraction?: number,
  topicToRender: string,
};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
};
// component to display a single diagnostic status from list
class DiagnosticStatusPanel extends React.Component<Props> {
  static panelType = "DiagnosticStatusPanel";
  static defaultConfig: Config = { topicToRender: DIAGNOSTIC_TOPIC };

  _onSelect = (value: string, entry: DiagnosticAutocompleteEntry, autocomplete: Autocomplete) => {
    this.props.saveConfig({
      selectedHardwareId: entry.hardware_id,
      selectedName: entry.name,
    });
    autocomplete.blur();
  };

  renderTopicToRenderMenu = (topics) => {
    const {
      config: { topicToRender },
      saveConfig,
    } = this.props;
    return (
      <TopicToRenderMenu
        topicToRender={topicToRender}
        onChange={(topicToRender) => saveConfig({ topicToRender })}
        topics={topics}
        singleTopicDatatype={"diagnostic_msgs/DiagnosticArray"}
        defaultTopicToRender={DIAGNOSTIC_TOPIC}
      />
    );
  };

  render() {
    const { selectedHardwareId, selectedName, splitFraction, topicToRender } = this.props.config;

    let hasSelection = false;
    let selectedId, selectedDisplayName;
    if (selectedHardwareId != null && selectedName != null) {
      hasSelection = true;
      selectedId = getDiagnosticId({ hardware_id: selectedHardwareId, name: selectedName, level: 0, message: "" });
      selectedDisplayName = hasSelection ? getDisplayName(selectedHardwareId, selectedName) : null;
    }

    return (
      <Flex scroll scrollX col>
        <DiagnosticsHistory topic={topicToRender}>
          {({ buffer, allTopics }) => {
            const selectedItem = selectedId ? buffer.diagnosticsById.get(selectedId) : null;

            return (
              <>
                <PanelToolbar helpContent={helpContent} additionalIcons={this.renderTopicToRenderMenu(allTopics)}>
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

export default hot(Panel<Config>(DiagnosticStatusPanel));
