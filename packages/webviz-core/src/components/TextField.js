// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

const { useRef, useState, useLayoutEffect, useCallback } = React;

export const STextField = styled.div`
  display: flex;
  flex-direction: column;
`;

export const STextFieldLabel = styled.label`
  margin: 8px 0;
  color: ${colors.GRAY};
`;

export const SError = styled.div`
  color: ${colors.RED};
  margin: 4px 0;
`;

type Props = {
  defaultValue?: string,
  focusOnMount?: boolean,
  inputStyle: { [string]: string | number },
  hideInlineError?: boolean,
  label?: string,
  onBlur: () => void,
  onChange: (value: string) => void,
  onError?: (error: ?string) => void,
  placeholder?: string,
  style: { [string]: string | number },
  validateOnBlur?: boolean,
  validator: (value: any) => ?string,
  value?: string,
};

export default function TextField({
  defaultValue,
  focusOnMount,
  inputStyle,
  hideInlineError,
  label,
  onBlur,
  onChange,
  onError,
  placeholder,
  style,
  validateOnBlur,
  validator,
  value,
  ...rest
}: Props) {
  const [error, setError] = useState<?string>();
  const [inputStr, setInputStr] = useState<string>(value || defaultValue || "");

  const prevIncomingVal = useRef("");
  const inputRef = useRef(null);

  useLayoutEffect(
    () => {
      // only compare if it's a controlled component
      if (!defaultValue && !validateOnBlur && prevIncomingVal.current !== value) {
        const validationResult = validator(value);
        setError(validationResult || null);
        setInputStr(value || "");
      }
      prevIncomingVal.current = value;
    },
    [defaultValue, validateOnBlur, validator, value]
  );

  useLayoutEffect(
    () => {
      if (inputRef.current && focusOnMount) {
        inputRef.current.focus();
      }
    },
    [focusOnMount]
  );

  useLayoutEffect(
    () => {
      if (onError) {
        onError(error);
      }
    },
    [error, onError]
  );

  const validate = useCallback(
    (val) => {
      const validationResult = validator(val);
      if (validationResult) {
        setError(validationResult);
      } else {
        setError(null);
        onChange(val);
      }
    },
    [onChange, validator]
  );

  const handleChange = useCallback(
    ({ target }) => {
      setInputStr(target.value);
      if (!validateOnBlur) {
        validate(target.value);
      }
    },
    [validate, validateOnBlur]
  );

  const handleBlur = useCallback(
    () => {
      if (validateOnBlur) {
        validate(inputStr);
      }
      if (onBlur) {
        onBlur();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputStr, onBlur, validate, validateOnBlur]
  );

  // only show red border when there is some input and it's not valid
  const errorStyle = inputStr && error ? { border: `1px solid ${colors.RED}` } : {};

  return (
    <STextField style={style}>
      {label && <STextFieldLabel>{label}</STextFieldLabel>}
      <input
        onBlur={handleBlur}
        ref={inputRef}
        placeholder={placeholder}
        style={{ marginLeft: 0, ...errorStyle, ...inputStyle }}
        value={inputStr}
        onChange={handleChange}
        {...rest}
      />
      {error && !hideInlineError && <SError>{error}</SError>}
    </STextField>
  );
}

TextField.defaultProps = {
  validator: () => undefined,
  onChange: () => {},
  onBlur: () => {},
  inputStyle: {},
  style: {},
};
