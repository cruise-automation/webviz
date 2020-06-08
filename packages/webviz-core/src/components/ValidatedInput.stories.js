// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";
import { DEFAULT_CAMERA_STATE } from "regl-worldview";

import ValidatedInput, { EDIT_FORMAT, type EditFormat } from "./ValidatedInput";
import Flex from "webviz-core/src/components/Flex";
import { createValidator, isNumber, type ValidationResult } from "webviz-core/src/components/validators";
import { triggerInputChange, triggerInputBlur } from "webviz-core/src/stories/PanelSetup";

const INPUT_OBJ = { id: 1, name: "foo" };
const INPUT_OBJ1 = { id: 2, name: "bar" };

const json = EDIT_FORMAT.JSON;
const yaml = EDIT_FORMAT.YAML;

function myValidator(data: any = {}): ?ValidationResult {
  const rules = { id: [isNumber] };
  const validator = createValidator(rules);
  const result = validator(data);
  return Object.keys(result).length === 0 ? undefined : result;
}

function Box({ children }) {
  return <div style={{ width: 200, height: 100 }}>{children}</div>;
}

function Example({
  format = EDIT_FORMAT.JSON,
  obj = INPUT_OBJ,
  changedObj = INPUT_OBJ1,
  onMount,
}: {
  format?: EditFormat,
  obj?: any,
  changedObj?: any,
  onMount?: (HTMLInputElement) => void,
}) {
  const [value, setValue] = React.useState(obj);

  React.useEffect(
    () => {
      setTimeout(() => {
        setValue(changedObj);
      }, 10);
    },
    [changedObj]
  );

  return (
    <Box>
      <div
        ref={(el) => {
          if (el && onMount) {
            const input = ((document.querySelector("[data-test='validated-input']"): any): HTMLInputElement | null);
            if (input) {
              onMount(input);
            }
          }
        }}>
        <ValidatedInput format={format} value={value} />
      </div>
    </Box>
  );
}

storiesOf("<ValidatedInput>", module)
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
        <Example format={json} />
        <Example format={yaml} />
      </Flex>
    );
  })
  .add("prop change does not override the input string if object values are deeply equal ", () => {
    // the input string does not change as `obj` and `changedObj` are deeply equal
    return (
      <Flex>
        <Example obj={INPUT_OBJ} changedObj={{ name: "foo", id: 1 }} />
      </Flex>
    );
  })
  .add("scroll to bottom when input size grows", () => {
    return (
      <Flex>
        <Example obj={INPUT_OBJ} changedObj={{ ...DEFAULT_CAMERA_STATE, distance: 100000000 }} />
      </Flex>
    );
  })
  .add("in editing mode, prop value change does not affect the input string", () => {
    return (
      <Flex>
        <Example
          onMount={(input) => {
            // even though the prop object has changed, the input value is in sync with current editing value
            triggerInputChange(input, "invalid_val");
            setTimeout(() => {
              triggerInputChange(input, "another_invalid_val");
            }, 50);
          }}
        />
      </Flex>
    );
  })

  .add("in editing mode, prop change does not cause the textarea to scroll to bottom", () => {
    const changedObj = { ...DEFAULT_CAMERA_STATE, distance: 100000000 };
    return (
      <Flex>
        <Example
          obj={DEFAULT_CAMERA_STATE}
          onMount={(input) => {
            setImmediate(() => {
              // scroll to the top and start editing
              input.scrollTop = 0;
              triggerInputChange(input, JSON.stringify(changedObj, null, 2));
            });
          }}
        />
      </Flex>
    );
  })
  .add("upon blur, the validation error stays", () => {
    return (
      <Flex>
        <Example
          obj={DEFAULT_CAMERA_STATE}
          onMount={(input) => {
            setImmediate(() => {
              triggerInputChange(input, "invalid_val");
              setImmediate(() => {
                triggerInputBlur(input);
              });
            });
          }}
        />
      </Flex>
    );
  });
