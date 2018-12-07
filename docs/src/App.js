//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from 'react';
import { MDXProvider } from '@mdx-js/tag';
import { BrowserRouter as Router, Route, Link, Redirect } from 'react-router-dom';
import routes, { componentList } from './routes';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: row;
`;

const Header = styled.header`
  flex-direction: column;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
`;

const SideBar = styled.aside`
  width: 240px;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  overflow-y: scroll;
  padding: 1rem;
  background-color: #f1f1f1;
  ul {
    padding: 0;
    margin: 0;
    list-style: none;
    li {
      a {
        display: inline-block;
        font-size: 0.875rem;
        padding-left: 8px;
        line-height: 1.2;
      }
    }
  }
`;

const Main = styled.main`
  margin-left: 240px;
  flex: 1;
  overflow-x: hidden;
  padding: 1rem;
`;

function DefaultMain({ name, ...rest }) {
  return (
    <div>
      <h1>WIP</h1> Coming soon...
    </div>
  );
}

export default function App() {
  return (
    <MDXProvider components={{}}>
      <Router>
        <Container>
          <SideBar>
            <Header>
              <Link to="/">
                <h1 className="font-md">Regl Worldview</h1>
              </Link>
            </Header>
            <ul>
              {routes.map((route) => (
                <li key={route.path}>
                  <div> {route.name}</div>
                  <ul>
                    {route.subRoutes.map((subRoute) => (
                      <li key={subRoute.path}>
                        <Link to={`${route.path}${subRoute.path}`}>{subRoute.name || subRoute.main}</Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </SideBar>
          <Main>
            <Route exact path="/" render={() => <Redirect to="/guides" />} />
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
        </Container>
      </Router>
    </MDXProvider>
  );
}
