// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import PinIcon from "@mdi/svg/svg/pin.svg";
import cx from "classnames";
import { sortBy, compact } from "lodash";
import * as React from "react"; // eslint-disable-line import/no-duplicates
import { hot } from "react-hot-loader/root";
import { List, AutoSizer } from "react-virtualized";

import type { Config as DiagnosticStatusConfig } from "./DiagnosticStatusPanel";
import helpContent from "./DiagnosticSummary.help.md";
import styles from "./DiagnosticSummary.module.scss";
import { LEVELS, type DiagnosticId, type DiagnosticInfo, getNodesByLevel } from "./util";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TopicToRenderMenu from "webviz-core/src/components/TopicToRenderMenu";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import DiagnosticsHistory from "webviz-core/src/panels/diagnostics/DiagnosticsHistory";
import type { Topic } from "webviz-core/src/players/types";
import type { PanelConfig } from "webviz-core/src/types/panels";
import { DIAGNOSTIC_TOPIC } from "webviz-core/src/util/globalConstants";
import toggle from "webviz-core/src/util/toggle";

const LevelClasses = {
  [LEVELS.OK]: styles.ok,
  [LEVELS.WARN]: styles.warn,
  [LEVELS.ERROR]: styles.error,
  [LEVELS.STALE]: styles.stale,
};

type NodeRowProps = {
  info: DiagnosticInfo,
  isPinned: boolean,
  onClick: (info: DiagnosticInfo) => void,
  onClickPin: (info: DiagnosticInfo) => void,
};
class NodeRow extends React.PureComponent<NodeRowProps> {
  onClick = () => {
    const { info, onClick } = this.props;
    onClick(info);
  };
  onClickPin = () => {
    const { info, onClickPin } = this.props;
    onClickPin(info);
  };

  render() {
    const { info, isPinned } = this.props;

    return (
      <div
        className={cx(LevelClasses[info.status.level], styles.nodeRow)}
        onClick={this.onClick}
        data-test-diagnostic-row>
        <Icon fade={!isPinned} onClick={this.onClickPin} className={cx(styles.pinIcon, { [styles.pinned]: isPinned })}>
          <PinIcon />
        </Icon>
        <span>{info.displayName}</span> &ndash; <span className={styles.message}>{info.status.message}</span>
      </div>
    );
  }
}

type Config = {| pinnedIds: DiagnosticId[], topicToRender: string, hardwareIdFilter: string |};
type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
  topics: Topic[],
};

const getSortedNodes = (nodes: DiagnosticInfo[], pinnedIds: DiagnosticId[]): DiagnosticInfo[] => {
  return sortBy(nodes.filter((info) => pinnedIds.indexOf(info.id) === -1), (info) =>
    info.displayName.replace(/^\//, "")
  );
};

class DiagnosticSummary extends React.Component<Props> {
  static panelType = "DiagnosticSummary";
  static defaultConfig = { ...getGlobalHooks().perPanelHooks().DiagnosticSummary.defaultConfig };

  togglePinned = (info: DiagnosticInfo) => {
    this.props.saveConfig({ pinnedIds: toggle(this.props.config.pinnedIds, info.id) });
  };

  showDetails = (info: DiagnosticInfo) => {
    this.props.openSiblingPanel(
      "DiagnosticStatusPanel",
      () =>
        ({
          selectedHardwareId: info.status.hardware_id,
          selectedName: info.status.name,
          topicToRender: this.props.config.topicToRender,
        }: DiagnosticStatusConfig)
    );
  };

  renderRow = ({ item, style, key, index }) => {
    return (
      <div key={key} style={style}>
        <NodeRow
          info={item}
          isPinned={this.props.config.pinnedIds.indexOf(item.id) !== -1}
          onClick={this.showDetails}
          onClickPin={this.togglePinned}
        />
      </div>
    );
  };

  renderHardwareFilter() {
    const {
      config: { hardwareIdFilter },
      saveConfig,
    } = this.props;
    return (
      <input
        style={{ width: "100%", padding: "0", background: "transparent", opacity: "0.5" }}
        value={hardwareIdFilter}
        placeholder={"Filter hardware id"}
        onChange={(e) => saveConfig({ hardwareIdFilter: e.target.value })}
      />
    );
  }

  renderTopicToRenderMenu = (topics) => {
    const {
      config: { topicToRender },
      saveConfig,
    } = this.props;
    return (
      <TopicToRenderMenu
        topicToRender={topicToRender}
        onChange={(newTopicToRender) => saveConfig({ topicToRender: newTopicToRender })}
        topics={topics}
        singleTopicDatatype={"diagnostic_msgs/DiagnosticArray"}
        defaultTopicToRender={DIAGNOSTIC_TOPIC}
      />
    );
  };

  render() {
    const {
      config: { topicToRender },
      topics,
    } = this.props;
    return (
      <Flex col className={styles.panel}>
        <PanelToolbar helpContent={helpContent} additionalIcons={this.renderTopicToRenderMenu(topics)}>
          {this.renderHardwareFilter()}
        </PanelToolbar>
        <Flex col>
          <DiagnosticsHistory topic={topicToRender}>
            {(buffer) => {
              if (buffer.diagnosticsById.size === 0) {
                return (
                  <EmptyState>
                    Waiting for <code>/diagnostics</code> messages
                  </EmptyState>
                );
              }
              const { pinnedIds, hardwareIdFilter } = this.props.config;
              const pinnedNodes = pinnedIds.map((id) => buffer.diagnosticsById.get(id));

              const nodes: DiagnosticInfo[] = [
                ...compact(pinnedNodes),
                ...getSortedNodes(getNodesByLevel(buffer, hardwareIdFilter, LEVELS.STALE), pinnedIds),
                ...getSortedNodes(getNodesByLevel(buffer, hardwareIdFilter, LEVELS.ERROR), pinnedIds),
                ...getSortedNodes(getNodesByLevel(buffer, hardwareIdFilter, LEVELS.WARN), pinnedIds),
                ...getSortedNodes(getNodesByLevel(buffer, hardwareIdFilter, LEVELS.OK), pinnedIds),
              ];
              return nodes.length === 0 ? null : (
                <AutoSizer>
                  {({ height, width }) => (
                    <List
                      width={width}
                      height={height}
                      style={{ outline: "none" }}
                      rowHeight={25}
                      rowRenderer={(rowProps) => this.renderRow({ ...rowProps, item: nodes[rowProps.index] })}
                      rowCount={nodes.length}
                      overscanRowCount={10}
                    />
                  )}
                </AutoSizer>
              );
            }}
          </DiagnosticsHistory>
        </Flex>
      </Flex>
    );
  }
}

export default hot(Panel<Config>(DiagnosticSummary));
