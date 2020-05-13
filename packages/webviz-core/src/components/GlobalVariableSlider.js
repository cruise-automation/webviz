// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { type Node as ReactNode, useCallback } from "react";

import { SliderWithTicks } from "webviz-core/src/components/SliderWithTicks";
import type { SliderProps } from "webviz-core/src/components/SliderWithTicks";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";

type Props = {
  sliderProps: SliderProps,
  globalVariableName: string,
};

// A slider that controls the value of a global variable
export default function GlobalVariableSlider(props: Props): ReactNode {
  const { globalVariables, setGlobalVariables } = useGlobalVariables();
  const globalVariableValue = globalVariables[props.globalVariableName];

  const onChange = useCallback(
    (newValue) => {
      if (newValue !== globalVariableValue) {
        setGlobalVariables({ [props.globalVariableName]: newValue });
      }
    },
    [props.globalVariableName, globalVariableValue, setGlobalVariables]
  );
  return <SliderWithTicks value={globalVariableValue} sliderProps={props.sliderProps} onChange={onChange} />;
}
