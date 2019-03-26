//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live";
import styled, { css } from "styled-components";

import CodeSanboxLink from "./CodeSandboxLink";
import CopyIcon from "./icons/Copy";
import DoneIcon from "./icons/Done";
import { color, palette } from "./theme";

const StyledProvider = styled(LiveProvider)`
  overflow: hidden;
  margin-bottom: 60px;
  position: relative;
`;

const LiveWrapper = styled.div`
  display: flex;
  ${({ isRowView }) =>
    isRowView
      ? css`
          flex-direction: column;
        `
      : css`
          flex-direction: row;
          justify-content: stretch;
          align-items: stretch;
          @media (max-width: 600px) {
            flex-direction: column;
          }
        `}
`;

const column = css`
  flex: 1 1 auto;
  width: 50%;
  @media (max-width: 600px) {
    width: 100%;
  }
`;

const StyledEditor = styled.div`
  overflow: scroll;
  position: relative;
  min-height: 400px;
  max-height: 760px;
  pre {
    &:focus {
      outline: none;
    }
  }
  ${({ isRowView }) => !isRowView && column}
  ${({ isRowView }) =>
    isRowView &&
    css`
      margin-bottom: 8px;
    `}
`;

const StyledNonEditableArea = styled.pre`
  margin-bottom: 0 !important;
  max-height: 104px;
  overflow-y: scroll;
`;

const StyledPreview = styled.div`
  position: relative;
  background: transparent;
  color: black;
  overflow: hidden;
  display: flex;
  ${({ isRowView }) => !isRowView && column}

  div, canvas {
    display: flex;
    flex: 1 1 auto;
  }
`;

const StyledError = styled(LiveError)`
  display: block;
  padding: 1rem;
  background: ${color.danger};
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
  display: flex;
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
    background: ${palette.white20};
    outline: none;
    cursor: pointer;
  }
`;

function CodeEditor({
  code,
  codeSandboxCode,
  codeSandboxConfig = {},
  componentName,
  copyCode,
  docUrl,
  isRowView,
  noInline,
  nonEditableCode,
  hideNonEditableCode,
  scope,
}) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <StyledProvider code={code} scope={scope} noInline={noInline} mountStylesheet={false}>
      <LiveWrapper isRowView={isRowView}>
        <StyledEditor
          isRowView={isRowView}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}>
          {hovered && (
            <StyledActions>
              <CopyToClipboard text={copyCode} onCopy={() => setCopied(true)}>
                <StyledActionBtn onMouseLeave={() => setCopied(false)} title="Copy code">
                  {copied ? <DoneIcon color={color.success} /> : <CopyIcon />}
                </StyledActionBtn>
              </CopyToClipboard>
              {codeSandboxCode && (
                <CodeSanboxLink codeSandboxCode={codeSandboxCode} codeSandboxConfig={codeSandboxConfig} />
              )}
            </StyledActions>
          )}
          {!hideNonEditableCode && <StyledNonEditableArea>{nonEditableCode}</StyledNonEditableArea>}
          <LiveEditor />
        </StyledEditor>
        <StyledPreview isRowView={isRowView}>
          <LivePreview />
        </StyledPreview>
      </LiveWrapper>
      <StyledError />
    </StyledProvider>
  );
}

export default CodeEditor;
