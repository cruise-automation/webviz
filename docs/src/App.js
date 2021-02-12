//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { MDXProvider } from "@mdx-js/tag";
import createHashHistory from "history/createHashHistory";
import React from "react";
import { withRouter } from "react-router";
import { Router, Route, Redirect, Switch, Link } from "react-router-dom";

import Docs from "./Docs";
import Landing from "./Landing";

const history = createHashHistory();
history.listen(() => window.scrollTo(0, 0));

// A wrapper for generating scrollTo behavior when children text is matched with url path's last part.
function ScrollTo({ component: Tag = "div", location, children, match, disableAnchorLink, ...rest }) {
  const wrapperRef = React.useRef();
  const lastPathPartials = location.pathname.split("/").pop();
  let hasLink = false;
  let linkStr;
  if (typeof children === "string") {
    linkStr = children
      .replace(/[\W_]+/g, " ") // only keep letters, numbers and spaces
      .toLowerCase()
      .split(" ")
      .join("-");
    hasLink = linkStr === lastPathPartials;
  }

  React.useEffect(() => {
    let disableScroll = false;
    const urlPartials = window.location.href.split("?");
    if (urlPartials.length > 1) {
      const queryStr = urlPartials[1];
      const search = new URLSearchParams(queryStr);
      disableScroll = search.get("disableScroll");
    }
    if (!disableScroll && hasLink) {
      window.scrollTo({ top: wrapperRef.current.offsetTop, behavior: "smooth" });
    }
  }, [lastPathPartials]);
  return (
    <div ref={wrapperRef}>
      {linkStr ? (
        <Link style={{ textDecoration: "none" }} to={disableAnchorLink ? match.path : `${match.path}/${linkStr}`}>
          <Tag>{children}</Tag>
        </Link>
      ) : (
        <Tag>{children}</Tag>
      )}
    </div>
  );
}

const ScrollToWithRouter = withRouter(ScrollTo);

const components = {
  // auto generate links for h2 and h3 and scroll to the element if the url path is matched with the heading text
  h2: (props) => <ScrollToWithRouter component="h2" {...props} />, // eslint-disable-line react/display-name
  h3: (props) => <ScrollToWithRouter component="h3" {...props} />, // eslint-disable-line react/display-name
  h1: (props) => <ScrollToWithRouter component="h1" disableAnchorLink {...props} />, // eslint-disable-line react/display-name
};
export default function App() {
  return (
    <MDXProvider components={components}>
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
