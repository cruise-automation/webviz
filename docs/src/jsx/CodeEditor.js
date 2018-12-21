//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live";
import styled, { css } from "styled-components";

const StyledProvider = styled(LiveProvider)`
  overflow: hidden;
  margin-bottom: 60px;
  position: relative;
`;

const LiveWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  align-items: stretch;
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const column = css`
  flex: 1 1 auto;
  width: 50%;
  min-height: 400px;
  max-height: 700px;
  @media (max-width: 600px) {
    width: 100%;
  }
`;

const StyledEditor = styled(LiveEditor)`
  background: blue;
  color: #eee;
  overflow: scroll;
  ${column}
`;

const StyledPreview = styled(LivePreview)`
  position: relative;
  background: transparent;
  color: black;
  overflow: hidden;
  display: flex;
  ${column}

  div, canvas {
    display: flex;
    flex: 1 1 auto;
  }
`;

const StyledError = styled(LiveError)`
  display: block;
  padding: 1rem;
  background: #f24366;
  color: white;
  position: absolute;
  top: 0;
  right: 0;
`;

const CodeEditor = ({ noInline, code, scope }) => {
  return (
    <StyledProvider code={code} scope={scope} noInline={noInline} mountStylesheet={false}>
      <LiveWrapper>
        <StyledEditor />
        <StyledPreview />
      </LiveWrapper>
      <StyledError />
    </StyledProvider>
  );
};

export default CodeEditor;
