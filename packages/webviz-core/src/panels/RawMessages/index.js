// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChartBubbleIcon from "@mdi/svg/svg/chart-bubble.svg";
import ChartLineVariantIcon from "@mdi/svg/svg/chart-line-variant.svg";
import ClipboardOutlineIcon from "@mdi/svg/svg/clipboard-outline.svg";
import ConsoleLineIcon from "@mdi/svg/svg/console-line.svg";
import TargetIcon from "@mdi/svg/svg/target.svg";
import LessIcon from "@mdi/svg/svg/unfold-less-horizontal.svg";
import MoreIcon from "@mdi/svg/svg/unfold-more-horizontal.svg";
import { cloneDeepWith, first, last, uniq } from "lodash";
import * as React from "react";
import ReactHoverObserver from "react-hover-observer";
import Tree from "react-json-tree";
import styled from "styled-components";

import { type ValueAction, getValueActionForValue, getStructureItemForPath } from "./getValueActionForValue";
import helpContent from "./index.help.md";
import styles from "./index.module.scss";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import MessageHistory, {
  type MessageHistoryData,
  type MessageHistoryMetadata,
  type MessageHistoryQueriedDatum,
  isTypicalFilterName,
} from "webviz-core/src/components/MessageHistory";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import Plot, { type PlotConfig, plotableRosTypes } from "webviz-core/src/panels/Plot";
import { enumValuesByDatatypeAndField } from "webviz-core/src/selectors";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { PanelConfig } from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import clipboard from "webviz-core/src/util/clipboard";
import { format, formatDuration } from "webviz-core/src/util/time";

const DURATION_20_YEARS_SEC = 20 * 365 * 24 * 60 * 60;
const DATA_ARRAY_PREVIEW_LIMIT = 20;

const SMetadata = styled.div`
  margin-top: 4px;
  font-size: 11px;
  color: #aaa;
`;

function getItemString(type, data, itemType, itemString) {
  const keys = Object.keys(data);
  if (keys.length === 2) {
    const { sec, nsec } = data;
    if (sec != null && nsec != null) {
      // Values "too small" to be absolute epoch-based times are probably relative durations.
      if (sec < DURATION_20_YEARS_SEC) {
        return formatDuration(data);
      }
      return <span>{format(data)}</span>;
    }
  }

  // for vectors/points display length
  if (keys.length === 2) {
    const { x, y } = data;
    if (x != null && y != null) {
      const length = Math.sqrt(x * x + y * y);
      return <span> norm = {length.toFixed(2)} </span>;
    }
  }

  if (keys.length === 3) {
    const { x, y, z } = data;
    if (x != null && y != null && z != null) {
      const length = Math.sqrt(x * x + y * y + z * z);
      return <span> norm = {length.toFixed(2)} </span>;
    }
  }

  // Surface typically-used keys directly in the object summary so the user doesn't have to expand it.
  const filterKeys = keys.filter(isTypicalFilterName);
  if (filterKeys.length > 0) {
    itemString = filterKeys.map((key) => `${key}: ${data[key]}`).join(", ");
  }
  return (
    <span>
      {itemType} {itemString}
    </span>
  );
}

const ROS_COMMON_MSGS = new Set([
  "actionlib_msgs",
  "diagnostic_msgs",
  "geometry_msgs",
  "nav_msgs",
  "sensor_msgs",
  "shape_msgs",
  "std_msgs",
  "stereo_msgs",
  "trajectory_msgs",
  "visualization_msgs",
]);

function getMessageDocumentationLink(datatype: string): ?string {
  const parts = datatype.split("/");
  const pkg = first(parts);
  const filename = last(parts);
  if (ROS_COMMON_MSGS.has(pkg)) {
    return `http://docs.ros.org/api/${pkg}/html/msg/${filename}.html`;
  }
  return getGlobalHooks()
    .perPanelHooks()
    .RawMessages.docLinkFunction(filename);
}

type Config = {|
  topicName: string,
|};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
  datatypes: RosDatatypes,
};

type State = {|
  // When expandAll is unset, we'll use expandedFields to get expanded info
  expandAll: ?boolean,
  expandedFields: Set<string>,
|};

class RawMessages extends React.PureComponent<Props, State> {
  static defaultConfig = { topicName: "" };
  static panelType = "RawMessages";

  state = { expandAll: false, expandedFields: new Set() };

  _onChange = (topicName: string) => {
    this.props.saveConfig({ topicName });
  };

  _toggleExpandAll = () => {
    const expandAll = !this.state.expandAll;
    this.state.expandedFields.clear();
    this.setState({ expandAll });
  };

  _onLabelClick = (keypath) => {
    // Create a unique key according to the keypath / raw
    const key = keypath.join("~");
    if (this.state.expandedFields.has(key)) {
      this.state.expandedFields.delete(key);
    } else {
      this.state.expandedFields.add(key);
    }
    this.setState({ expandAll: null });
  };

  _renderIcons = (valueAction: ValueAction, basePath: string): React.Node => {
    if (valueAction.type === "pivot") {
      const { pivotPath } = valueAction;
      return (
        <Icon
          fade
          className={styles.icon}
          onClick={() => this._onChange(`${basePath}${pivotPath}`)}
          tooltip="Pivot on this value"
          key="pivot">
          <TargetIcon />
        </Icon>
      );
    }

    const { singleSlicePath, multiSlicePath, primitiveType } = valueAction;

    return (
      <span>
        {plotableRosTypes.includes(primitiveType) && (
          <Icon
            fade
            className={styles.icon}
            onClick={() =>
              this.props.openSiblingPanel(
                // $FlowFixMe: https://stackoverflow.com/questions/52508434/adding-static-variable-to-union-of-class-types
                Plot.panelType,
                (config: PlotConfig) =>
                  ({
                    ...config,
                    paths: uniq(
                      config.paths.concat([
                        { value: `${basePath}${singleSlicePath}`, enabled: true, timestampMethod: "receiveTime" },
                      ])
                    ),
                  }: PlotConfig)
              )
            }
            tooltip="Line chart">
            <ChartLineVariantIcon />
          </Icon>
        )}
        {plotableRosTypes.includes(primitiveType) && multiSlicePath !== singleSlicePath && (
          <Icon
            fade
            className={styles.icon}
            onClick={() =>
              this.props.openSiblingPanel(
                // $FlowFixMe: https://stackoverflow.com/questions/52508434/adding-static-variable-to-union-of-class-types
                Plot.panelType,
                (config: PlotConfig) =>
                  ({
                    ...config,
                    paths: uniq(
                      config.paths.concat([
                        { value: `${basePath}${multiSlicePath}`, enabled: true, timestampMethod: "receiveTime" },
                      ])
                    ),
                  }: PlotConfig)
              )
            }
            tooltip="Scatter plot">
            <ChartBubbleIcon />
          </Icon>
        )}
      </span>
    );
  };

  _valueRenderer = (
    metadata: ?MessageHistoryMetadata,
    data: mixed[],
    queriedData: MessageHistoryQueriedDatum[],
    label: string,
    itemValue: mixed,
    ...keyPath: (number | string)[]
  ) => (
    <ReactHoverObserver className={styles.iconWrapper}>
      {({ isHovering }) => {
        // $FlowFixMe: We make sure to always pass in a number at the end, but that's hard to express in Flow.
        const lastKeyPath: number = last(keyPath);
        let valueAction: ?ValueAction;
        if (isHovering && metadata) {
          valueAction = getValueActionForValue(
            data[lastKeyPath],
            metadata.structureItem,
            keyPath.slice(0, -1).reverse()
          );
        }

        let constantName: ?string;
        if (metadata) {
          const structureItem = getStructureItemForPath(
            metadata.structureItem,
            keyPath
              .slice(0, -1)
              .reverse()
              .join(",")
          );
          const { datatypes } = this.props;
          if (structureItem) {
            const field = keyPath[0];
            if (typeof field === "string") {
              const enumMapping = enumValuesByDatatypeAndField(datatypes);
              const datatype = structureItem.datatype;
              if (enumMapping[datatype] && enumMapping[datatype][field] && enumMapping[datatype][field][itemValue]) {
                constantName = enumMapping[datatype][field][itemValue];
              }
            }
          }
        }
        const basePath: string = queriedData[lastKeyPath].path;
        let itemLabel = label;
        // output preview for the first x items if the data is in binary format
        // sample output: Int8Array(331776) [-4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, ...]
        let smallNumberArrayStr = "";
        if (ArrayBuffer.isView(itemValue)) {
          // $FlowFixMe flow doesn't know itemValue is an array
          smallNumberArrayStr = `(${itemValue.length}) [${itemValue.slice(0, DATA_ARRAY_PREVIEW_LIMIT).join(", ")}${
            // $FlowFixMe
            itemValue.length >= DATA_ARRAY_PREVIEW_LIMIT ? ", ..." : ""
          }] `;
          // $FlowFixMe
          itemLabel = itemValue.constructor.name;
        }
        if (constantName) {
          itemLabel = `${itemLabel} (${constantName})`;
        }
        return (
          <span>
            {itemLabel}
            {smallNumberArrayStr && (
              <>
                {smallNumberArrayStr}
                <Icon
                  fade
                  className={styles.icon}
                  onClick={() => console.log(itemValue)}
                  tooltip="Log data to browser console">
                  <ConsoleLineIcon />
                </Icon>
              </>
            )}
            {valueAction && this._renderIcons(valueAction, basePath)}
          </span>
        );
      }}
    </ReactHoverObserver>
  );

  _renderTopic = () => {
    const { topicName } = this.props.config;
    const { expandAll, expandedFields } = this.state;

    let shouldExpandNode;

    if (expandAll !== null) {
      shouldExpandNode = () => expandAll;
    } else {
      shouldExpandNode = (keypath, data, level) => {
        return expandedFields.has(keypath.join("~"));
      };
    }

    if (!topicName) {
      return <EmptyState>No topic selected</EmptyState>;
    }

    return (
      <MessageHistory ignoreMissing paths={[topicName]} historySize={1}>
        {({ itemsByPath, metadataByPath }: MessageHistoryData) => {
          const item = itemsByPath[topicName][0];
          const metadata = metadataByPath[topicName];

          if (!item) {
            return <EmptyState>Waiting for next message</EmptyState>;
          }

          let data = item.queriedData.map(({ value }) => (value: any));

          const hideWrappingArray = item.queriedData.length === 1 && typeof data[0] === "object";
          if (hideWrappingArray) {
            data = data[0];
          }

          const link = getMessageDocumentationLink(item.message.datatype);
          const isSingleElemArray = Array.isArray(data) && data.length === 1 && typeof data[0] !== "object";
          const shouldDisplaySingleVal = typeof data !== "object" || isSingleElemArray;
          const singleVal = isSingleElemArray ? data[0] : data;
          return (
            <Flex col clip scroll className={styles.container}>
              <SMetadata>
                <span
                  onClick={(e: SyntheticMouseEvent<HTMLSpanElement>) => {
                    e.stopPropagation();
                    e.preventDefault();

                    const dataWithoutLargeArrays = cloneDeepWith(data, (value) => {
                      if (typeof value === "object" && value.buffer) {
                        return "<buffer>";
                      }
                    });
                    clipboard.copy(JSON.stringify(dataWithoutLargeArrays, null, 2) || "");
                  }}>
                  <Icon>
                    <ClipboardOutlineIcon style={{ verticalAlign: "middle" }} />
                  </Icon>
                </span>{" "}
                {link ? (
                  <a style={{ color: "inherit" }} target="_blank" rel="noopener noreferrer" href={link}>
                    {item.message.datatype}
                  </a>
                ) : (
                  item.message.datatype
                )}
                {item.message.receiveTime && ` received at ${format(item.message.receiveTime)}`}
              </SMetadata>
              {data !== undefined &&
                (shouldDisplaySingleVal ? (
                  <div className={styles.singleVal}>{String(singleVal)}</div>
                ) : (
                  <Tree
                    labelRenderer={(raw) => (
                      <span style={{ padding: "0 4px" }} onClick={() => this._onLabelClick(raw)}>
                        {first(raw)}
                      </span>
                    )}
                    shouldExpandNode={shouldExpandNode}
                    hideRoot
                    invertTheme={false}
                    getItemString={getItemString}
                    valueRenderer={(...args) => {
                      if (hideWrappingArray) {
                        // When the wrapping array is hidden, put it back here.
                        return this._valueRenderer(metadata, [data], item.queriedData, ...args, 0);
                      }
                      return this._valueRenderer(metadata, data, item.queriedData, ...args);
                    }}
                    theme={{ base00: colors.panelBackground, tree: { margin: 0 } }}
                    data={data}
                  />
                ))}
            </Flex>
          );
        }}
      </MessageHistory>
    );
  };

  render() {
    const { topicName } = this.props.config;
    const { expandAll } = this.state;

    return (
      <Flex col clip style={{ position: "relative" }}>
        <PanelToolbar helpContent={helpContent}>
          <Icon tooltip={expandAll ? "Collapse all" : "Expand all"} medium fade onClick={this._toggleExpandAll}>
            {expandAll ? <LessIcon /> : <MoreIcon />}
          </Icon>
          <MessageHistory.Input path={topicName} onChange={this._onChange} inputStyle={{ height: "100%" }} />
        </PanelToolbar>
        {this._renderTopic()}
      </Flex>
    );
  }
}

export default Panel<Config>(RawMessages);
