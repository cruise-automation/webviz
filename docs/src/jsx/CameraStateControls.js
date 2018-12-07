//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from 'react';
import Switch from './Switch';
import InputNumber from './InputNumber';

export default function CameraStateControls({
  perspective,
  distance,
  thetaOffset,
  phi,
  posX,
  posY,
  posZ,
  offsetX,
  offsetY,
  offsetZ,
  orientationX,
  orientationY,
  orientationZ,
  setPerspective,
  setDistance,
  setThetaOffset,
  setPhi,
  setPosX,
  setPosY,
  setPosZ,
  setOffsetX,
  setOffsetY,
  setOffsetZ,
  setOrientationX,
  setOrientationY,
  setOrientationZ,
}) {
  return (
    <div>
      <div>
        <Switch on={perspective} onChange={() => setPerspective(!perspective)} label="perspective" />
      </div>
      <div>
        <InputNumber label="distance" value={distance} min={0} max={400} step={1} onChange={setDistance} />
        <InputNumber
          label="thetaOffset"
          value={thetaOffset}
          min={0}
          max={Math.PI * 2}
          step={0.01}
          onChange={setThetaOffset}
        />
        <InputNumber label="phi" value={phi} min={0} max={Math.PI} step={0.01} onChange={setPhi} />
        <InputNumber label="posX" value={posX} min={0} max={20} step={0.1} onChange={setPosX} />
        <InputNumber label="posY" value={posY} min={0} max={20} step={0.1} onChange={setPosY} />
        <InputNumber label="posZ" value={posZ} min={0} max={20} step={0.1} onChange={setPosZ} />

        <InputNumber label="orientationX" value={orientationX} min={0} max={20} step={0.1} onChange={setOrientationX} />
        <InputNumber label="orientationY" value={orientationY} min={0} max={20} step={0.1} onChange={setOrientationY} />
        <InputNumber label="orientationZ" value={orientationZ} min={0} max={20} step={0.1} onChange={setOrientationZ} />
        <InputNumber label="offsetX" value={offsetX} min={0} max={20} step={0.1} onChange={setOffsetX} />
        <InputNumber label="offsetY" value={offsetY} min={0} max={20} step={0.1} onChange={setOffsetY} />
        <InputNumber label="offsetZ" value={offsetZ} min={0} max={20} step={0.1} onChange={setOffsetZ} />
      </div>
    </div>
  );
}
