// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { sortBy } from "lodash";
import * as React from "react";
import { hot } from "react-hot-loader/root";

import DiagnosticStatus from "./DiagnosticStatus";
import helpContent from "./DiagnosticStatusPanel.help.md";
import useDiagnostics, { type DiagnosticAutocompleteEntry } from "./useDiagnostics";
import { getDisplayName, trimHardwareId } from "./util";
import Autocomplete from "webviz-core/src/components/Autocomplete";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TopicToRenderMenu from "webviz-core/src/components/TopicToRenderMenu";
import type { Topic } from "webviz-core/src/players/types";
import type { PanelConfig } from "webviz-core/src/types/panels";
import { $DIAGNOSTICS } from "webviz-core/src/util/globalConstants";

export type Config = {
  selectedHardwareId?: ?string,
  selectedName?: ?string,
  splitFraction?: number,
  topicToRender: string,
  collapsedSections: { name: string, section: string }[],
};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
  topics: Topic[],
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
};
// component to display a single diagnostic status from list
function DiagnosticStatusPanel({ config, saveConfig, topics, openSiblingPanel }: Props) {
  const onSelect = React.useCallback((
    value: string,
    entry: DiagnosticAutocompleteEntry,
    autocomplete: Autocomplete
  ) => {
    const hasNewHardwareId = config.selectedHardwareId !== entry.hardware_id;
    const hasNewName = config.selectedName !== entry.name;
    saveConfig({
      selectedHardwareId: entry.hardware_id,
      selectedName: entry.name,
      collapsedSections: hasNewHardwareId || hasNewName ? [] : config.collapsedSections,
    });
    autocomplete.blur();
  }, [config, saveConfig]);

  const { selectedHardwareId, selectedName, splitFraction, topicToRender, collapsedSections = [] } = config;
  const topicToRenderMenu = React.useMemo(
    () => (
      <TopicToRenderMenu
        topicToRender={topicToRender}
        onChange={(newTopicToRender) => saveConfig({ topicToRender: newTopicToRender })}
        topics={topics}
        singleTopicDatatype={"diagnostic_msgs/DiagnosticArray"}
        defaultTopicToRender={$DIAGNOSTICS}
      />
    ),
    [topics, topicToRender, saveConfig]
  );

  const selectedDisplayName =
    selectedHardwareId != null ? getDisplayName(selectedHardwareId, selectedName || "") : null;
  const buffer = useDiagnostics(topicToRender);
  let selectedItem; // selected by name+hardware_id
  let selectedItems; // [selectedItem], or all diagnostics with selectedHardwareId if no name is selected
  if (selectedHardwareId != null) {
    const items = [];
    const diagnosticsByName = buffer.diagnosticsByNameByTrimmedHardwareId.get(trimHardwareId(selectedHardwareId));
    if (diagnosticsByName != null) {
      for (const diagnostic of diagnosticsByName.values()) {
        if (selectedName == null || selectedName === diagnostic.status.name) {
          items.push(diagnostic);
          if (selectedName != null) {
            selectedItem = diagnostic;
          }
        }
      }
    }
    selectedItems = items;
  }
  return (
    <Flex scroll scrollX col>
      <PanelToolbar floating helpContent={helpContent} additionalIcons={topicToRenderMenu}>
        <Autocomplete
          placeholder={selectedDisplayName ?? "Select a diagnostic"}
          items={buffer.sortedAutocompleteEntries}
          getItemText={(entry) => entry.displayName}
          getItemValue={(entry) => entry.id}
          onSelect={onSelect}
          selectedItem={selectedItem}
          inputStyle={{ height: "100%" }}
        />
      </PanelToolbar>
      {selectedItems && selectedItems.length ? (
        <Flex col scroll>
          {sortBy(selectedItems, ({ status }) => status.name.toLowerCase()).map((item) => (
            <DiagnosticStatus
              key={item.id}
              info={item}
              splitFraction={splitFraction}
              onChangeSplitFraction={(newSplitFraction) => saveConfig({ splitFraction: newSplitFraction })}
              topicToRender={topicToRender}
              openSiblingPanel={openSiblingPanel}
              saveConfig={saveConfig}
              collapsedSections={collapsedSections}
            />
          ))}
        </Flex>
      ) : selectedDisplayName ? (
        <EmptyState>
          Waiting for diagnostics from <br />
          <br />
          <code>{selectedDisplayName}</code>
        </EmptyState>
      ) : (
        <EmptyState>No diagnostic node selected</EmptyState>
      )}
    </Flex>
  );
}
DiagnosticStatusPanel.panelType = "DiagnosticStatusPanel";
DiagnosticStatusPanel.defaultConfig = ({ topicToRender: $DIAGNOSTICS, collapsedSections: [] }: Config);

export default hot(Panel<Config>(DiagnosticStatusPanel));
