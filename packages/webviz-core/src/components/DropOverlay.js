// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";
import styled from "styled-components";

const Outer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 100000;
  pointer-events: none;
`;

const Inner = styled.div`
  position: absolute;
  top: 40px;
  left: 40px;
  right: 40px;
  bottom: 40px;
  border-radius: 28px;
  border: 2px dashed rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  text-align: center;
  align-items: center;
  justify-content: center;
  color: white;
  padding: 40px;
  line-height: normal;
`;

function DropOverlay({ children }: { children: React.Node }) {
  return (
    <Outer>
      <Inner>{children}</Inner>
    </Outer>
  );
}

export default DropOverlay;
