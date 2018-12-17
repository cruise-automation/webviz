//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import { MDXProvider } from "@mdx-js/tag";
import { BrowserRouter as Router, Route } from "react-router-dom";
import Landing from "./Landing";
import Docs from "./Docs";

export default function App() {
  return (
    <MDXProvider components={{}}>
      <Router>
        <React.Fragment>
          <Route exact path="/" component={Landing} />
          <Route path="/docs" children={({ match }) => (match ? <Docs /> : null)} />
        </React.Fragment>
      </Router>
    </MDXProvider>
  );
}
