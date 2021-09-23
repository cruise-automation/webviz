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
// eslint-disable-next-line no-restricted-imports
import { first, isEqual, get, last } from "lodash";
import React, { useState, useCallback, useMemo } from "react";
import { hot } from "react-hot-loader/root";
import ReactHoverObserver from "react-hover-observer";
import Tree from "react-json-tree";

import { HighlightedValue, SDiffSpan, MaybeCollapsedValue } from "./Diff";
import { type ValueAction, getValueActionForValue, getStructureItemForPath } from "./getValueActionForValue";
import helpContent from "./index.help.md";
import styles from "./index.module.scss";
import Metadata from "./Metadata";
import RawMessagesIcons from "./RawMessagesIcons";
import { DATA_ARRAY_PREVIEW_LIMIT, getItemString, getItemStringForDiff } from "./utils";
import Dropdown from "webviz-core/src/components/Dropdown";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
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
import { cast, type Topic } from "webviz-core/src/players/types";
import type { PanelConfig } from "webviz-core/src/types/panels";
import { objectValues } from "webviz-core/src/util";
import {
  type ArrayView,
  deepParse,
  fieldNames,
  getField,
  getIndex,
  isArrayView,
  isBobject,
} from "webviz-core/src/util/binaryObjects";
import { jsonTreeTheme, $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";
import { enumValuesByDatatypeAndField } from "webviz-core/src/util/selectors";

export const CUSTOM_METHOD = "custom";
export const PREV_MSG_METHOD = "previous message";
export const OTHER_SOURCE_METHOD = "other source";
export type RawMessagesConfig = {|
  topicPath: string,
  diffMethod: "custom" | "previous message" | "other source",
  diffTopicPath: string,
  diffEnabled: boolean,
  showFullMessageForDiff: boolean,
|};

type Props = {
  config: RawMessagesConfig,
  saveConfig: ($Shape<RawMessagesConfig>) => void,
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
};

const isSingleElemArray = (obj) => {
  if (!Array.isArray(obj) && !isArrayView(obj)) {
    return false;
  }
  const arr = isArrayView(obj) ? cast<ArrayView<any>>(obj).toArray() : cast<any[]>(obj);
  return arr.filter((a) => a != null).length === 1;
};
const dataWithoutWrappingArray = (data) => {
  return isSingleElemArray(data) && typeof getIndex(data, 0) === "object" ? getIndex(data, 0) : data;
};

const maybeShallowParse = (obj: mixed): mixed => {
  if (!isBobject(obj)) {
    return obj;
  }
  if (isArrayView(obj)) {
    return cast<ArrayView<any>>(obj).toArray();
  }
  const ret = {};
  // $FlowFixMe: We've checked obj is a bobject above.
  fieldNames(obj).forEach((field) => {
    ret[field] = getField(obj, field, true);
  });
  return ret;
};

const maybeDeepParse = (obj: mixed): mixed => {
  if (!isBobject(obj)) {
    return obj;
  }
  return deepParse(obj);
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
  const rootStructureItem: ?MessagePathStructureItem = useMemo(() => {
    if (!topic || !topicRosPath) {
      return;
    }
    return traverseStructure(messagePathStructures(datatypes)[topic.datatype], topicRosPath.messagePath).structureItem;
  }, [datatypes, topic, topicRosPath]);

  // When expandAll is unset, we'll use expandedFields to get expanded info
  const [expandAll, setExpandAll] = useState(false);
  const [expandedFields, setExpandedFields] = useState(() => new Set());

  const topicName = topicRosPath?.topicName || "";
  const consecutiveMsgs = useMessagesByTopic({ topics: [topicName], historySize: 2, format: "bobjects" })[topicName];
  const cachedGetMessagePathDataItems = useCachedGetMessagePathDataItems([topicPath]);
  const prevTickMsg = consecutiveMsgs[consecutiveMsgs.length - 2];
  const [prevTickObj, currTickObj] = [
    prevTickMsg && {
      message: prevTickMsg,
      queriedData: cachedGetMessagePathDataItems(topicPath, prevTickMsg, true) || [],
    },
    useLatestMessageDataItem(topicPath, "bobjects", true),
  ];

  const otherSourceTopic = topicName.startsWith($WEBVIZ_SOURCE_2)
    ? topicName.replace($WEBVIZ_SOURCE_2, "")
    : `${$WEBVIZ_SOURCE_2}${topicName}`;
  const inOtherSourceDiffMode = diffEnabled && diffMethod === OTHER_SOURCE_METHOD;
  const diffTopicObj = useLatestMessageDataItem(
    diffEnabled ? (inOtherSourceDiffMode ? otherSourceTopic : diffTopicPath) : "",
    "parsedMessages",
    true
  );

  const inTimetickDiffMode = diffEnabled && diffMethod === PREV_MSG_METHOD;
  const baseItem = inTimetickDiffMode ? prevTickObj : currTickObj;
  const diffItem = inTimetickDiffMode ? currTickObj : diffTopicObj;

  const onTopicPathChange = useCallback((newTopicPath: string) => {
    saveConfig({ topicPath: newTopicPath });
  }, [saveConfig]);

  const onDiffTopicPathChange = useCallback((newDiffTopicPath: string) => {
    saveConfig({ diffTopicPath: newDiffTopicPath });
  }, [saveConfig]);

  const onToggleDiff = useCallback(() => {
    saveConfig({ diffEnabled: !diffEnabled });
  }, [diffEnabled, saveConfig]);

  const onToggleExpandAll = useCallback(() => {
    setExpandedFields(new Set());
    setExpandAll((currVal) => !currVal);
  }, []);

  const onLabelClick = useCallback((keypath: string[]) => {
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
  }, [expandedFields]);

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

          // Find enum name. When the message-path items are messages, we have enough datatype
          // information to associate nested fields with specific enums using structureItem.
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
          // When the message-path items are primitives, the datatype info (uint8, etc) isn't
          // sufficient to deduce names based on values. In this case we use the constants
          // associated with the values returned by the message path algorithm.
          if (
            constantName == null &&
            keyPath.length === 1 &&
            typeof keyPath[0] === "number" &&
            itemValue === queriedData[keyPath[0]].value // just in case
          ) {
            constantName = queriedData[keyPath[0]].constantName;
          }
          const basePath: string = queriedData[lastKeyPath] && queriedData[lastKeyPath].path;
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
              <HighlightedValue itemLabel={itemLabel} />
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

  const renderSingleTopicOrDiffOutput = useCallback(() => {
    let shouldExpandNode;
    if (expandAll !== null) {
      shouldExpandNode = () => expandAll;
    } else {
      shouldExpandNode = (keypath) => {
        return expandedFields.has(keypath.join("~"));
      };
    }

    if (!topicPath) {
      return <EmptyState>No topic selected</EmptyState>;
    }
    if (diffEnabled && diffMethod === CUSTOM_METHOD && (!baseItem || !diffItem)) {
      return <EmptyState>{`Waiting to diff next messages from "${topicPath}" and "${diffTopicPath}"`}</EmptyState>;
    }
    if (diffEnabled && diffMethod === OTHER_SOURCE_METHOD && (!baseItem || !diffItem)) {
      return <EmptyState>{`Waiting to diff next messages from "${topicPath}" and "${otherSourceTopic}"`}</EmptyState>;
    }
    if (!baseItem) {
      return <EmptyState>Waiting for next message</EmptyState>;
    }

    const data = dataWithoutWrappingArray(baseItem.queriedData.map(({ value }) => (value: any)));
    const hideWrappingArray = baseItem.queriedData.length === 1 && typeof baseItem.queriedData[0].value === "object";
    const shouldDisplaySingleVal =
      (data !== undefined && typeof data !== "object") ||
      (isSingleElemArray(data) && getIndex(data, 0) != null && typeof getIndex(data, 0) !== "object");
    let singleVal = String(isSingleElemArray(data) ? getIndex(data, 0) : data);
    if (baseItem.queriedData.length && baseItem.queriedData[0].constantName) {
      // Handles the message path algorithm returning a single-element array (e.g. [enum]), but not nested arrays (e.g. [[enum]]) - arrays of enums are uncommon.
      // Handle queriedData.length==0, which happens sometimes when diff-mode is enabled.
      singleVal += ` (${baseItem.queriedData[0].constantName})`;
    }

    const diffData = diffItem && dataWithoutWrappingArray(diffItem.queriedData.map(({ value }) => (value: any)));
    const diff = diffEnabled && getDiff(maybeDeepParse(data), maybeDeepParse(diffData), null, showFullMessageForDiff);
    const diffLabelTexts = objectValues(diffLabels).map(({ labelText }) => labelText);

    const CheckboxComponent = showFullMessageForDiff ? CheckboxMarkedIcon : CheckboxBlankOutlineIcon;
    return (
      <Flex col clip scroll className={styles.container}>
        <Metadata
          data={data}
          diffData={diffData}
          diff={diff}
          datatype={topic?.datatype}
          message={baseItem.message}
          diffMessage={diffItem?.message}
        />
        {shouldDisplaySingleVal ? (
          <div className={styles.singleVal}>
            <MaybeCollapsedValue itemLabel={singleVal} />
          </div>
        ) : diffEnabled && isEqual({}, diff) ? (
          <EmptyState>No difference found</EmptyState>
        ) : (
          <>
            {diffEnabled && (
              <div
                style={{ cursor: "pointer", fontSize: "11px" }}
                onClick={() => saveConfig({ showFullMessageForDiff: !showFullMessageForDiff })}>
                <Icon style={{ verticalAlign: "middle" }}>
                  <CheckboxComponent />
                </Icon>{" "}
                Show full msg
              </div>
            )}
            <Tree
              labelRenderer={(raw) => <SDiffSpan onClick={() => onLabelClick(raw)}>{first(raw)}</SDiffSpan>}
              shouldExpandNode={shouldExpandNode}
              hideRoot
              invertTheme={false}
              getItemString={diffEnabled ? getItemStringForDiff : getItemString}
              isCustomNode={(value) => {
                // Tree otherwise renders these as "<BigInt>"
                // eslint-disable-next-line valid-typeof
                return typeof value === "bigint";
              }}
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
              postprocessValue={(rawVal: mixed) => {
                const val = maybeShallowParse(rawVal);
                if (
                  val != null &&
                  typeof val === "object" &&
                  (!Array.isArray(val) && !ArrayBuffer.isView(val)) &&
                  Object.keys(val).length === 1 &&
                  diffLabelTexts.includes(Object.keys(val)[0])
                ) {
                  if (Object.keys(val)[0] !== diffLabels.ID.labelText) {
                    return objectValues(val)[0];
                  }
                }
                return val;
              }}
              theme={{
                ...jsonTreeTheme,
                tree: { margin: 0 },
                nestedNode: ({ style }, keyPath) => {
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
                nestedNodeLabel: ({ style }) => ({
                  style: { ...style, textDecoration: "inherit" },
                }),
                nestedNodeChildren: ({ style }) => ({
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
          </>
        )}
      </Flex>
    );
  }, [
    baseItem,
    diffEnabled,
    diffItem,
    diffMethod,
    diffTopicPath,
    expandAll,
    expandedFields,
    onLabelClick,
    otherSourceTopic,
    rootStructureItem,
    saveConfig,
    showFullMessageForDiff,
    topic,
    topicPath,
    valueRenderer,
  ]);

  return (
    <Flex col clip style={{ position: "relative" }}>
      <PanelToolbar helpContent={helpContent}>
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
                    <span value={OTHER_SOURCE_METHOD}>{OTHER_SOURCE_METHOD}</span>
                    <span value={CUSTOM_METHOD}>custom</span>
                  </Dropdown>
                </>
              </Tooltip>
              {diffMethod === CUSTOM_METHOD ? (
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
  diffMethod: CUSTOM_METHOD,
  diffEnabled: false,
  showFullMessageForDiff: false,
};
RawMessages.panelType = "RawMessages";

export default hot(Panel<RawMessagesConfig>(RawMessages));
