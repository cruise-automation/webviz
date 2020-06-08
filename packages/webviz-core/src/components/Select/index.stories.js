// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import ReactDOM from "react-dom";
import TestUtils from "react-dom/test-utils";

import { Select, Option } from ".";

storiesOf("<Select>", module)
  .add("closed", () => {
    return (
      <div style={{ padding: 30, width: 300 }}>
        <Select text="Hello" value="bar" onChange={() => {}}>
          {[]}
        </Select>
      </div>
    );
  })
  .add("empty", () => {
    const ref = React.createRef();
    const onMount = () => {
      // eslint-disable-next-line react/no-find-dom-node
      const node = ReactDOM.findDOMNode(ref.current);
      if (!node || node instanceof Text) {
        throw new Error("couldn't find select node");
      }
      TestUtils.Simulate.click(node);
    };
    return (
      <div style={{ padding: 30, width: 300 }} ref={onMount}>
        <Select text="Hello" value="bar" onChange={() => {}} ref={ref}>
          {[]}
        </Select>
      </div>
    );
  })
  .add("with items", () => {
    const ref = React.createRef();
    const onMount = () => {
      // eslint-disable-next-line react/no-find-dom-node
      const node = ReactDOM.findDOMNode(ref.current);
      if (!node || node instanceof Text) {
        throw new Error("couldn't find select node");
      }
      TestUtils.Simulate.click(node);
    };
    return (
      <div style={{ padding: 30, width: 300 }} ref={onMount}>
        <Select text="Hello" value="bar" onChange={() => {}} ref={ref}>
          <Option value="foo">Foo</Option>
          <Option value="bar">Bar</Option>
        </Select>
      </div>
    );
  });
