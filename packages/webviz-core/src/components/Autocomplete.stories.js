// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React, { Component } from "react";
import TestUtils from "react-dom/test-utils";

import Autocomplete from "webviz-core/src/components/Autocomplete";

function focusInput(el) {
  if (el) {
    const input = el.querySelector("input");
    if (input) {
      input.focus();
    }
  }
}

storiesOf("<Autocomplete>", module)
  .add("filtering to 'o'", () => {
    class Example extends Component<{}> {
      render() {
        return (
          <div style={{ padding: 20 }} ref={focusInput}>
            <Autocomplete items={["one", "two", "three"]} filterText={"o"} value={"o"} onSelect={() => {}} hasError />
          </div>
        );
      }
    }
    return <Example />;
  })
  .add("with non-string items and leading whitespace", () => {
    return (
      <div style={{ padding: 20 }} ref={focusInput}>
        <Autocomplete
          items={[{ value: "one", text: "ONE" }, { value: "two", text: "    TWO" }, { value: "three", text: "THREE" }]}
          getItemText={({ text }) => text}
          filterText={"o"}
          value={"o"}
          onSelect={() => {}}
        />
      </div>
    );
  })
  .add("uncontrolled value", () => {
    return (
      <div
        style={{ padding: 20 }}
        ref={(el) => {
          if (el) {
            const input: ?HTMLInputElement = (el.querySelector("input"): any);
            if (input) {
              input.focus();
              input.value = "h";
              TestUtils.Simulate.change(input);
            }
          }
        }}>
        <Autocomplete
          items={[{ value: "one" }, { value: "two" }, { value: "three" }]}
          getItemText={({ value }) => `item: ${value.toUpperCase()}`}
          onSelect={() => {}}
        />
      </div>
    );
  })
  .add("uncontrolled value with selected item", () => {
    return (
      <div style={{ padding: 20 }} ref={focusInput}>
        <Autocomplete
          items={[{ value: "one" }, { value: "two" }, { value: "three" }]}
          getItemText={({ value }) => `item: ${value.toUpperCase()}`}
          selectedItem={{ value: "two" }}
          onSelect={() => {}}
        />
      </div>
    );
  })
  .add("uncontrolled value with selected item and clearOnFocus", () => {
    return (
      <div style={{ padding: 20 }} ref={focusInput}>
        <Autocomplete
          items={[{ value: "one" }, { value: "two" }, { value: "three" }]}
          getItemText={({ value }) => `item: ${value.toUpperCase()}`}
          selectedItem={{ value: "two" }}
          onSelect={() => {}}
          clearOnFocus
        />
      </div>
    );
  })
  .add("sortWhenFiltering=false", () => {
    return (
      <div style={{ padding: 20 }} ref={focusInput}>
        <Autocomplete
          items={[{ value: "bab" }, { value: "bb" }, { value: "a2" }, { value: "a1" }]}
          getItemText={({ value }) => `item: ${value.toUpperCase()}`}
          value={"b"}
          onSelect={() => {}}
          sortWhenFiltering={false}
        />
      </div>
    );
  })
  .add("at the right edge of the screen", () => {
    class Example extends Component<{}> {
      render() {
        return (
          <div style={{ position: "absolute", right: 0, padding: 20 }} ref={focusInput}>
            <Autocomplete items={["loooooooooooooong item"]} value="looo" onSelect={() => {}} />
          </div>
        );
      }
    }
    return <Example />;
  })
  .add("with a long truncated path (and autoSize)", () => {
    class Example extends Component<{}> {
      render() {
        return (
          <div style={{ maxWidth: 200 }} ref={focusInput}>
            <Autocomplete
              items={[]}
              value="/abcdefghi_jklmnop.abcdefghi_jklmnop[:]{some_id==1297193}.isSomething"
              onSelect={() => {}}
              autoSize
            />
          </div>
        );
      }
    }
    return <Example />;
  });
