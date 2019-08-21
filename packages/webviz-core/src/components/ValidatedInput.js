// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import Dropdown from "webviz-core/src/components/Dropdown";
import Flex from "webviz-core/src/components/Flex";
import { validationErrorToString, type ValidationResult } from "webviz-core/src/components/validators";
import colors from "webviz-core/src/styles/colors.module.scss";
import YAML from "webviz-core/src/util/yaml";

export const EDIT_FORMAT = { JSON: "json", YAML: "yaml" };

const SEditBox = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 200px;
  max-height: 800px;
`;
// TODO(Audrey): work with design to update Dropdown UI
const STransparentDropdownButton = styled.div`
  padding-top: 6px;
  display: inline-flex;
  button {
    background: transparent;
    display: inline-flex;
  }
`;
const StyledTextarea = styled.textarea`
  flex: 1 1 auto;
  resize: none;
`;
const SError = styled.div`
  color: ${colors.red};
  padding: 8px 4px;
`;

type Value = any;
type OnChange = (obj: any) => void;
type ParseAndStringifyFn = {
  stringify: (obj: any) => string,
  parse: (val: string) => any,
};
export type EditFormat = $Values<typeof EDIT_FORMAT>;
export type BaseProps = {
  dataValidator?: (data: any) => ?ValidationResult,
  inputStyle?: { [attr: string]: string | number },
  onChange?: OnChange,
  onError?: (err: string) => void,
  value: Value,
};
type Props = BaseProps & {
  format: EditFormat,
  children?: React.Node, // addition UI next to the format select
  onSelectFormat?: (format: EditFormat) => void,
};

/**
 * The base component for ValidatedInput which handles the value change, data validation
 * and data stringifying/parsing. Any external value change will cause the input string to change
 * and trigger new validations. Only valid internal value change will call onChange. Any data processing
 * and validation error will trigger onError.
 */
export function ValidatedInputBase({
  dataValidator = (data) => {},
  inputStyle = {},
  onChange,
  onError,
  parse,
  stringify,
  value,
}: BaseProps & ParseAndStringifyFn) {
  const [error, setError] = React.useState<string>("");
  const [inputStr, setInputStr] = React.useState<string>("");
  const prevIncomingVal = React.useRef("");
  const inputRef = React.useRef<?HTMLTextAreaElement>(null);

  // validate the input string, and setError or call onChange if needed
  const memorizedInputValidation = React.useCallback(
    (newInputVal: string, onChange?: OnChange) => {
      let newVal;
      let newError;
      // parse the empty string directly as empty array or object for validation and onChange callback
      if (newInputVal.trim() === "") {
        newVal = Array.isArray(value) ? [] : {};
      } else {
        try {
          newVal = parse(newInputVal);
        } catch (e) {
          newError = e.message;
        }
      }

      if (newError) {
        setError(newError);
        return;
      }
      setError(""); // clear the previous error
      const validationResult = dataValidator(newVal);
      if (validationResult) {
        setError(validationErrorToString(validationResult));
        return;
      }
      if (onChange) {
        onChange(newVal);
      }
    },
    [dataValidator, parse, value]
  );

  // whenever the incoming value changes, we'll compare the new value with prevIncomingVal, and reset local state values if they are different
  React.useEffect(
    () => {
      if (value !== prevIncomingVal.current) {
        let newVal = "";
        let newError;
        try {
          newVal = stringify(value);
        } catch (e) {
          newError = `Error stringifying the new value, using "" as default. ${e.message}`;
        }
        setInputStr(newVal);
        prevIncomingVal.current = value;
        if (newError) {
          setError(newError);
          return;
        }
        // try to validate if successfully stringified the new value
        memorizedInputValidation(newVal);
      }
    },
    [value, prevIncomingVal, stringify, memorizedInputValidation]
  );

  React.useEffect(
    () => {
      if (onError && error) {
        onError(error);
      }
    },
    [error, onError]
  );

  function handleChange(e) {
    setInputStr(e.target.value);
    memorizedInputValidation(e.target.value, onChange);
  }

  // scroll to the bottom when the text gets too long
  React.useEffect(
    () => {
      const inputElem = inputRef.current;
      if (inputElem) {
        inputElem.scrollTop = inputElem.scrollHeight;
      }
    },
    [inputStr]
  );

  return (
    <>
      <StyledTextarea style={inputStyle} innerRef={inputRef} value={inputStr} onChange={handleChange} />
      {error && <SError>{error}</SError>}
    </>
  );
}

function JsonInput(props: BaseProps) {
  function stringify(val) {
    return JSON.stringify(val, null, 2);
  }
  return <ValidatedInputBase parse={JSON.parse} stringify={stringify} {...props} />;
}

export function YamlInput(props: BaseProps) {
  return <ValidatedInputBase parse={YAML.parse} stringify={YAML.stringify} {...props} />;
}

// An enhanced input component that allows editing values in json or yaml format with custom validations
export default function ValidatedInput({ format = EDIT_FORMAT.JSON, onSelectFormat, children, ...rest }: Props) {
  const InputComponent = format === EDIT_FORMAT.JSON ? JsonInput : YamlInput;
  return (
    <Flex col>
      <Flex row reverse>
        {children}
        <STransparentDropdownButton>
          <Dropdown position="right" value={format} text={format.toUpperCase()} onChange={onSelectFormat}>
            {Object.keys(EDIT_FORMAT).map((key) => (
              <option value={EDIT_FORMAT[key]} key={key}>
                {key}
              </option>
            ))}
          </Dropdown>
        </STransparentDropdownButton>
      </Flex>
      <SEditBox>
        <InputComponent {...rest} />
      </SEditBox>
    </Flex>
  );
}

// For component consumers that don't care about maintaining the editFormat state, use this instead
export function UncontrolledValidatedInput({ format = EDIT_FORMAT.YAML, ...rest }: Props) {
  const [editFormat, setEditFormat] = React.useState<EditFormat>(format);
  return <ValidatedInput {...rest} format={editFormat} onSelectFormat={(newFormat) => setEditFormat(newFormat)} />;
}
