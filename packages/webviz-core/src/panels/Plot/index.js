// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { compact, uniq } from "lodash";
import React, { useEffect, useCallback, useRef } from "react";
import { hot } from "react-hot-loader/root";

import helpContent from "./index.help.md";
import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import Flex from "webviz-core/src/components/Flex";
import MessageHistoryDEPRECATED, { type MessageHistoryData } from "webviz-core/src/components/MessageHistoryDEPRECATED";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import type { BasePlotPath, PlotPath } from "webviz-core/src/panels/Plot/internalTypes";
import PlotChart, { getDatasetsAndTooltips } from "webviz-core/src/panels/Plot/PlotChart";
import PlotLegend from "webviz-core/src/panels/Plot/PlotLegend";
import PlotMenu from "webviz-core/src/panels/Plot/PlotMenu";
import type { PanelConfig } from "webviz-core/src/types/panels";

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

function Plot(props: Props) {
  const { saveConfig, config } = props;
  const { paths, minYValue, maxYValue, showLegend, xAxisVal, xAxisPath } = config;
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
    if (!paths.length) {
      saveConfig({ paths: [{ value: "", enabled: true, timestampMethod: "receiveTime" }] });
    }
  });

  let historySize: ?number;
  if (xAxisVal === "index") {
    historySize = 1;
  }

  const allPaths = paths.map(({ value }) => value).concat(compact([xAxisPath?.value]));
  const includeTooltipInData = !useExperimentalFeature("plotWebWorker");

  return (
    <Flex col clip center style={{ position: "relative" }}>
      {/* Don't filter out disabled paths when passing into <MessageHistoryDEPRECATED>, because we still want
          easy access to the history when turning the disabled paths back on. */}
      <MessageHistoryDEPRECATED paths={allPaths} {...(historySize ? { historySize } : null)}>
        {({ itemsByPath, startTime }: MessageHistoryData) => {
          const { datasets, tooltips } = getDatasetsAndTooltips(
            paths,
            itemsByPath,
            startTime,
            xAxisVal,
            includeTooltipInData,
            xAxisPath
          );
          return (
            <>
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
                paths={paths}
                minYValue={parseFloat(minYValue)}
                maxYValue={parseFloat(maxYValue)}
                saveCurrentYs={saveCurrentYs}
                datasets={datasets}
                tooltips={tooltips}
                xAxisVal={xAxisVal}
              />
            </>
          );
        }}
      </MessageHistoryDEPRECATED>
      <PlotLegend
        paths={paths}
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
