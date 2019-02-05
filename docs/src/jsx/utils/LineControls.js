//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import InputNumber from "./InputNumber";
import Switch from "./Switch";

export default function LineControls({
  thickness,
  setThickness,
  debug,
  setDebug,
  joined,
  setJoined,
  scaleInvariant,
  setScaleInvariant,
  closed,
  setClosed,
  monochrome,
  setMonochrome,
  style = {},
}) {
  return (
    <div style={{ color: "#88878a", ...style }}>
      <Switch on={debug} onChange={() => setDebug(!debug)} label="debug" />
      <Switch on={joined} onChange={() => setJoined(!joined)} label={"line-strip"} />
      <Switch on={scaleInvariant} onChange={() => setScaleInvariant(!scaleInvariant)} label="scaleInvariant" />
      <Switch on={closed} onChange={() => setClosed(!closed)} label="closed" />
      <Switch on={monochrome} onChange={() => setMonochrome(!monochrome)} label="monochrome" />
      <InputNumber horizontal label="thickness" value={thickness} min={0} max={5} step={0.01} onChange={setThickness} />
    </div>
  );
}
