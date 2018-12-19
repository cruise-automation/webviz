//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { MDXProvider } from "@mdx-js/tag";
import React from "react";
import { HashRouter as Router, Route, Redirect, Switch } from "react-router-dom";

import Docs from "./Docs";
import Landing from "./Landing";

export default function App() {
  return (
    <MDXProvider components={{}}>
      <Router>
        <Switch>
          <Route path="/docs" component={Docs} />
          <Route exact path="/" component={Landing} />
          <Redirect to="/" />
        </Switch>
      </Router>
    </MDXProvider>
  );
}
