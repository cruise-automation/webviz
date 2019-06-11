// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import { markUpdate, setCallback, setupPerfMonitoring } from "./reconciliationPerf";
import colors from "webviz-core/src/styles/colors.module.scss";
import mixins from "webviz-core/src/styles/mixins.module.scss";
import { PANEL_PERF_QUERY_KEY } from "webviz-core/src/util/globalConstants";

// $FlowFixMe - apparently this is not in the flowtyped definitions yet.
const Profiler = React.unstable_Profiler;

const showPanelPerf = new URLSearchParams(location.search).has(PANEL_PERF_QUERY_KEY);

const SPerfIndicator = styled.div`
  font-family: ${mixins.monospaceFont};
  font-size: 10px;
  background-color: ${colors.backgroundControl};
  position: absolute;
  bottom: 10px;
  left: 10px;
  padding: 0.5em;
  z-index: 999999999;
`;

if (showPanelPerf) {
  setupPerfMonitoring();
}

// Simple wrapper around React's new Profiler API. Shows "actual" render time (which is the time
// that the last render took), and the "base" render time (which is the time that the render would
// have taken if all components in the tree would have `shouldComponentUpdate: true`). Also shows
// a unique id -- if that changes rapidly then that's also a bad sign (lots of remounts).
export default class PerfMonitor extends React.Component<{| id: string, children: React.Node |}> {
  _top: ?HTMLDivElement;

  shouldComponentUpdate() {
    if (showPanelPerf) {
      markUpdate(this.props.id);
    }
    return true;
  }

  _profilerOnRender = (id: ?string, phase: "mount" | "update", actualTime: number, baseTime: number) => {
    const text = `actual: ${actualTime.toFixed(1)}ms\nbase: ${baseTime.toFixed(1)}ms\nid: ${this.props.id.slice(0, 8)}`;
    if (this._top) {
      this._top.innerText = text;
    }
  };

  render() {
    if (!showPanelPerf) {
      return this.props.children;
    }

    return (
      <>
        <SPerfIndicator>
          <div ref={(el) => (this._top = el)}>?</div>
          <div
            ref={(el) => {
              if (el) {
                setCallback(this.props.id, (measure: PerformanceEntry) => {
                  el.innerText = `reconcil: ${measure.duration.toFixed(1)}ms`;
                });
              } else {
                setCallback(this.props.id, undefined);
              }
            }}>
            ?
          </div>
        </SPerfIndicator>
        <Profiler id={this.props.id} onRender={this._profilerOnRender}>
          {this.props.children}
        </Profiler>
      </>
    );
  }
}
