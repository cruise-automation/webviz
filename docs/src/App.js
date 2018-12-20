//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { MDXProvider } from "@mdx-js/tag";
import createHashHistory from "history/createHashHistory";
import React from "react";
import { Router, Route, Redirect, Switch } from "react-router-dom";

import Docs from "./Docs";
import Landing from "./Landing";

const history = createHashHistory();
history.listen(() => window.scrollTo(0, 0));

export default function App() {
  return (
    <MDXProvider components={{}}>
      <Router history={history}>
        <Switch>
          <Route path="/docs" component={Docs} />
          <Route exact path="/" component={Landing} />
          <Redirect to="/" />
        </Switch>
      </Router>
    </MDXProvider>
  );
}
