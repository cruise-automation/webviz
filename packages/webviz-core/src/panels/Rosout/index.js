// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import React, { PureComponent } from "react";
import { Creatable as ReactSelectCreatable } from "react-select";
import VirtualizedSelect from "react-virtualized-select";
import { createSelector } from "reselect";

import helpContent from "./index.help.md";
import style from "./index.module.scss";
import LevelToString, { KNOWN_LOG_LEVELS } from "./LevelToString";
import LogMessage from "./LogMessage";
import logStyle from "./LogMessage.module.scss";
import Flex from "webviz-core/src/components/Flex";
import LargeList from "webviz-core/src/components/LargeList";
import MessageHistory, {
  type MessageHistoryData,
  type MessageHistoryItem,
} from "webviz-core/src/components/MessageHistory";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import type { Message } from "webviz-core/src/types/players";

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

type State = {
  disableAutoScroll: boolean,
};

const DEFAULT_CONFIG = { searchTerms: [], minLogLevel: 1 };
class RosoutPanel extends PureComponent<Props, State> {
  static defaultConfig = DEFAULT_CONFIG;
  static panelType = "RosOut";
  _prevConfig: Config = DEFAULT_CONFIG;

  state = { disableAutoScroll: false };

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

  _renderFiltersBar = (seenNodeNames: Set<string>) => {
    const { minLogLevel, searchTerms } = this.props.config;
    const nodeNameOptions = Array.from(seenNodeNames).map((name) => ({ label: name, value: name }));

    return (
      <div className={style.filtersBar}>
        <VirtualizedSelect
          className={cx(style.severityFilter)}
          clearable={false}
          searchable={false}
          value={minLogLevel}
          optionHeight={parseInt(style.optionHeight)}
          maxHeight={parseInt(style.optionHeight) * KNOWN_LOG_LEVELS.length}
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
          className={style.nodeFilter}
          clearable
          multi
          closeOnSelect={false}
          value={stringsToOptions(searchTerms)}
          onChange={this._onNodeFilterChange}
          options={nodeNameOptions}
          optionHeight={parseInt(style.optionHeight)}
          placeholder="Filter by node name or message text"
          searchable
          selectComponent={Creatable}
          promptTextCreator={(label) => `Node names or msgs containing "${label}"`}
        />
      </div>
    );
  };
  _renderRow({ item, style, key }) {
    return (
      <div key={key} style={style}>
        <LogMessage msg={item.message.message} />
      </div>
    );
  }

  render() {
    const seenNodeNames = new Set();
    const { disableAutoScroll } = this.state;

    return (
      <MessageHistory paths={["/rosout"]} historySize={100000}>
        {({ itemsByPath, cleared }: MessageHistoryData) => {
          const msgs = itemsByPath["/rosout"];
          msgs.forEach((msg) => seenNodeNames.add(msg.message.message.name));
          const configChanged = this._prevConfig !== this.props.config;
          this._prevConfig = this.props.config;

          return (
            <Flex className={style.message} col>
              <PanelToolbar floating helpContent={helpContent}>
                {this._renderFiltersBar(seenNodeNames)}
              </PanelToolbar>
              <div
                className={style.content}
                onScroll={({ target }) => {
                  const newDisableAutoScroll = target.scrollHeight - target.scrollTop > target.clientHeight;
                  if (newDisableAutoScroll !== disableAutoScroll) {
                    this.setState({ disableAutoScroll: newDisableAutoScroll });
                  }
                }}>
                <LargeList
                  disableScrollToBottom={disableAutoScroll}
                  cleared={cleared || configChanged}
                  items={this._getFilteredMessages(msgs)}
                  renderRow={this._renderRow}
                />
              </div>
            </Flex>
          );
        }}
      </MessageHistory>
    );
  }
}

export default Panel<Config>(RosoutPanel);
