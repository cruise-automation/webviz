// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ClipboardOutlineIcon from "@mdi/svg/svg/clipboard-outline.svg";
import cx from "classnames";
import React, { PureComponent } from "react";
import { hot } from "react-hot-loader/root";
import { Creatable as ReactSelectCreatable } from "react-select";
import VirtualizedSelect from "react-virtualized-select";
import { createSelector } from "reselect";

import helpContent from "./index.help.md";
import styles from "./index.module.scss";
import LevelToString, { KNOWN_LOG_LEVELS } from "./LevelToString";
import LogMessage from "./LogMessage";
import logStyle from "./LogMessage.module.scss";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import LogList from "webviz-core/src/components/LogList";
import MessageHistory, {
  type MessageHistoryData,
  type MessageHistoryItem,
} from "webviz-core/src/components/MessageHistory";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import type { Message } from "webviz-core/src/players/types";
import clipboard from "webviz-core/src/util/clipboard";

// Remove creatable warning https://github.com/JedWatson/react-select/issues/2181
class Creatable extends React.Component<{}, {}> {
  render() {
    return <ReactSelectCreatable {...this.props} />;
  }
}

type Option = {
  value: any,
  label: string,
};

type Config = {
  searchTerms: string[],
  minLogLevel: number,
};

type Props = {
  config: Config,
  saveConfig: (Config) => void,
};

// Create the log level options nodes once since they don't change per render.
const LOG_LEVEL_OPTIONS = KNOWN_LOG_LEVELS.map((level) => ({
  label: `>= ${LevelToString(level)}`,
  value: level,
}));

// Persist the identity of selectedOptions for React Creatable.
// Without it, we can't create new options.
export const stringsToOptions = createSelector<*, *, *, _>(
  (strs: string[]) => strs,
  (strs: string[]): Option[] => strs.map((value) => ({ label: value, value }))
);

export const getShouldDisplayMsg = (msg: Message, minLogLevel: number, searchTerms: string[]): boolean => {
  if (msg.message.level < minLogLevel) {
    return false;
  }

  if (searchTerms.length < 1) {
    // No search term filters so this message should be visible.
    return true;
  }
  const searchTermsInLowerCase = searchTerms.map((term) => term.toLowerCase());
  for (const searchTerm of searchTermsInLowerCase) {
    if (msg.message.name.toLowerCase().includes(searchTerm) || msg.message.msg.toLowerCase().includes(searchTerm)) {
      return true;
    }
  }
  return false;
};

class RosoutPanel extends PureComponent<Props> {
  static defaultConfig = { searchTerms: [], minLogLevel: 1 };
  static panelType = "RosOut";

  _onNodeFilterChange = (selectedOptions: Option[]) => {
    this.props.saveConfig({ ...this.props.config, searchTerms: selectedOptions.map((option) => option.value) });
  };

  _onLogLevelChange = (minLogLevel: number) => {
    this.props.saveConfig({ ...this.props.config, minLogLevel });
  };

  _filterFn = (item: MessageHistoryItem) =>
    getShouldDisplayMsg(item.message, this.props.config.minLogLevel, this.props.config.searchTerms);

  _getFilteredMessages(items: MessageHistoryItem[]): MessageHistoryItem[] {
    const { minLogLevel, searchTerms } = this.props.config;
    const hasActiveFilters = minLogLevel > 1 || searchTerms.length > 0;
    if (!hasActiveFilters) {
      // This early return avoids looping over the full list with a filter that will always return true.
      return items;
    }
    return items.filter(this._filterFn);
  }

  _renderFiltersBar = (seenNodeNames: Set<string>, msgs: MessageHistoryItem[]) => {
    const { minLogLevel, searchTerms } = this.props.config;
    const nodeNameOptions = Array.from(seenNodeNames).map((name) => ({ label: name, value: name }));

    return (
      <div className={styles.filtersBar}>
        <VirtualizedSelect
          className={cx(styles.severityFilter)}
          clearable={false}
          searchable={false}
          value={minLogLevel}
          optionHeight={parseInt(styles.optionHeight)}
          maxHeight={parseInt(styles.optionHeight) * KNOWN_LOG_LEVELS.length}
          options={LOG_LEVEL_OPTIONS}
          optionRenderer={({ key, style: styleProp, option, selectValue, focusedOption }) => (
            <div
              className={cx(logStyle[LevelToString(option.value).toLowerCase()], "VirtualizedSelectOption", {
                VirtualizedSelectFocusedOption: focusedOption === option,
              })}
              style={styleProp}
              onClick={() => this._onLogLevelChange(option.value)}
              key={key}>
              {option.label}
            </div>
          )}
          valueComponent={(option) => <span>{`Min Severity: ${LevelToString(option.value.value)}`}</span>}
        />
        <VirtualizedSelect
          className={styles.nodeFilter}
          clearable
          multi
          closeOnSelect={false}
          value={stringsToOptions(searchTerms)}
          onChange={this._onNodeFilterChange}
          options={nodeNameOptions}
          optionHeight={parseInt(styles.optionHeight)}
          placeholder="Filter by node name or message text"
          searchable
          selectComponent={Creatable}
          promptTextCreator={(label) => `Node names or msgs containing "${label}"`}
        />
        <div className={styles.itemsCountField}>
          {msgs.length} {msgs.length === 1 ? "item" : "items"}
          <Icon
            style={{ padding: "1px 0px 0px 6px" }}
            onClick={() => {
              clipboard.copy(JSON.stringify(msgs, null, 2));
            }}
            tooltip="Copy rosout to clipboard">
            <ClipboardOutlineIcon />
          </Icon>
        </div>
      </div>
    );
  };
  _renderRow({ item, style, key, index }) {
    return (
      <div key={key} style={index === 0 ? { ...style, paddingTop: 36 } : style}>
        <LogMessage msg={item.message.message} />
      </div>
    );
  }

  render() {
    const seenNodeNames = new Set();
    return (
      <MessageHistory paths={["/rosout"]} historySize={100000}>
        {({ itemsByPath }: MessageHistoryData) => {
          const msgs: MessageHistoryItem[] = itemsByPath["/rosout"];
          msgs.forEach((msg) => seenNodeNames.add(msg.message.message.name));

          return (
            <Flex col>
              <PanelToolbar floating helpContent={helpContent}>
                {this._renderFiltersBar(seenNodeNames, msgs)}
              </PanelToolbar>
              <div className={styles.content}>
                <LogList items={this._getFilteredMessages(msgs)} renderRow={this._renderRow} />
              </div>
            </Flex>
          );
        }}
      </MessageHistory>
    );
  }
}

export default hot(Panel<Config>(RosoutPanel));
