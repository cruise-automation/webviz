// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";

import TextField from "./TextField";
import Flex from "webviz-core/src/components/Flex";
import { createPrimitiveValidator, hasLen } from "webviz-core/src/components/validators";
import { triggerInputChange, triggerInputBlur } from "webviz-core/src/stories/PanelSetup";

const validator = createPrimitiveValidator([hasLen(4)]);

function Box({ children, title }) {
  return (
    <div style={{ width: 240, height: 100, margin: 8 }}>
      <p>{title}</p>
      {children}
    </div>
  );
}

function ErrorExample() {
  const [error, setError] = React.useState<?string>();
  return (
    <>
      <TextField value="foo" validator={validator} onError={setError} hideInlineError />
      <strong>This is a custom error UI: {error}</strong>
    </>
  );
}

function ControlledExample() {
  const [value, setValue] = React.useState<string>("");
  return (
    <div
      ref={(el) => {
        if (el) {
          const input = ((el.querySelector("input"): any): HTMLInputElement | null);
          triggerInputChange(input, "another value");
        }
      }}>
      <TextField value={value} onChange={setValue} />
    </div>
  );
}

function UncontrolledExample() {
  const [value, setValue] = React.useState<string>("");
  React.useEffect(() => {
    setValue("another value but not set in TextField");
  }, []);

  return (
    <div>
      <TextField defaultValue={value} onChange={setValue} />
      {value}
    </div>
  );
}

function ValidateOnBlurExample() {
  return (
    <div
      ref={(el) => {
        if (el) {
          const input = ((el.querySelector("input"): any): HTMLInputElement | null);
          // only see the validation error after input blur
          triggerInputChange(input, "invalid_val");
          setTimeout(() => {
            triggerInputBlur(input);
          }, 500);
        }
      }}>
      <TextField value="foo" validator={validator} validateOnBlur />
    </div>
  );
}

storiesOf("<TextField>", module).add("default", () => {
  return (
    <Flex wrap>
      <Box title="default">
        <TextField />
      </Box>
      <Box title="placeholder, label and custom styles">
        <TextField
          label="Name"
          placeholder="type something..."
          style={{ border: "1px solid green", padding: 4 }}
          inputStyle={{ border: "2px solid blue" }}
        />
      </Box>
      <Box title="controlled">
        <ControlledExample />
      </Box>
      <Box title="uncontrolled">
        <UncontrolledExample />
      </Box>
      <Box title="focusOnMount">
        <TextField defaultValue="foo" focusOnMount />
      </Box>
      <Box title="use hideInlineError to show custom error UI">
        <ErrorExample />
      </Box>
      <Box title="by default, validate on mount">
        <TextField value="foo" validator={validator} />
      </Box>
      <Box title="use validateOnBlur to reduce updates">
        <ValidateOnBlurExample />
      </Box>
    </Flex>
  );
});
