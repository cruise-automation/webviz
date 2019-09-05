//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LZString from "lz-string";
import React from "react";
import styled from "styled-components";

import CodeSandboxIcon from "./icons/CodeSandbox";
import { palette } from "./theme";

const StyledActionButton = styled.button`
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

function convertAbsoluteImportsToRelativeImports(code) {
  // These imports need to be converted because there is no good way to alias an aboslute import in code sandbox.
  return code.replace(/from "common/g, `from "./common`);
}

function CodeSandboxButton({ codeSandboxCode, codeSandboxConfig = {} }) {
  const dependencies = codeSandboxConfig.dependencies || {};
  const files = codeSandboxConfig.files || {};

  let parameters = {
    files: {
      "package.json": {
        content: {
          dependencies,
        },
      },
      "index.js": {
        content: convertAbsoluteImportsToRelativeImports(codeSandboxCode),
      },
      "index.html": {
        content: '<div id="root"></div>',
      },
      ...files,
    },
  };

  parameters = LZString.compressToBase64(JSON.stringify(parameters));

  return (
    <form action="https://codesandbox.io/api/v1/sandboxes/define" method="POST" target="_blank">
      <input type="hidden" name="parameters" value={parameters} />
      <StyledActionButton type="submit" title="Open in CodeSandbox">
        <CodeSandboxIcon />
      </StyledActionButton>
    </form>
  );
}

export default CodeSandboxButton;
