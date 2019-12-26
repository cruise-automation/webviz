// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useEffect, useState, useCallback } from "react";
import { hot } from "react-hot-loader/root";

import helpContent from "./index.help.md";
import Flex from "webviz-core/src/components/Flex";
import MessageHistory, { type MessageHistoryData } from "webviz-core/src/components/MessageHistory";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import type { PlotPath } from "webviz-core/src/panels/Plot/internalTypes";
import PlotChart, { getDatasets } from "webviz-core/src/panels/Plot/PlotChart";
import PlotLegend from "webviz-core/src/panels/Plot/PlotLegend";
import PlotMenu from "webviz-core/src/panels/Plot/PlotMenu";

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
  xAxisVal: "timestamp" | "index",
};

type Props = {
  config: PlotConfig,
  saveConfig: ($Shape<PlotConfig>) => void,
};

function Plot(props: Props) {
  const { saveConfig, config } = props;
  const { paths, minYValue, maxYValue, showLegend, xAxisVal } = config;
  const [currentMinY, setCurrentMinY] = useState(null);
  const [currentMaxY, setCurrentMaxY] = useState(null);

  const saveCurrentYs = useCallback((minY: number, maxY: number) => {
    setCurrentMinY(maxY);
    setCurrentMaxY(maxY);
  }, []);

  const setMinMax = useCallback(
    () =>
      saveConfig({
        minYValue: currentMinY ? currentMinY.toString() : "",
        maxYValue: currentMaxY ? currentMaxY.toString() : "",
      }),
    [currentMaxY, currentMinY, saveConfig]
  );

  useEffect(() => {
    if (!paths.length) {
      saveConfig({ paths: [{ value: "", enabled: true, timestampMethod: "receiveTime" }] });
    }
  });

  return (
    <Flex col clip center style={{ position: "relative" }}>
      {/* Don't filter out disabled paths when passing into <MessageHistory>, because we still want
          easy access to the history when turning the disabled paths back on. */}
      <MessageHistory paths={paths.map((path) => path.value)} {...(xAxisVal === "index" ? { historySize: 1 } : null)}>
        {({ itemsByPath, startTime }: MessageHistoryData) => {
          const datasets = getDatasets(paths, itemsByPath, startTime, xAxisVal);
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
                  />
                }
              />
              <PlotChart
                paths={paths}
                minYValue={parseFloat(minYValue)}
                maxYValue={parseFloat(maxYValue)}
                saveCurrentYs={saveCurrentYs}
                datasets={datasets}
                xAxisVal={xAxisVal}
              />
            </>
          );
        }}
      </MessageHistory>
      <PlotLegend paths={paths} saveConfig={saveConfig} showLegend={showLegend} xAxisVal={xAxisVal} />
    </Flex>
  );
}
Plot.panelType = "Plot";
Plot.defaultConfig = { paths: [], minYValue: "", maxYValue: "", showLegend: true, xAxisVal: "timestamp" };

export default hot(Panel<PlotConfig>(Plot));
