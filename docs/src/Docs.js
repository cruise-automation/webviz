//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState } from "react";
import { Route, Link, NavLink, Redirect } from "react-router-dom";
import routes, { componentList } from "./routes";
import styled from "styled-components";
import Logo from "./Logo";

const SideBar = styled.aside`
  width: 240px;
  position: fixed;
  left: 0;
  top: 0;
  overflow: hidden;
  @media only screen and (max-width: 680px) {
    right: 0;
    width: 100%;
    background: #1f1e27;
    z-index: 999;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
  }
`;

const LogoLink = styled(Link)`
  padding: 2rem;
  display: block;
  color: #f7f7f3;
  &:hover {
    color: #f7f7f3;
    opacity: 0.5;
  }
`;

const Navigation = styled.ul`
  max-height: calc(100vh - 88px);
  overflow-y: auto;
  padding: 0 2rem 2rem;
  margin: 0;
  list-style-type: none;
  width: 100%;
  @media only screen and (max-width: 680px) {
    display: ${(props) => (props.isMobileNavOpen ? "block" : "none")};
  }
`;

const Section = styled.li`
  margin-bottom: 1rem;
  display: block;

  ul,
  li {
    padding: 0;
    margin: 0;
    list-style-type: none;
  }

  li {
    margin-bottom: 0.25rem;
    a {
      color: #f7f7f3;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 14px;
      &.active {
        color: #a395e2;
      }
    }
  }

  div {
    font-size: 14px;
    opacity: 0.5;
    margin-bottom: 0.5rem;
  }
`;

const MainContainer = styled.main`
  margin-left: 240px;
  padding: 0 2rem 2rem;
  @media only screen and (max-width: 680px) {
    margin-left: 0;
    margin-top: 4rem;
  }
`;

const Main = styled.div`
  max-width: 1040px;
  margin: 0 auto;
`;

const MobileNavigationToggle = styled.a`
  display: none;
  padding: 2rem;
  cursor: pointer;
  &:hover {
    opacity: 0.5;
  }
  @media only screen and (max-width: 680px) {
    display: block;
  }
`;

const GithubLink = styled.a`
  color: #edcc28 !important;
`;

function DefaultMain({ name, ...rest }) {
  return (
    <div>
      <h1>WIP</h1> Coming soon...
    </div>
  );
}

const Docs = (props) => {
  console.log(props);
  const [isMobileNavOpen, toggleMobileNav] = useState(0);

  return (
    <React.Fragment>
      <SideBar>
        <LogoLink to="/">
          <Logo width={160} />
        </LogoLink>
        <MobileNavigationToggle onClick={() => toggleMobileNav(!isMobileNavOpen)}>
          {isMobileNavOpen ? "↑" : "↓"}
        </MobileNavigationToggle>
        <Navigation isMobileNavOpen={isMobileNavOpen}>
          {routes.map((route) => (
            <Section key={route.path}>
              {route.name && <div>{route.name}</div>}
              <ul>
                {route.subRoutes.map((subRoute) => (
                  <li key={subRoute.path}>
                    <NavLink
                      to={`${route.path}${subRoute.path}`}
                      onClick={() => toggleMobileNav(false)}
                      activeClassName="active">
                      {subRoute.name || subRoute.main}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </Section>
          ))}
          <Section>
            <li>
              <GithubLink href="https://github.com/cruise-automation/webviz" rel="noopener noreferrer" target="_blank">
                Github
              </GithubLink>
            </li>
          </Section>
        </Navigation>
      </SideBar>
      <MainContainer>
        <Main>
          <Route exact path="/docs" render={() => <Redirect to="/docs/guides" />} />
          {routes.map((route) => (
            <React.Fragment key={route.path}>
              <Route
                exact
                path={route.path}
                render={() => <Redirect to={`${route.path}${route.subRoutes[0].path}`} />}
              />
              {route.subRoutes.map((subRoute) => (
                <div className="markdown-body" key={subRoute.path}>
                  <Route
                    exact={subRoute.exact}
                    path={`${route.path}${subRoute.path}`}
                    component={componentList[subRoute.main] || DefaultMain}
                  />
                </div>
              ))}
            </React.Fragment>
          ))}
        </Main>
      </MainContainer>
    </React.Fragment>
  );
};

export default Docs;
