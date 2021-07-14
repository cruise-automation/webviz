//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

const TextWrapper = styled.div`
  position: absolute;
  pointer-events: none;
  width: 100%;
  bottom: 8px;
  left: 8px
  z-index: 1;
  overflow: hidden;
  font-size: 0.8rem;
  color: gray;
  white-space: pre-line;
`;

export default function CameraStateInfo({ cameraState }) {
  const cameraStateInfo = Object.keys(cameraState)
    .map((key) => `${key}: ${cameraState[key]}`)
    .join("\n");
  return <TextWrapper>{cameraStateInfo}</TextWrapper>;
}
