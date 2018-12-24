// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import styled from "styled-components";

import GithubLogo from "./GitHubLogo";

const StyledLink = styled.a`
  display: inline-block;
`;

type Props = {||};

export default function GithubLink({ path, ...rest }: Props) {
  return (
    <StyledLink {...rest} title="Source Code" target="_blank" rel="noopener noreferrer">
      <GithubLogo width={18} />
    </StyledLink>
  );
}
