// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { complement } from "intervals-fn";
import React, { Component } from "react";

import AutoSizingCanvas from "webviz-core/src/components/AutoSizingCanvas";
import type { Progress } from "webviz-core/src/types/players";

const BAR_HEIGHT = 40;
const LINE_START = 5;
const LINE_HEIGHT = 5;

type ProgressProps = {|
  progress: Progress,
|};

type ProgressState = {|
  showComplete: boolean,
|};

function areDownloadsComplete(progress: Progress) {
  // satisfy flow
  const values: [?number] = (Object.values(progress.percentageByTopic || {}): any);
  // we are completed if all progresses are numbers and are greater than 99
  return values.length === 0 || !values.some((val: ?number) => val == null || val < 100);
}

export class ProgressPlot extends Component<ProgressProps, ProgressState> {
  state = { showComplete: false };
  _timeoutId: ?TimeoutID;

  shouldComponentUpdate(nextProps: ProgressProps, nextState: ProgressState) {
    return nextProps.progress !== this.props.progress || nextState.showComplete !== this.state.showComplete;
  }

  componentWillUnmount() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }
  }

  _draw = (context: CanvasRenderingContext2D, width: number, height: number) => {
    const { progress } = this.props;
    const { showComplete } = this.state;
    const { percentageByTopic = {} } = progress;

    context.clearRect(0, 0, width, height);
    let pendingCount = 0;
    let text = Object.keys(percentageByTopic)
      .map((key) => {
        const percent = percentageByTopic[key];
        // null or undefined means download is queued but not started
        if (percent == null) {
          pendingCount++;
          return undefined;
        }
        // because files can span a longer distance than the drive range percent can go over 100%
        if (percent >= 100) {
          return undefined;
        }
        // if download is 0 percent we're ingesting data before the drive range
        return percent ? `${key} ${percent}%` : key;
      })
      .filter(Boolean)
      .join(" ");

    if (pendingCount > 0) {
      text += ` — ${pendingCount} topic${pendingCount > 1 ? "s" : ""} queued...`;
    }

    context.fillStyle = "white";

    if (text) {
      context.fillText(`Downloading ${text}`, 0, 11);
    } else if (showComplete) {
      context.fillText("All topics downloaded.", 0, 11);
    }

    if (progress.fullyLoadedFractionRanges) {
      context.fillStyle = "rgba(0, 0, 0, 0.5)";
      const invertedRanges = complement({ start: 0, end: 1 }, progress.fullyLoadedFractionRanges);
      for (const range of invertedRanges) {
        const start = width * range.start;
        const end = width * range.end;
        context.fillRect(start, LINE_START + 12, end - start, LINE_HEIGHT);
      }
    }
  };

  componentDidUpdate(prevProps: ProgressProps) {
    const wasComplete = areDownloadsComplete(prevProps.progress);
    const isComplete = areDownloadsComplete(this.props.progress);
    if (!wasComplete && isComplete) {
      this.setState({ showComplete: true });
      clearTimeout(this._timeoutId);
      this._timeoutId = setTimeout(() => {
        delete this._timeoutId;
        this.setState({ showComplete: false });
      }, 5000);
    }
  }

  render() {
    return (
      <div style={{ height: BAR_HEIGHT }}>
        <AutoSizingCanvas draw={this._draw} />
      </div>
    );
  }
}
