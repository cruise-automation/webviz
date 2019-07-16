// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { withScreenshot } from "storybook-chrome-screenshot";

import ValidatedInput, { EDIT_FORMAT, type EditFormat } from "./ValidatedInput";
import Flex from "webviz-core/src/components/Flex";
import { createValidator, isNumber, type ValidationResult } from "webviz-core/src/components/validators";

const INPUT_OBJ = { id: 1, name: "foo" };
const json = EDIT_FORMAT.JSON;
const yaml = EDIT_FORMAT.YAML;

function myValidator(data: Object = {}): ?ValidationResult {
  const rules = { id: [isNumber] };
  const validator = createValidator(rules);
  const result = validator(data);
  return Object.keys(result).length === 0 ? undefined : result;
}

function Box({ children }) {
  return <div style={{ width: 200, height: 100 }}>{children}</div>;
}

function ControlExample({ format = EDIT_FORMAT.JSON }: { format?: EditFormat }) {
  const [value, setValue] = React.useState<Object>(INPUT_OBJ);
  React.useEffect(() => {
    setTimeout(() => {
      setValue({ id: 2, name: "bar" });
    }, 10);
  }, []);

  return (
    <Box>
      <ValidatedInput format={format} value={value} />
    </Box>
  );
}

storiesOf("<ValidatedInput>", module)
  .addDecorator(withScreenshot())
  .add("default", () => {
    return (
      <Flex>
        <Box>
          <ValidatedInput format={json} value={INPUT_OBJ} />
        </Box>
        <Box>
          <ValidatedInput format={yaml} value={INPUT_OBJ} />
        </Box>
      </Flex>
    );
  })
  .add("with dataValidator (show validation error after mount)", () => {
    const invalidValue = { id: "not number", name: "foo" };
    return (
      <Flex>
        <Box>
          <ValidatedInput format={json} value={invalidValue} dataValidator={myValidator} />
        </Box>
        <Box>
          <ValidatedInput format={yaml} value={invalidValue} dataValidator={myValidator} />
        </Box>
      </Flex>
    );
  })
  .add("value change affects the input value", () => {
    return (
      <Flex>
        <ControlExample format={json} />;
        <ControlExample format={yaml} />;
      </Flex>
    );
  });
