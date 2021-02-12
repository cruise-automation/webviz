// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React, { Component } from "react";

import LogList from "./LogList";
import type { RenderRow } from "./LogList";

const MSG_BATCH_SIZE = 100;

const sampleText = [
  "Lorem ipsum dolor sit amet.",
  "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Perspiciatis excepturi dolorum molestias odit quidem, eligendi non doloremque consectetur cupiditate tenetur!",
  "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Repellat, vero.",
  "Lorem ipsum dolor sit amet consectetur adipisicing elit. Ut impedit temporibus, corporis quidem quam itaque.",
  "Lorem ipsum dolor sit amet consectetur adipisicing ",
];

const generateData = (size) => {
  return Array(size)
    .fill()
    .map((val, idx) => {
      return {
        id: idx,
        text: sampleText[idx % sampleText.length],
      };
    });
};

type Props = {
  renderRow: RenderRow<any>,
};

type State = {
  items: any[],
  paused: boolean,
};

class Example extends Component<Props, State> {
  _intervalId: IntervalID;
  state = { items: generateData(MSG_BATCH_SIZE), paused: true };

  componentDidMount() {
    if (!this.state.paused) {
      this._startTimer();
    }
  }

  componentWillUnmount() {
    clearInterval(this._intervalId);
  }

  _startTimer = () => {
    this._intervalId = setInterval(() => {
      const newData = generateData(MSG_BATCH_SIZE);
      const items = [...this.state.items, ...newData];
      this.setState({ items });
    }, 500);
  };

  togglePause = () => {
    const paused = !this.state.paused;
    if (paused) {
      clearInterval(this._intervalId);
    } else {
      this._startTimer();
    }
    this.setState({ paused });
  };

  render() {
    const { renderRow } = this.props;
    const { items, paused } = this.state;

    return (
      <div style={{ padding: 20, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        <button onClick={this.togglePause}>{paused ? "Resume Stream" : "Pause Stream"}</button>
        <LogList items={items} renderRow={renderRow} />
      </div>
    );
  }
}

storiesOf("<LogList>", module).add("default", () => {
  return (
    <Example
      renderRow={({ item, style }) => (
        <div
          style={{
            ...style,
            display: "flex",
            flexDirection: "column",
            padding: 8,
            borderBottom: "1px solid gray",
          }}
          key={item.id}>
          <h2 style={{ color: "orange", marginRight: 8 }}>{item.id}</h2> {item.text}
        </div>
      )}
    />
  );
});
