// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import React from "react";

import { PLOT_DASHED_STYLE, PLOT_DOT_DASHED_STYLE } from "webviz-core/src/components/TimeBasedChart/constants";

// This type describes our use, but chart.js supports many more properties if we want them:
// https://www.chartjs.org/docs/latest/charts/line.html#dataset-properties
type Dataset = $ReadOnly<{ label: string, color?: string, borderDash?: $ReadOnlyArray<number> }>;

type Props = {
  canToggleLines?: boolean,
  datasets: $ReadOnlyArray<Dataset>,
  linesToHide: { [string]: boolean },
  toggleLine: (datasetId: string | typeof undefined, lineToHide: string) => void,
  datasetId?: string,
};

const checkboxStyle = { height: 12, marginBottom: -2 };

export default class TimeBasedChartLegend extends React.PureComponent<Props> {
  _toggleLine = (label: string) => () => {
    const { datasetId, toggleLine } = this.props;
    toggleLine(datasetId, label);
  };

  render() {
    const { canToggleLines, linesToHide } = this.props;
    return (
      <div>
        {this.props.datasets.map((dataset, i) => {
          const { label, color, borderDash } = dataset;
          let pointSvg;
          if (borderDash === PLOT_DOT_DASHED_STYLE) {
            pointSvg = (
              <svg width="11" height="10">
                <line
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray={PLOT_DOT_DASHED_STYLE.join(", ")}
                  x1="0"
                  x2="18"
                  y1="6"
                  y2="6"
                />
              </svg>
            );
          } else if (borderDash === PLOT_DASHED_STYLE) {
            pointSvg = <span style={{ fontSize: "12px", fontWeight: "bold" }}>- -</span>;
          } else {
            pointSvg = <span style={{ fontSize: "12px", fontWeight: "bold" }}>––</span>;
          }
          const CheckboxComponent = linesToHide[label] ? CheckboxBlankOutlineIcon : CheckboxMarkedIcon;
          return (
            <div key={i} style={{ color, fill: "white", whiteSpace: "nowrap" }}>
              {canToggleLines && <CheckboxComponent style={checkboxStyle} onClick={this._toggleLine(label)} />}
              {pointSvg} <span style={{ fontSize: "10px" }}>{label}</span>
            </div>
          );
        })}
      </div>
    );
  }
}
