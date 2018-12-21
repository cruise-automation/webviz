//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { memo } from "react";
import styled from "styled-components";

import InputNumber from "./InputNumber";
import Switch from "./Switch";

const InputGroupWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-left: -20px;
  margin-right: -20px;
  > div {
    width: 25%;
    flex: none;
    padding: 0 20px;
  }

  @media screen and (max-width: 600px) {
    > div {
      width: 100%;
    }
  }
`;

function CameraStateControls({
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
    <div style={{ color: "#88878a", marginBottom: 20 }}>
      <div>
        <Switch on={perspective} onChange={() => setPerspective(!perspective)} label="perspective" />
      </div>
      <InputGroupWrapper>
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
        </div>
        <div>
          <InputNumber label="posX" value={posX} min={0} max={20} step={0.1} />
          <InputNumber label="posY" value={posY} min={0} max={20} step={0.1} onChange={setPosY} />
          <InputNumber label="posZ" value={posZ} min={0} max={20} step={0.1} onChange={setPosZ} />
        </div>
        <div>
          <InputNumber
            label="orientationX"
            value={orientationX}
            min={0}
            max={20}
            step={0.1}
            onChange={setOrientationX}
          />
          <InputNumber
            label="orientationY"
            value={orientationY}
            min={0}
            max={20}
            step={0.1}
            onChange={setOrientationY}
          />
          <InputNumber
            label="orientationZ"
            value={orientationZ}
            min={0}
            max={20}
            step={0.1}
            onChange={setOrientationZ}
          />
        </div>
        <div>
          <InputNumber label="offsetX" value={offsetX} min={0} max={20} step={0.1} onChange={setOffsetX} />
          <InputNumber label="offsetY" value={offsetY} min={0} max={20} step={0.1} onChange={setOffsetY} />
          <InputNumber label="offsetZ" value={offsetZ} min={0} max={20} step={0.1} onChange={setOffsetZ} />
        </div>
      </InputGroupWrapper>
    </div>
  );
}

export default memo(CameraStateControls);
