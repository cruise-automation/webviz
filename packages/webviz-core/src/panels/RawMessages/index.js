// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import ConsoleLineIcon from "@mdi/svg/svg/console-line.svg";
import PlusMinusIcon from "@mdi/svg/svg/plus-minus.svg";
import LessIcon from "@mdi/svg/svg/unfold-less-horizontal.svg";
import MoreIcon from "@mdi/svg/svg/unfold-more-horizontal.svg";
import { first, get, isEqual, last } from "lodash";
import React, { useState, useCallback, useMemo } from "react";
import { hot } from "react-hot-loader/root";
import ReactHoverObserver from "react-hover-observer";
import Tree from "react-json-tree";

import { HighlightedValue, SDiffSpan } from "./Diff";
import { type ValueAction, getValueActionForValue, getStructureItemForPath } from "./getValueActionForValue";
import helpContent from "./index.help.md";
import styles from "./index.module.scss";
import Metadata from "./Metadata";
import RawMessagesIcons from "./RawMessagesIcons";
import { DATA_ARRAY_PREVIEW_LIMIT, getMessageDocumentationLink, getItemString, getItemStringForDiff } from "./utils";
import Dropdown from "webviz-core/src/components/Dropdown";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Item from "webviz-core/src/components/Menu/Item";
import type { RosPath, MessagePathStructureItem } from "webviz-core/src/components/MessagePathSyntax/constants";
import MessagePathInput from "webviz-core/src/components/MessagePathSyntax/MessagePathInput";
import {
  messagePathStructures,
  traverseStructure,
} from "webviz-core/src/components/MessagePathSyntax/messagePathsForDatatype";
import parseRosPath from "webviz-core/src/components/MessagePathSyntax/parseRosPath";
import {
  useCachedGetMessagePathDataItems,
  type MessagePathDataItem,
} from "webviz-core/src/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import { useLatestMessageDataItem } from "webviz-core/src/components/MessagePathSyntax/useLatestMessageDataItem";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import Tooltip from "webviz-core/src/components/Tooltip";
import { useDataSourceInfo, useMessagesByTopic } from "webviz-core/src/PanelAPI";
import getDiff, { diffLabels, diffLabelsByLabelText } from "webviz-core/src/panels/RawMessages/getDiff";
import type { Topic } from "webviz-core/src/players/types";
import type { PanelConfig } from "webviz-core/src/types/panels";
import { jsonTreeTheme } from "webviz-core/src/util/globalConstants";
import { enumValuesByDatatypeAndField } from "webviz-core/src/util/selectors";

export const PREV_MSG_METHOD = "previous message";
export type RawMessagesConfig = {|
  topicPath: string,
  diffMethod: "custom" | "previous message",
  diffTopicPath: string,
  diffEnabled: boolean,
  showFullMessageForDiff: boolean,
|};

type Props = {
  config: RawMessagesConfig,
  saveConfig: ($Shape<RawMessagesConfig>) => void,
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
};

const isSingleElemArray = (obj) => Array.isArray(obj) && obj.filter((a) => a != null).length === 1;
const dataWithoutWrappingArray = (data) => {
  return isSingleElemArray(data) && typeof data[0] === "object" ? data[0] : data;
};

function RawMessages(props: Props) {
  const { config, saveConfig, openSiblingPanel } = props;
  const { topicPath, diffMethod, diffTopicPath, diffEnabled, showFullMessageForDiff } = config;
  const { topics, datatypes } = useDataSourceInfo();

  const topicRosPath: ?RosPath = useMemo(() => parseRosPath(topicPath), [topicPath]);
  const topic: ?Topic = useMemo(() => topicRosPath && topics.find(({ name }) => name === topicRosPath.topicName), [
    topicRosPath,
    topics,
  ]);
  const rootStructureItem: ?MessagePathStructureItem = useMemo(
    () => {
      if (!topic || !topicRosPath) {
        return;
      }
      return traverseStructure(messagePathStructures(datatypes)[topic.datatype], topicRosPath.messagePath)
        .structureItem;
    },
    [datatypes, topic, topicRosPath]
  );

  // When expandAll is unset, we'll use expandedFields to get expanded info
  const [expandAll, setExpandAll] = useState(false);
  const [expandedFields, setExpandedFields] = useState(() => new Set());

  const topicName = topicRosPath?.topicName || "";
  const consecutiveMsgs = useMessagesByTopic({ topics: [topicName], historySize: 2 })[topicName];
  const cachedGetMessagePathDataItems = useCachedGetMessagePathDataItems([topicPath]);
  const prevTickMsg = consecutiveMsgs[consecutiveMsgs.length - 2];
  const [prevTickObj, currTickObj] = [
    prevTickMsg && { message: prevTickMsg, queriedData: cachedGetMessagePathDataItems(topicPath, prevTickMsg) || [] },
    useLatestMessageDataItem(topicPath),
  ];
  const diffTopicObj = useLatestMessageDataItem(diffEnabled ? diffTopicPath : "");

  const inTimetickDiffMode = diffEnabled && diffMethod === PREV_MSG_METHOD;
  const baseItem = inTimetickDiffMode ? prevTickObj : currTickObj;
  const diffItem = inTimetickDiffMode ? currTickObj : diffTopicObj;

  const onTopicPathChange = useCallback(
    (newTopicPath: string) => {
      saveConfig({ topicPath: newTopicPath });
    },
    [saveConfig]
  );

  const onDiffTopicPathChange = useCallback(
    (newDiffTopicPath: string) => {
      saveConfig({ diffTopicPath: newDiffTopicPath });
    },
    [saveConfig]
  );

  const onToggleDiff = useCallback(
    () => {
      saveConfig({ diffEnabled: !diffEnabled });
    },
    [diffEnabled, saveConfig]
  );

  const onToggleExpandAll = useCallback(
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
      structureItem: ?MessagePathStructureItem,
      data: mixed[],
      queriedData: MessagePathDataItem[],
      label: string,
      itemValue: mixed,
      ...keyPath: (number | string)[]
    ) => (
      <ReactHoverObserver className={styles.iconWrapper}>
        {({ isHovering }) => {
          // $FlowFixMe: We make sure to always pass in a number at the end, but that's hard to express in Flow.
          const lastKeyPath: number = last(keyPath);
          let valueAction: ?ValueAction;
          if (isHovering && structureItem) {
            valueAction = getValueActionForValue(data[lastKeyPath], structureItem, keyPath.slice(0, -1).reverse());
          }

          let constantName: ?string;
          if (structureItem) {
            const childStructureItem = getStructureItemForPath(
              structureItem,
              keyPath
                .slice(0, -1)
                .reverse()
                .join(",")
            );
            if (childStructureItem) {
              const field = keyPath[0];
              if (typeof field === "string") {
                const enumMapping = enumValuesByDatatypeAndField(datatypes);
                const datatype = childStructureItem.datatype;
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
              <span className={styles.iconBox}>
                {valueAction && (
                  <RawMessagesIcons
                    valueAction={valueAction}
                    basePath={basePath}
                    onTopicPathChange={onTopicPathChange}
                    openSiblingPanel={openSiblingPanel}
                  />
                )}
              </span>
            </span>
          );
        }}
      </ReactHoverObserver>
    ),
    [datatypes, onTopicPathChange, openSiblingPanel]
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

      if (!topicPath) {
        return <EmptyState>No topic selected</EmptyState>;
      }
      if (diffEnabled && diffMethod === "custom" && (!baseItem || !diffItem)) {
        return <EmptyState>{`Waiting to diff next messages from "${topicPath}" and "${diffTopicPath}"`}</EmptyState>;
      }
      if (!baseItem) {
        return <EmptyState>Waiting for next message</EmptyState>;
      }

      const data = dataWithoutWrappingArray(baseItem.queriedData.map(({ value }) => (value: any)));
      const hideWrappingArray = baseItem.queriedData.length === 1 && typeof baseItem.queriedData[0].value === "object";
      const link = getMessageDocumentationLink(baseItem.message.datatype);
      const shouldDisplaySingleVal =
        (data !== undefined && typeof data !== "object") ||
        (isSingleElemArray(data) && data[0] !== undefined && typeof data[0] !== "object");
      const singleVal = isSingleElemArray(data) ? data[0] : data;

      const diffData = diffItem && dataWithoutWrappingArray(diffItem.queriedData.map(({ value }) => (value: any)));
      const diff = diffEnabled && getDiff(data, diffData, null, showFullMessageForDiff);
      const diffLabelTexts = Object.keys(diffLabels).map((key) => diffLabels[key].labelText);

      return (
        <Flex col clip scroll className={styles.container}>
          <Metadata data={data} link={link} message={baseItem.message} diffMessage={diffItem?.message} />
          {shouldDisplaySingleVal ? (
            <div className={styles.singleVal}>{String(singleVal)}</div>
          ) : diffEnabled && isEqual({}, diff) ? (
            <EmptyState>No difference found</EmptyState>
          ) : (
            <Tree
              labelRenderer={(raw) => <SDiffSpan onClick={() => onLabelClick(raw)}>{first(raw)}</SDiffSpan>}
              shouldExpandNode={shouldExpandNode}
              hideRoot
              invertTheme={false}
              getItemString={diffEnabled ? getItemStringForDiff : getItemString}
              valueRenderer={(...args) => {
                if (diffEnabled) {
                  return valueRenderer(null, diff, diff, ...args);
                }
                if (hideWrappingArray) {
                  // When the wrapping array is hidden, put it back here.
                  return valueRenderer(rootStructureItem, [data], baseItem.queriedData, ...args, 0);
                }
                return valueRenderer(rootStructureItem, data, baseItem.queriedData, ...args);
              }}
              postprocessValue={(val: mixed) => {
                if (
                  val != null &&
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
                  if (!diffEnabled) {
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
                  if (!diffEnabled) {
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
              data={diffEnabled ? diff : data}
            />
          )}
        </Flex>
      );
    },
    [
      baseItem,
      diffEnabled,
      diffItem,
      diffMethod,
      diffTopicPath,
      expandAll,
      expandedFields,
      onLabelClick,
      rootStructureItem,
      showFullMessageForDiff,
      topicPath,
      valueRenderer,
    ]
  );

  return (
    <Flex col clip style={{ position: "relative" }}>
      <PanelToolbar
        helpContent={helpContent}
        menuContent={
          <Item
            icon={config.showFullMessageForDiff ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
            onClick={() => saveConfig({ showFullMessageForDiff: !config.showFullMessageForDiff })}>
            <span>Show full message for diff</span>
          </Item>
        }>
        <Icon tooltip="Toggle diff" medium fade onClick={onToggleDiff} active={diffEnabled}>
          <PlusMinusIcon />
        </Icon>
        <Icon
          tooltip={expandAll ? "Collapse all" : "Expand all"}
          medium
          fade
          onClick={onToggleExpandAll}
          style={{ position: "relative", top: 1 }}>
          {expandAll ? <LessIcon /> : <MoreIcon />}
        </Icon>
        <div className={styles.topicInputs}>
          <MessagePathInput index={0} path={topicPath} onChange={onTopicPathChange} inputStyle={{ height: "100%" }} />
          {diffEnabled && (
            <Flex>
              <Tooltip contents="Diff method" placement="top">
                <>
                  <Dropdown
                    value={diffMethod}
                    onChange={(newDiffMethod) => saveConfig({ diffMethod: newDiffMethod })}
                    noPortal>
                    <span value={PREV_MSG_METHOD}>{PREV_MSG_METHOD}</span>
                    <span value="custom">custom</span>
                  </Dropdown>
                </>
              </Tooltip>
              {diffMethod === "custom" ? (
                <MessagePathInput
                  index={1}
                  path={diffTopicPath}
                  onChange={onDiffTopicPathChange}
                  inputStyle={{ height: "100%" }}
                  prioritizedDatatype={topic?.datatype}
                />
              ) : null}
            </Flex>
          )}
        </div>
      </PanelToolbar>
      {renderSingleTopicOrDiffOutput()}
    </Flex>
  );
}

RawMessages.defaultConfig = {
  topicPath: "",
  diffTopicPath: "",
  diffMethod: "custom",
  diffEnabled: false,
  showFullMessageForDiff: false,
};
RawMessages.panelType = "RawMessages";

export default hot(Panel<RawMessagesConfig>(RawMessages));
