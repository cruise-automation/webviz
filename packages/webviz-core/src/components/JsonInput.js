// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import { validationErrorToString, type ValidationResult } from "./validator";
import colors from "webviz-core/src/styles/colors.module.scss";

const StyledTextarea = styled.textarea`
  flex: 1 1 auto;
  resize: none;
`;

const SError = styled.div`
  color: ${colors.red};
  padding: 8px 4px;
`;

type Props = {
  value: Object | string,
  onChange: (jsonObj: Object) => void,
  dataValidator: (jsonObj: Object) => ?ValidationResult,
};

export default function JsonInput({ value, onChange, dataValidator }: Props) {
  let defaultVal = (typeof value !== "string" && value) || "";
  const [error, setError] = React.useState<string>("");

  if (typeof value === "object") {
    try {
      defaultVal = JSON.stringify(value, null, 2);
    } catch (e) {
      setError(`Error parsing JSON value, using "" as default. ${e.message}`);
    }
  }

  const [inputVal, setInputValue] = React.useState<string>(defaultVal);

  // update consumer value if the input value is not valid json
  React.useEffect(
    () => {
      if (error) {
        onChange(null);
      }
    },
    [error, onChange]
  );

  function handleChange(e) {
    setInputValue(e.target.value);

    try {
      const newVal = JSON.parse(e.target.value);
      const validationResult = dataValidator(newVal);
      if (validationResult) {
        setError(validationErrorToString(validationResult));
        return;
      }
      setError("");
      onChange(newVal);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <StyledTextarea value={inputVal} onChange={handleChange} />
      {error && <SError>{error}</SError>}
    </>
  );
}
