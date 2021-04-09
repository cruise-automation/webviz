//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { Component } from "react";

import inScreenshotTests from "stories/inScreenshotTests";

// storybook helper to render a story over and over w/ an oscillating value
export default (fn) => {
  class WithRange extends Component {
    static displayName = "withRange";

    state = { range: 0 };

    componentDidMount() {
      if (!inScreenshotTests()) {
        this.loop(0);
      }
    }

    componentWillUnmount() {
      this.stopped = true;
      cancelAnimationFrame(this.stop);
    }

    loop(count) {
      this.stop = requestAnimationFrame((tick) => {
        const range = (1 + Math.sin(count / 30)) / 2;
        this.setState({ range });
        if (!this.stopped) {
          this.loop(count + 1);
        }
      });
    }

    render() {
      return fn(this.state.range);
    }
  }
  const inner = () => <WithRange />;
  inner.displayName = "WithRangeInner";
  return inner;
};
