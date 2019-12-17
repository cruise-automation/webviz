// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import ConsoleLineIcon from "@mdi/svg/svg/console-line.svg";
import LessIcon from "@mdi/svg/svg/unfold-less-horizontal.svg";
import MoreIcon from "@mdi/svg/svg/unfold-more-horizontal.svg";
import { first, get, last } from "lodash";
import React, { useState, useCallback, useMemo } from "react";
import { hot } from "react-hot-loader/root";
import ReactHoverObserver from "react-hover-observer";
import Tree from "react-json-tree";

import { DiffSettings, HighlightedValue, SDiffSpan } from "./Diff";
import { type ValueAction, getValueActionForValue, getStructureItemForPath } from "./getValueActionForValue";
import helpContent from "./index.help.md";
import styles from "./index.module.scss";
import Metadata, { SMetadata } from "./Metadata";
import RawMessagesIcons from "./RawMessagesIcons";
import { DATA_ARRAY_PREVIEW_LIMIT, getMessageDocumentationLink, getItemString, getItemStringForDiff } from "./utils";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import MessageHistory, {
  MessageHistoryInput,
  type MessageHistoryData,
  type MessageHistoryMetadata,
  type MessageHistoryQueriedDatum,
} from "webviz-core/src/components/MessageHistory";
import { splitTopicPathOnTopicName } from "webviz-core/src/components/MessageHistory/parseRosPath";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import getDiff, { diffLabels, diffLabelsByLabelText } from "webviz-core/src/panels/RawMessages/getDiff";
import type { Topic } from "webviz-core/src/players/types";
import type { PanelConfig } from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { colors } from "webviz-core/src/util/colors";
import { jsonTreeTheme } from "webviz-core/src/util/globalConstants";
import { enumValuesByDatatypeAndField } from "webviz-core/src/util/selectors";
import { format } from "webviz-core/src/util/time";

export type RawMessagesConfig = {|
  topicName: string,
  diffTopicName: string,
|};

type Props = {
  config: RawMessagesConfig,
  saveConfig: ($Shape<RawMessagesConfig>) => void,
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
  datatypes: RosDatatypes,
  topics: Topic[],
};

const isSingleElemArray = (obj) => Array.isArray(obj) && obj.filter((a) => a != null).length === 1;
const dataWithoutWrappingArray = (data) => {
  return isSingleElemArray(data) && typeof data[0] === "object" ? data[0] : data;
};

function RawMessages(props: Props) {
  const { config, saveConfig, openSiblingPanel, datatypes, topics } = props;
  const { topicName, diffTopicName } = config;

  // When expandAll is unset, we'll use expandedFields to get expanded info
  const [expandAll, setExpandAll] = useState(false);
  const [expandedFields, setExpandedFields] = useState(() => new Set());

  const diffTopicPath = useMemo(
    () => (diffTopicName ? diffTopicName + (splitTopicPathOnTopicName(topicName)?.trailingPath || "") : diffTopicName),
    [diffTopicName, topicName]
  );

  const onTopicNameChange = useCallback(
    (newTopicName: string) => {
      saveConfig({ topicName: newTopicName, diffTopicName });
      const newBaseTopic = topics.find((topic) => topic.name === newTopicName);
      const diffTopic = topics.find((topic) => topic.name === diffTopicName);
      if (
        newBaseTopic?.datatype !== diffTopic?.datatype ||
        splitTopicPathOnTopicName(newTopicName)?.topicName === diffTopicPath
      ) {
        saveConfig({ diffTopicName: "" });
      }
    },
    [diffTopicName, diffTopicPath, saveConfig, topics]
  );

  const toggleExpandAll = useCallback(
    () => {
      setExpandedFields(new Set());
      setExpandAll(!expandAll);
    },
    [expandAll]
  );

  const onLabelClick = useCallback(
    (keypath: string[]) => {
      // Create a unique key according to the keypath / raw
      const key = keypath.join("~");
      const expandedFieldsCopy = new Set(expandedFields);
      if (expandedFieldsCopy.has(key)) {
        expandedFieldsCopy.delete(key);
        setExpandedFields(expandedFieldsCopy);
      } else {
        expandedFieldsCopy.add(key);
        setExpandedFields(expandedFieldsCopy);
      }
      setExpandAll(null);
    },
    [expandedFields]
  );

  const valueRenderer = useCallback(
    (
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
              <HighlightedValue itemLabel={itemLabel} keyPath={keyPath} />
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
              {valueAction && (
                <RawMessagesIcons
                  valueAction={valueAction}
                  basePath={basePath}
                  onTopicNameChange={onTopicNameChange}
                  openSiblingPanel={openSiblingPanel}
                />
              )}
            </span>
          );
        }}
      </ReactHoverObserver>
    ),
    [datatypes, onTopicNameChange, openSiblingPanel]
  );

  const renderSingleTopicOrDiffOutput = useCallback(
    () => {
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

      const paths = diffTopicName ? [topicName, diffTopicPath] : [topicName];
      return (
        <MessageHistory paths={paths} historySize={1}>
          {({ itemsByPath, metadataByPath }: MessageHistoryData) => {
            const item = itemsByPath[topicName][0];
            const diffItem = get(itemsByPath, [diffTopicPath, "0"], null);
            const metadata = metadataByPath[topicName];
            const inDiffMode = !!diffTopicName && topicName !== diffTopicPath;

            if (!inDiffMode && !item) {
              return <EmptyState>Waiting for next message</EmptyState>;
            } else if (inDiffMode && (!item || !diffItem)) {
              return (
                <EmptyState>
                  {`Waiting to diff next messages from ${topicName ? `"${topicName}"` : "--"} and "${diffTopicPath}"`}
                </EmptyState>
              );
            }
            const data = dataWithoutWrappingArray(item.queriedData.map(({ value }) => (value: any)));
            const hideWrappingArray = item.queriedData.length === 1 && typeof item.queriedData[0].value === "object";
            const link = getMessageDocumentationLink(item.message.datatype);
            const shouldDisplaySingleVal = (data !== undefined && typeof data !== "object") || isSingleElemArray(data);
            const singleVal = isSingleElemArray(data) ? data[0] : data;

            const diffData =
              inDiffMode && diffItem && dataWithoutWrappingArray(diffItem.queriedData.map(({ value }) => (value: any)));
            const diff = inDiffMode && getDiff(data, diffData);
            const diffLabelTexts = Object.keys(diffLabels).map((key) => diffLabels[key].labelText);

            return (
              <Flex col clip scroll className={styles.container}>
                <Metadata data={data} link={link} item={item} />
                {diffTopicPath && splitTopicPathOnTopicName(topicName)?.topicName !== diffTopicPath ? (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                    <SMetadata style={{ fontStyle: "italic", color: colors.ORANGEL1 }}>
                      Diff with {diffTopicPath}:
                    </SMetadata>
                    {diffItem ? <SMetadata>received at {format(diffItem.message.receiveTime)}</SMetadata> : null}
                  </div>
                ) : null}
                {shouldDisplaySingleVal ? (
                  <div className={styles.singleVal}>{String(singleVal)}</div>
                ) : (
                  <Tree
                    labelRenderer={(raw) => <SDiffSpan onClick={() => onLabelClick(raw)}>{first(raw)}</SDiffSpan>}
                    shouldExpandNode={shouldExpandNode}
                    hideRoot
                    invertTheme={false}
                    getItemString={inDiffMode ? getItemStringForDiff : getItemString}
                    valueRenderer={(...args) => {
                      if (inDiffMode) {
                        return valueRenderer(null, diff, diff, ...args);
                      }
                      if (hideWrappingArray) {
                        // When the wrapping array is hidden, put it back here.
                        return valueRenderer(metadata, [data], item.queriedData, ...args, 0);
                      }
                      return valueRenderer(metadata, data, item.queriedData, ...args);
                    }}
                    postprocessValue={(val) => {
                      if (
                        typeof val === "object" &&
                        Object.keys(val).length === 1 &&
                        diffLabelTexts.includes(Object.keys(val)[0])
                      ) {
                        if (Object.keys(val)[0] !== diffLabels.ID.labelText) {
                          return val[Object.keys(val)[0]];
                        }
                      }
                      return val;
                    }}
                    theme={{
                      ...jsonTreeTheme,
                      tree: { margin: 0 },
                      nestedNode: ({ style }, keyPath, nodeType, expanded) => {
                        const baseStyle = {
                          ...style,
                          padding: "2px 0 2px 5px",
                          marginTop: 2,
                          textDecoration: "inherit",
                        };
                        if (!inDiffMode) {
                          return { style: baseStyle };
                        }
                        let backgroundColor;
                        let textDecoration;
                        if (diffLabelsByLabelText[keyPath[0]]) {
                          backgroundColor = diffLabelsByLabelText[keyPath[0]].backgroundColor;
                          textDecoration = keyPath[0] === diffLabels.DELETED.labelText ? "line-through" : "none";
                        }
                        const nestedObj = get(diff, keyPath.slice().reverse(), {});
                        const nestedObjKey = Object.keys(nestedObj)[0];
                        if (diffLabelsByLabelText[nestedObjKey]) {
                          backgroundColor = diffLabelsByLabelText[nestedObjKey].backgroundColor;
                          textDecoration = nestedObjKey === diffLabels.DELETED.labelText ? "line-through" : "none";
                        }
                        return {
                          style: { ...baseStyle, backgroundColor, textDecoration: textDecoration || "inherit" },
                        };
                      },
                      nestedNodeLabel: ({ style }, keyPath, nodeType, expanded) => ({
                        style: { ...style, textDecoration: "inherit" },
                      }),
                      nestedNodeChildren: ({ style }, nodeType, expanded) => ({
                        style: { ...style, textDecoration: "inherit" },
                      }),
                      value: ({ style }, nodeType, keyPath) => {
                        const baseStyle = { ...style, textDecoration: "inherit" };
                        if (!inDiffMode) {
                          return { style: baseStyle };
                        }
                        let backgroundColor;
                        let textDecoration;
                        const nestedObj = get(diff, keyPath.slice().reverse(), {});
                        const nestedObjKey = Object.keys(nestedObj)[0];
                        if (diffLabelsByLabelText[nestedObjKey]) {
                          backgroundColor = diffLabelsByLabelText[nestedObjKey].backgroundColor;
                          textDecoration = nestedObjKey === diffLabels.DELETED.labelText ? "line-through" : "none";
                        }
                        return {
                          style: { ...baseStyle, backgroundColor, textDecoration: textDecoration || "inherit" },
                        };
                      },
                      label: { textDecoration: "inherit" },
                    }}
                    data={inDiffMode ? diff : data}
                  />
                )}
              </Flex>
            );
          }}
        </MessageHistory>
      );
    },
    [diffTopicName, diffTopicPath, expandAll, expandedFields, onLabelClick, topicName, valueRenderer]
  );

  return (
    <Flex col clip style={{ position: "relative" }}>
      <PanelToolbar
        helpContent={helpContent}
        menuContent={
          <DiffSettings topics={topics} topicName={topicName} saveConfig={saveConfig} diffTopicName={diffTopicName} />
        }>
        <Icon tooltip={expandAll ? "Collapse all" : "Expand all"} medium fade onClick={toggleExpandAll}>
          {expandAll ? <LessIcon /> : <MoreIcon />}
        </Icon>
        <MessageHistoryInput path={topicName} onChange={onTopicNameChange} inputStyle={{ height: "100%" }} />
      </PanelToolbar>
      {renderSingleTopicOrDiffOutput()}
    </Flex>
  );
}

RawMessages.defaultConfig = { topicName: "", diffTopicName: "" };
RawMessages.panelType = "RawMessages";

export default hot(Panel<RawMessagesConfig>(RawMessages));
