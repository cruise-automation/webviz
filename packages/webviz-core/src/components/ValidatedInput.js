// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import * as React from "react";
import styled from "styled-components";

import { validationErrorToString, type ValidationResult } from "webviz-core/shared/validators";
import Dropdown from "webviz-core/src/components/Dropdown";
import Flex from "webviz-core/src/components/Flex";
import { colors } from "webviz-core/src/util/sharedStyleConstants";
import YAML from "webviz-core/src/util/yaml";

const { useState, useCallback, useRef, useLayoutEffect, useEffect } = React;

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
  border: 1px solid ${colors.GRAY};
`;
const SError = styled.div`
  color: ${colors.RED};
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
  dataValidator = () => {},
  inputStyle = {},
  onChange,
  onError,
  parse,
  stringify,
  value,
}: BaseProps & ParseAndStringifyFn) {
  const [error, setError] = useState<string>("");
  const [inputStr, setInputStr] = useState<string>("");
  const prevIncomingVal = useRef("");
  const inputRef = useRef<?HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // validate the input string, and setError or call onChange if needed
  const memorizedInputValidation = useCallback((newInputVal: string, onChangeFcn?: OnChange) => {
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
    if (onChangeFcn) {
      onChangeFcn(newVal);
    }
  }, [dataValidator, parse, value]);

  // when not in editing mode, whenever the incoming value changes, we'll compare the new value with prevIncomingVal, and reset local state values if they are different
  useLayoutEffect(() => {
    if (!isEditing && value !== prevIncomingVal.current) {
      if (isEqual(value, prevIncomingVal.current)) {
        return;
      }
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
  }, [value, stringify, memorizedInputValidation, isEditing]);

  const handleChange = useCallback((e) => {
    const val = e.currentTarget && e.currentTarget.value;
    if (!isEditing) {
      setIsEditing(true);
    }
    setInputStr(val);
    memorizedInputValidation(val, onChange);
  }, [isEditing, memorizedInputValidation, onChange]);

  useEffect(() => {
    if (onError && error) {
      onError(error);
    }
  }, [error, onError]);

  // scroll to the bottom when the text gets too long
  useLayoutEffect(
    () => {
      if (!isEditing) {
        const inputElem = inputRef.current;
        if (inputElem) {
          inputElem.scrollTop = inputElem.scrollHeight;
        }
      }
    },
    [isEditing, inputStr] // update whenever inputStr changes
  );

  return (
    <>
      <StyledTextarea
        data-test="validated-input"
        style={inputStyle}
        ref={inputRef}
        value={inputStr}
        onChange={handleChange}
      />
      {error && <SError>{error}</SError>}
    </>
  );
}

export function JsonInput(props: BaseProps) {
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
