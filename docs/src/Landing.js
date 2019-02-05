//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import Demo from "./Demo";
import CruiseLogo from "./jsx/utils/CruiseLogo";
import GitHubLogo from "./jsx/utils/GitHubLogo";
import Logo from "./jsx/utils/Logo";
import { color, fontSize } from "./jsx/utils/theme";

const OuterContainer = styled.div`
  padding: 50px;
  background-image: url(wv.png);
  background-position: center top;
  background-size: 1600px auto;
  background-repeat: no-repeat;
  min-height: 100vh;
  @media only screen and (max-width: 940px) {
    background-position: 30% top;
  }
`;

const InnerContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  max-width: 560px;
  height: 700px;
  padding: 30px 0;

  h1,
  h2 {
    font-weight: normal;
    margin: 24px 0;
  }

  h1 {
    font-size: ${fontSize.h1};
    line-height: 1.4;
  }
  h2 {
    font-size: ${fontSize.h2};
  }

  @media only screen and (max-width: 940px) {
    h1 {
      font-size: ${fontSize.h1Sm};
    }
  }
`;

const HeaderLinks = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;

  a {
    color: ${color.linkPrimary};
    border: 1px solid ${color.linkPrimary};
    padding: 4px 10px;
    text-decoration: none;
    &:hover,
    &:visited {
      color: ${color.linkPrimaryVisited};
    }
  }

  @media only screen and (max-width: 940px) {
    a {
      width: 180px;
      margin-bottom: 20px;
    }
  }
`;

const GitHubLink = styled.a`
  display: inline-flex;
  align-items: center;
  margin-right: 26px;

  svg {
    margin-right: 8px;
    margin-bottom: 2px;
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 60px 0 0;
`;

const DocsFooterLink = styled(Link)`
  display: block;
  color: ${color.linkPrimary} !important;
  text-decoration: none;
  font-size: 18px;
`;

const Landing = () => (
  <OuterContainer>
    <InnerContainer>
      <Header>
        <Logo width={170} />
        <h1 className="monospace">Declarative rendering for interactive scenes</h1>
        <h2>
          Worldview is a lightweight, extensible 2D and 3D scene renderer built on{" "}
          <a href="https://reactjs.org/" target="_blank" rel="noopener noreferrer">
            React
          </a>{" "}
          and{" "}
          <a href="http://regl.party/" target="_blank" rel="noopener noreferrer">
            regl
          </a>
          . Performance, ease of use, and extensibility are top priorities.
        </h2>
        <HeaderLinks>
          <GitHubLink
            href="https://github.com/cruise-automation/webviz"
            className="monospace"
            target="_blank"
            rel="noopener noreferrer">
            <GitHubLogo width={20} />
            GitHub
          </GitHubLink>
          <Link to="/docs" className="monospace">
            Documentation →
          </Link>
        </HeaderLinks>
      </Header>
      <Demo />
      <Footer>
        <DocsFooterLink to="/docs" className="monospace">
          Get started →
        </DocsFooterLink>
        <a href="https://getcruise.com" target="_blank" rel="noopener noreferrer" style={{ color: "currentColor" }}>
          <CruiseLogo height={20} />
        </a>
      </Footer>
    </InnerContainer>
  </OuterContainer>
);

export default Landing;
