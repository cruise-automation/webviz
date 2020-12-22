// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useRef, useState } from "react";
import ReactInputAutosize from "react-input-autosize";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

export function ValidatedResizingInput(props: {|
  value: string,
  onChange: (string) => void,
  invalidInputs: string[],
  dataTest?: string,
|}) {
  const [internalValue, setInternalValue] = useState<string>(props.value);
  const lastPropsValue = useRef<string>(props.value);
  if (lastPropsValue.current !== props.value) {
    lastPropsValue.current = props.value;
    setInternalValue(props.value);
  }
  return (
    <ReactInputAutosize
      style={{ color: !props.invalidInputs.includes(internalValue) ? "white" : colors.RED }}
      value={`$${internalValue}`}
      data-test={props.dataTest}
      onChange={(event) => {
        const value = event.target.value.slice(1);
        setInternalValue(value);
        if (!props.invalidInputs.includes(value)) {
          props.onChange(value);
        }
      }}
    />
  );
}
