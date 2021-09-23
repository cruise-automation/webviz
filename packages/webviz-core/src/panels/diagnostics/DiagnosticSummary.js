// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import PinIcon from "@mdi/svg/svg/pin.svg";
import cx from "classnames";
import { compact } from "lodash";
import * as React from "react"; // eslint-disable-line import/no-duplicates
import { hot } from "react-hot-loader/root";
import { List, AutoSizer } from "react-virtualized";

import type { Config as DiagnosticStatusConfig } from "./DiagnosticStatusPanel";
import helpContent from "./DiagnosticSummary.help.md";
import styles from "./DiagnosticSummary.module.scss";
import { LEVELS, type DiagnosticId, type DiagnosticInfo, getDiagnosticsByLevel, getSortedDiagnostics } from "./util";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import { Item } from "webviz-core/src/components/Menu";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TopicToRenderMenu from "webviz-core/src/components/TopicToRenderMenu";
import filterMap from "webviz-core/src/filterMap";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import useDiagnostics, { type DiagnosticsBuffer } from "webviz-core/src/panels/diagnostics/useDiagnostics";
import type { Topic } from "webviz-core/src/players/types";
import type { PanelConfig } from "webviz-core/src/types/panels";
import { $DIAGNOSTICS } from "webviz-core/src/util/globalConstants";
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

type Config = {| pinnedIds: DiagnosticId[], topicToRender: string, hardwareIdFilter: string, sortByLevel?: boolean |};
type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
  topics: Topic[],
};

function DiagnosticSummary({ config, saveConfig, openSiblingPanel, topics }: Props) {
  const { hardwareIdFilter, topicToRender, sortByLevel = true } = config;

  const hardwareFilter = React.useMemo(
    () => (
      <input
        style={{ width: "100%", padding: "0", background: "transparent", opacity: "0.5" }}
        value={hardwareIdFilter}
        placeholder={"Filter hardware id"}
        onChange={(e) => saveConfig({ hardwareIdFilter: e.target.value })}
      />
    ),
    [hardwareIdFilter, saveConfig]
  );

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
    [topicToRender, topics, saveConfig]
  );

  const menuContent = React.useMemo(
    () => (
      <Item
        icon={sortByLevel ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
        onClick={() => saveConfig({ sortByLevel: !sortByLevel })}>
        Sort by level
      </Item>
    ),
    [saveConfig, sortByLevel]
  );

  const buffer = useDiagnostics(topicToRender);

  return (
    <Flex col className={styles.panel}>
      <PanelToolbar helpContent={helpContent} additionalIcons={topicToRenderMenu} menuContent={menuContent}>
        {hardwareFilter}
      </PanelToolbar>
      <Flex col>
        {buffer.diagnosticsByNameByTrimmedHardwareId.size === 0 ? (
          <EmptyState>
            Waiting for <code>{topicToRender}</code> messages
          </EmptyState>
        ) : (
          <SummaryPanelContents
            openSiblingPanel={openSiblingPanel}
            saveConfig={saveConfig}
            topics={topics}
            config={config}
            buffer={buffer}
          />
        )}
      </Flex>
    </Flex>
  );
}

function SummaryPanelContents({
  buffer,
  saveConfig,
  openSiblingPanel,
  config,
}: {
  ...Props,
  buffer: DiagnosticsBuffer,
}) {
  const { hardwareIdFilter, pinnedIds, topicToRender, sortByLevel = true } = config;

  const togglePinned = React.useCallback((info: DiagnosticInfo) => {
    saveConfig({ pinnedIds: toggle(config.pinnedIds, info.id) });
  }, [saveConfig, config.pinnedIds]);

  const showDetails = React.useCallback((info: DiagnosticInfo) => {
    openSiblingPanel(
      "DiagnosticStatusPanel",
      () =>
        ({
          selectedHardwareId: info.status.hardware_id,
          selectedName: info.status.name,
          topicToRender,
          collapsedSections: [],
        }: DiagnosticStatusConfig)
    );
  }, [openSiblingPanel, topicToRender]);

  const renderRow = ({ item, style, key }) => {
    return (
      <div key={key} style={style}>
        <NodeRow
          info={item}
          isPinned={pinnedIds.indexOf(item.id) !== -1}
          onClick={showDetails}
          onClickPin={togglePinned}
        />
      </div>
    );
  };

  const pinnedNodes = filterMap(pinnedIds, (id) => {
    const [_, trimmedHardwareId, name] = id.split("|");
    const diagnosticsByName = buffer.diagnosticsByNameByTrimmedHardwareId.get(trimmedHardwareId);
    if (diagnosticsByName == null) {
      return;
    }
    return diagnosticsByName.get(name);
  });

  const nodesByLevel = getDiagnosticsByLevel(buffer);
  const sortedNodes = sortByLevel
    ? [].concat(
        ...[LEVELS.STALE, LEVELS.ERROR, LEVELS.WARN, LEVELS.OK].map((level) =>
          getSortedDiagnostics(nodesByLevel[level], hardwareIdFilter, pinnedIds)
        )
      )
    : getSortedDiagnostics(
        [].concat(...[LEVELS.STALE, LEVELS.ERROR, LEVELS.WARN, LEVELS.OK].map((level) => nodesByLevel[level])),
        hardwareIdFilter,
        pinnedIds
      );

  const nodes: DiagnosticInfo[] = [...compact(pinnedNodes), ...sortedNodes];
  return !nodes.length ? null : (
    <AutoSizer>
      {({ height, width }) => (
        <List
          width={width}
          height={height}
          style={{ outline: "none" }}
          rowHeight={25}
          rowRenderer={(rowProps) => renderRow({ ...rowProps, item: nodes[rowProps.index] })}
          rowCount={nodes.length}
          overscanRowCount={10}
        />
      )}
    </AutoSizer>
  );
}

DiagnosticSummary.panelType = "DiagnosticSummary";
DiagnosticSummary.defaultConfig = { ...getGlobalHooks().perPanelHooks().DiagnosticSummary.defaultConfig };

export default hot(Panel<Config>(DiagnosticSummary));
