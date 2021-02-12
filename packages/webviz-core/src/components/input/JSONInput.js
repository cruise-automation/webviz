// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useRef, useState } from "react";

import { colors } from "webviz-core/src/util/sharedStyleConstants";

const keyValMap = { ArrowDown: -1, ArrowUp: 1 };

export function JSONInput(props: {| value: string, dataTest?: string, onChange: (mixed) => void |}) {
  const [internalValue, setInternalValue] = useState<string>(props.value);
  const lastPropsValue = useRef<string>(props.value);
  if (lastPropsValue.current !== props.value) {
    lastPropsValue.current = props.value;
    setInternalValue(props.value);
  }
  const parsedValue = parseJson(internalValue);
  const isValid = parsedValue !== undefined;
  return (
    <input
      style={{ color: isValid ? "white" : colors.RED }}
      data-test={props.dataTest || "json-input"}
      type="text"
      value={internalValue}
      onChange={(e) => {
        setInternalValue(e.target.value);
        const newParsedValue = parseJson(e.target.value);
        if (newParsedValue !== undefined) {
          props.onChange(newParsedValue);
        }
      }}
      onKeyDown={(e) => {
        if (typeof parsedValue === "number" && keyValMap[e.key]) {
          const newParsedValue = parsedValue + keyValMap[e.key];
          setInternalValue(`${newParsedValue}`);
          props.onChange(newParsedValue);
        }
      }}
    />
  );
}

function parseJson(val: string): ?mixed {
  try {
    return JSON.parse(val);
  } catch (e) {
    return undefined;
  }
}
