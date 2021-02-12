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
import MessageHistoryDEPRECATED, {
  type MessageHistoryData,
  type MessageHistoryItem,
} from "webviz-core/src/components/MessageHistoryDEPRECATED";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TopicToRenderMenu from "webviz-core/src/components/TopicToRenderMenu";
import { cast, type ReflectiveMessage, type Topic } from "webviz-core/src/players/types";
import { type Header } from "webviz-core/src/types/Messages";
import clipboard from "webviz-core/src/util/clipboard";
import { ROSOUT_TOPIC } from "webviz-core/src/util/globalConstants";

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
  topicToRender: string,
};

type Props = {
  config: Config,
  saveConfig: (Config) => void,
  topics: Topic[],
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

type RosgraphMsgs$Log = $ReadOnly<{|
  header: Header,
  level: number,
  name: string,
  msg: string,
  file: string,
  function: string,
  line: number,
  topics: $ReadOnlyArray<string>,
|}>;

export const getShouldDisplayMsg = (
  message: ReflectiveMessage,
  minLogLevel: number,
  searchTerms: string[]
): boolean => {
  const logMessage = cast<RosgraphMsgs$Log>(message.message);
  if (logMessage.level < minLogLevel) {
    return false;
  }

  if (searchTerms.length < 1) {
    // No search term filters so this message should be visible.
    return true;
  }
  const searchTermsInLowerCase = searchTerms.map((term) => term.toLowerCase());
  const { name, msg } = logMessage;
  const lowerCaseName = name.toLowerCase();
  const lowerCaseMsg = msg.toLowerCase();
  return searchTermsInLowerCase.some((term) => lowerCaseName.includes(term) || lowerCaseMsg.includes(term));
};

class RosoutPanel extends PureComponent<Props> {
  static defaultConfig = { searchTerms: [], minLogLevel: 1, topicToRender: ROSOUT_TOPIC };
  static panelType = "RosOut";

  _onNodeFilterChange = (selectedOptions: Option[]) => {
    this.props.saveConfig({ ...this.props.config, searchTerms: selectedOptions.map((option) => option.value) });
  };

  _onLogLevelChange = (minLogLevel: number) => {
    this.props.saveConfig({ ...this.props.config, minLogLevel });
  };

  _filterFn = (item: MessageHistoryItem) =>
    getShouldDisplayMsg(item.message, this.props.config.minLogLevel, this.props.config.searchTerms);

  _getFilteredMessages(items: $ReadOnlyArray<MessageHistoryItem>): $ReadOnlyArray<MessageHistoryItem> {
    const { minLogLevel, searchTerms } = this.props.config;
    const hasActiveFilters = minLogLevel > 1 || searchTerms.length > 0;
    if (!hasActiveFilters) {
      // This early return avoids looping over the full list with a filter that will always return true.
      return items;
    }
    return items.filter(this._filterFn);
  }

  _renderFiltersBar = (seenNodeNames: Set<string>, msgs: $ReadOnlyArray<MessageHistoryItem>) => {
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
          optionRenderer={({ key, style: styleProp, option, focusedOption }) => (
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
    const { topics, config } = this.props;
    const seenNodeNames = new Set();

    const topicToRenderMenu = (
      <TopicToRenderMenu
        topicToRender={config.topicToRender}
        onChange={(topicToRender) => this.props.saveConfig({ ...this.props.config, topicToRender })}
        topics={topics}
        singleTopicDatatype="rosgraph_msgs/Log"
        defaultTopicToRender={ROSOUT_TOPIC}
      />
    );

    return (
      <MessageHistoryDEPRECATED paths={[config.topicToRender]} historySize={100000}>
        {({ itemsByPath }: MessageHistoryData) => {
          const msgs: $ReadOnlyArray<MessageHistoryItem> = itemsByPath[config.topicToRender];
          msgs.forEach((msg) => seenNodeNames.add(cast<RosgraphMsgs$Log>(msg.message.message).name));

          return (
            <Flex col>
              <PanelToolbar floating helpContent={helpContent} additionalIcons={topicToRenderMenu}>
                {this._renderFiltersBar(seenNodeNames, msgs)}
              </PanelToolbar>
              <div className={styles.content}>
                <LogList items={this._getFilteredMessages(msgs)} renderRow={this._renderRow} />
              </div>
            </Flex>
          );
        }}
      </MessageHistoryDEPRECATED>
    );
  }
}

export default hot(Panel<Config>(RosoutPanel));
