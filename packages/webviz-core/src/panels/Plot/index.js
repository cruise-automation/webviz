// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { compact, uniq } from "lodash";
import memoizeWeak from "memoize-weak";
import React, { useEffect, useCallback, useMemo, useRef } from "react";
import { hot } from "react-hot-loader/root";

import helpContent from "./index.help.md";
import Flex from "webviz-core/src/components/Flex";
import { type MessageHistoryItemsByPath } from "webviz-core/src/components/MessageHistoryDEPRECATED";
import { getTopicsFromPaths } from "webviz-core/src/components/MessagePathSyntax/parseRosPath";
import { useDecodeMessagePathsForMessagesByTopic } from "webviz-core/src/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { getTooltipItemForMessageHistoryItem, type TooltipItem } from "webviz-core/src/components/TimeBasedChart";
import { useBlocksByTopic, useDataSourceInfo, useMessagesByTopic } from "webviz-core/src/PanelAPI";
import type { BasePlotPath, PlotPath } from "webviz-core/src/panels/Plot/internalTypes";
import PlotChart, { getDatasetsAndTooltips, type PlotDataByPath } from "webviz-core/src/panels/Plot/PlotChart";
import PlotLegend from "webviz-core/src/panels/Plot/PlotLegend";
import PlotMenu from "webviz-core/src/panels/Plot/PlotMenu";
import type { PanelConfig } from "webviz-core/src/types/panels";
import { useShallowMemo } from "webviz-core/src/util/hooks";

export const plotableRosTypes = [
  "bool",
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "int64",
  "uint64",
  "float32",
  "float64",
  "time",
  "duration",
  "string",
];

export type PlotConfig = {
  paths: PlotPath[],
  minYValue: string,
  maxYValue: string,
  showLegend: boolean,
  xAxisVal: "timestamp" | "index" | "custom",
  xAxisPath?: BasePlotPath,
};

export function openSiblingPlotPanel(
  openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
  topicName: string
) {
  openSiblingPanel(
    "Plot",
    (config: PlotConfig) =>
      ({
        ...config,
        paths: uniq(
          config.paths
            .concat([{ value: topicName, enabled: true, timestampMethod: "receiveTime" }])
            .filter(({ value }) => value)
        ),
      }: PlotConfig)
  );
}

type Props = {
  config: PlotConfig,
  saveConfig: ($Shape<PlotConfig>) => void,
};

// messagePathItems contains the whole parsed message, and we don't need to cache all of that.
// Instead, throw away everything but what we need (the timestamps).
const getPlotDataByPath = (itemsByPath: MessageHistoryItemsByPath): PlotDataByPath => {
  const ret: PlotDataByPath = {};
  Object.keys(itemsByPath).forEach((path) => {
    ret[path] = [itemsByPath[path].map(getTooltipItemForMessageHistoryItem)];
  });
  return ret;
};

const getMessagePathItemsForBlock = memoizeWeak(
  (decodeMessagePathsForMessagesByTopic, binaryBlock, messageReadersByTopic): PlotDataByPath => {
    const parsedBlock = {};
    Object.keys(binaryBlock).forEach((topic) => {
      const reader = messageReadersByTopic[topic];
      parsedBlock[topic] = binaryBlock[topic].map((message) => ({
        ...message,
        message: reader.readMessage(Buffer.from(message.message)),
      }));
    });
    return Object.freeze(getPlotDataByPath(decodeMessagePathsForMessagesByTopic(parsedBlock)));
  }
);

function getBlockItemsByPath(decodeMessagePathsForMessagesByTopic, messageReadersByTopic, blocks) {
  const ret = {};
  const lastBlockIndexForPath = {};
  blocks.forEach((block, i) => {
    const messagePathItemsForBlock: PlotDataByPath = getMessagePathItemsForBlock(
      decodeMessagePathsForMessagesByTopic,
      block,
      messageReadersByTopic
    );
    Object.keys(messagePathItemsForBlock).forEach((path) => {
      const existingItems: TooltipItem[][] = ret[path] || [];
      // getMessagePathItemsForBlock returns an array of exactly one range of items.
      const [pathItems] = messagePathItemsForBlock[path];
      if (lastBlockIndexForPath[path] === i - 1) {
        // If we are continuing directly from the previous block index (i - 1) then add to the
        // existing range, otherwise start a new range
        const currentRange = existingItems[existingItems.length - 1];
        currentRange.push(...pathItems);
      } else {
        // Start a new contiguous range. Make a copy so we can extend it.
        existingItems.push(pathItems.slice());
      }
      ret[path] = existingItems;
      lastBlockIndexForPath[path] = i;
    });
  });
  return ret;
}

function Plot(props: Props) {
  const { saveConfig, config } = props;
  const { paths: yAxisPaths, minYValue, maxYValue, showLegend, xAxisVal, xAxisPath } = config;
  // Note that the below values are refs since they are only used in callbacks and are not rendered anywhere.
  const currentMinY = useRef(null);
  const currentMaxY = useRef(null);

  const saveCurrentYs = useCallback((minY: number, maxY: number) => {
    currentMinY.current = minY;
    currentMaxY.current = maxY;
  }, []);

  const setMinMax = useCallback(
    () =>
      saveConfig({
        minYValue: currentMinY.current != null ? currentMinY.current.toString() : "",
        maxYValue: currentMaxY.current != null ? currentMaxY.current.toString() : "",
      }),
    [currentMaxY, currentMinY, saveConfig]
  );

  useEffect(() => {
    if (!yAxisPaths.length) {
      saveConfig({ paths: [{ value: "", enabled: true, timestampMethod: "receiveTime" }] });
    }
  });

  const historySize = xAxisVal === "index" ? 1 : Infinity;

  const allPaths = yAxisPaths.map(({ value }) => value).concat(compact([xAxisPath?.value]));
  const memoizedPaths: string[] = useShallowMemo<string[]>(allPaths);
  const subscribeTopics = useMemo(() => getTopicsFromPaths(memoizedPaths), [memoizedPaths]);
  const messagesByTopic = useMessagesByTopic({ topics: subscribeTopics, historySize });

  const decodeMessagePathsForMessagesByTopic = useDecodeMessagePathsForMessagesByTopic(memoizedPaths);

  // NOTE: This does some unnecessary work: The items that are present in the blocks are stored by
  // path here, and that data will just be ignored below as the block data overrides the streaming
  // fallback. This repeated work won't happen when we have an appropriate subscription type.
  const streamedItemsByPath = useMemo(() => getPlotDataByPath(decodeMessagePathsForMessagesByTopic(messagesByTopic)), [
    decodeMessagePathsForMessagesByTopic,
    messagesByTopic,
  ]);

  const { messageReadersByTopic, blocks } = useBlocksByTopic(subscribeTopics);
  const blockItemsByPath = getBlockItemsByPath(decodeMessagePathsForMessagesByTopic, messageReadersByTopic, blocks);
  const { startTime } = useDataSourceInfo();
  // Don't filter out disabled paths when passing into getDatasetsAndTooltips, because we still want
  // easy access to the history when turning the disabled paths back on.
  const { datasets, tooltips } = getDatasetsAndTooltips(
    yAxisPaths,
    { ...streamedItemsByPath, ...blockItemsByPath },
    startTime || { sec: 0, nsec: 0 },
    xAxisVal,
    xAxisPath
  );

  return (
    <Flex col clip center style={{ position: "relative" }}>
      <PanelToolbar
        helpContent={helpContent}
        floating
        menuContent={
          <PlotMenu
            minYValue={minYValue}
            maxYValue={maxYValue}
            saveConfig={saveConfig}
            setMinMax={setMinMax}
            datasets={datasets}
            xAxisVal={xAxisVal}
            tooltips={tooltips}
          />
        }
      />
      <PlotChart
        paths={yAxisPaths}
        minYValue={parseFloat(minYValue)}
        maxYValue={parseFloat(maxYValue)}
        saveCurrentYs={saveCurrentYs}
        datasets={datasets}
        tooltips={tooltips}
        xAxisVal={xAxisVal}
      />
      <PlotLegend
        paths={yAxisPaths}
        saveConfig={saveConfig}
        showLegend={showLegend}
        xAxisVal={xAxisVal}
        xAxisPath={xAxisPath}
      />
    </Flex>
  );
}
Plot.panelType = "Plot";
Plot.defaultConfig = {
  paths: [{ value: "", enabled: true, timestampMethod: "receiveTime" }],
  minYValue: "",
  maxYValue: "",
  showLegend: true,
  xAxisVal: "timestamp",
};

export default hot(Panel<PlotConfig>(Plot));
