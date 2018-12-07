//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from 'react';
import styled, { css } from 'styled-components';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';

const StyledProvider = styled(LiveProvider)`
  border-radius: 2px;
  box-shadow: 1px 1px 20px rgba(20, 20, 20, 0.27);
  overflow: hidden;
  margin-bottom: 16px;
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
  flex-basis: 50%;
  width: 50%;
  max-width: 50%;
  @media (max-width: 600px) {
    flex-basis: auto;
    width: 100%;
    max-width: 100%;
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
  background: white;
  color: black;
  height: auto;
  overflow: hidden;
  ${column}
`;

const StyledError = styled(LiveError)`
  display: block;
  padding: 1rem;
  background: red;
  color: white;
`;

const CodeEditor = ({ noInline, code, scope, vertical, height = 500 }) => {
  return (
    <StyledProvider code={code} scope={scope} noInline={noInline} mountStylesheet={false}>
      <LiveWrapper>
        <StyledEditor style={{ height }} />
        <StyledPreview />
      </LiveWrapper>
      <StyledError />
    </StyledProvider>
  );
};

export default CodeEditor;
