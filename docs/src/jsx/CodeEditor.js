//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live";
import styled, { css } from "styled-components";

import CopyIcon from "../utils/icons/Copy";
import DoneIcon from "../utils/icons/Done";

const SUCCESS_COLOR = "#2bb622";

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

const StyledEditor = styled.div`
  overflow: scroll;
  position: relative;
  pre {
    &:focus {
      outline: none;
    }
  }
  ${column}
`;

const StyledNonEditableArea = styled.pre`
  margin-bottom: 0 !important;
  max-height: 104px;
  overflow-y: scroll;
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

const StyledActions = styled.div`
  position: absolute;
  top: 0;
  right: 4px;
  text-align: right;
`;
const StyledActionBtn = styled.button`
  background: transparent;
  border: none;
  width: 44px;
  height: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  &:hover,
  &:focus {
    background: rgba(255, 255, 255, 0.2);
    outline: none;
  }
`;

function CodeEditor({ noInline, code, nonEditableCode, scope }) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <StyledProvider code={code} scope={scope} noInline={noInline} mountStylesheet={false}>
      <LiveWrapper>
        <StyledEditor onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          {hovered && (
            <StyledActions>
              <CopyToClipboard text={[nonEditableCode, "\n", code].join("\n")} onCopy={() => setCopied(true)}>
                <StyledActionBtn onMouseLeave={() => setCopied(false)}>
                  {copied ? <DoneIcon color={SUCCESS_COLOR} /> : <CopyIcon />}
                </StyledActionBtn>
              </CopyToClipboard>
            </StyledActions>
          )}
          <StyledNonEditableArea>{nonEditableCode}</StyledNonEditableArea>
          <LiveEditor />
        </StyledEditor>
        <StyledPreview />
      </LiveWrapper>
      <StyledError />
    </StyledProvider>
  );
}

export default CodeEditor;
