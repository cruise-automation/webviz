//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import InputNumber from "./InputNumber";

export default function ConeControls({
  scaleX,
  setScaleX,
  scaleY,
  setScaleY,
  scaleZ,
  setScaleZ,
  min = 0.5,
  max = 20,
  step = 0.1,
  style = {},
}) {
  const sharedProps = { min, max, step };

  return (
    <div style={style}>
      <InputNumber label="scaleX" {...sharedProps} value={scaleX} onChange={setScaleX} />
      <InputNumber label="scaleY" {...sharedProps} value={scaleY} onChange={setScaleY} />
      <InputNumber label="scaleZ" {...sharedProps} value={scaleZ} onChange={setScaleZ} />
    </div>
  );
}
