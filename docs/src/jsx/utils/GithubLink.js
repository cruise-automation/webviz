// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import styled from "styled-components";

import GithubLogo from "./GitHubLogo";

const StyledLink = styled.a`
  display: inline-flex;
  align-items: center;
`;
const StyledChildrenWrapper = styled.span`
  margin: 4px;
`;

type Props = {|
  path: string,
  children: React.Node,
  shouldPrefixLogo?: boolean,
|};

export default function GithubLink({ path, children, shouldPrefixLogo, ...rest }: Props) {
  return (
    <StyledLink title="Source Code" target="_blank" rel="noopener noreferrer" {...rest}>
      {shouldPrefixLogo && <GithubLogo width={16} />}
      <StyledChildrenWrapper>{children} </StyledChildrenWrapper>
      {!shouldPrefixLogo && <GithubLogo width={16} />}
    </StyledLink>
  );
}
