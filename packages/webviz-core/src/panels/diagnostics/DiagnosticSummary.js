// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import PinIcon from "@mdi/svg/svg/pin.svg";
import cx from "classnames";
import { sortBy, compact } from "lodash";
import React from "react";

import DiagnosticsHistory from "./DiagnosticsHistory";
import type { Config as DiagnosticStatusConfig } from "./DiagnosticStatusPanel";
import helpContent from "./DiagnosticSummary.help.md";
import styles from "./DiagnosticSummary.module.scss";
import { LEVELS, type DiagnosticId, type DiagnosticInfo } from "./util";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import LargeList from "webviz-core/src/components/LargeList";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { PanelConfig } from "webviz-core/src/types/panels";
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
      <div className={cx(LevelClasses[info.status.level], styles.nodeRow)} onClick={this.onClick}>
        <Icon fade={!isPinned} onClick={this.onClickPin} className={cx(styles.pinIcon, { [styles.pinned]: isPinned })}>
          <PinIcon />
        </Icon>
        <span>{info.displayName}</span> &ndash; <span className={styles.message}>{info.status.message}</span>
      </div>
    );
  }
}

type Config = {| pinnedIds: DiagnosticId[] |};
type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
};

const getSortedNodes = (nodes: DiagnosticInfo[], pinnedIds: DiagnosticId[]): DiagnosticInfo[] => {
  return sortBy(nodes.filter((info) => pinnedIds.indexOf(info.id) === -1), (info) =>
    info.displayName.replace(/^\//, "")
  );
};

class DiagnosticSummary extends React.Component<Props> {
  static panelType = "DiagnosticSummary";
  static defaultConfig = getGlobalHooks().perPanelHooks().DiagnosticSummary.defaultConfig;

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

  render() {
    return (
      <Flex col className={styles.panel}>
        <PanelToolbar floating helpContent={helpContent} />
        <Flex col scroll scrollX>
          <DiagnosticsHistory>
            {(buffer) => {
              if (buffer.diagnosticsById.size === 0) {
                return (
                  <EmptyState>
                    Waiting for <code>/diagnostics</code> messages
                  </EmptyState>
                );
              }

              const { pinnedIds } = this.props.config;
              const pinnedNodes = pinnedIds.map((id) => buffer.diagnosticsById.get(id));

              const nodes: DiagnosticInfo[] = [
                ...compact(pinnedNodes),
                ...getSortedNodes(Array.from(buffer.diagnosticsByLevel[LEVELS.STALE].values()), pinnedIds),
                ...getSortedNodes(Array.from(buffer.diagnosticsByLevel[LEVELS.ERROR].values()), pinnedIds),
                ...getSortedNodes(Array.from(buffer.diagnosticsByLevel[LEVELS.WARN].values()), pinnedIds),
                ...getSortedNodes(Array.from(buffer.diagnosticsByLevel[LEVELS.OK].values()), pinnedIds),
              ];

              return nodes.length === 0 ? null : (
                <LargeList defaultRowHeight={25} items={nodes} disableScrollToBottom renderRow={this.renderRow} />
              );
            }}
          </DiagnosticsHistory>
        </Flex>
      </Flex>
    );
  }
}

export default Panel<Config>(DiagnosticSummary);
