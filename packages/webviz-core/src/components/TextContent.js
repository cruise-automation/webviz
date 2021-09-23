// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

import styles from "./TextContent.module.scss";
import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { showHelpModalOpenSource } from "webviz-core/src/util/showHelpModalOpenSource";

type LinkProps = {
  children: React.Node | string,
  href: string,
};
type Props = {
  children: React.Node | string,
  linkTarget?: string,
  renderLink?: (LinkProps) => React.Node,
  style?: { [string]: number | string },
};

const TextContent = (props: Props) => {
  const { children, linkTarget = undefined, style = {} } = props;

  // Make links in Markdown work with react-router.
  // Per https://github.com/rexxars/react-markdown/issues/29#issuecomment-275437798
  const renderLink = React.useCallback((linkProps: LinkProps) => {
    if (props.renderLink) {
      const link = props.renderLink(linkProps);
      if (link) {
        return link;
      }
    }
    if (getGlobalHooks().linkMessagePathSyntaxToHelpPage() && linkProps.href === "/help/message-path-syntax") {
      return (
        <a href="#" onClick={showHelpModalOpenSource}>
          {linkProps.children}
        </a>
      );
    }
    if (linkProps.href.match(/^\//)) {
      return <Link to={linkProps.href}>{linkProps.children}</Link>;
    }

    return (
      <a href={linkProps.href} target={linkTarget}>
        {linkProps.children}
      </a>
    );
  }, [linkTarget, props]);

  return (
    <div className={styles.root} style={style}>
      {typeof children === "string" ? <ReactMarkdown source={children} renderers={{ link: renderLink }} /> : children}
    </div>
  );
};

// Experimental! API subject to change.
// <TextContent> that uses links starting with a # to trigger webviz-specific actions.
// For example, you can use markdown to set global variables:
// [Click here to set $my_object_id to 12345](#global-variables={"my_object_id":12345})
export const TextContentWithWebvizMarkdown = (props: Props) => {
  const { setGlobalVariables } = useGlobalVariables();
  const renderLink = React.useCallback((linkProps: LinkProps) => {
    if (linkProps.href.startsWith("#")) {
      const params = new URLSearchParams(linkProps.href.substr(1));
      const globalVariablesStr = params.get("global-variables");
      if (globalVariablesStr) {
        const globalVariables = JSON.parse(globalVariablesStr);
        const title = `Set ${Object.keys(globalVariables)
          .map((key) => `$${key} to ${globalVariables[key]}`)
          .join(" and ")}`;

        return (
          <a
            href={"#"}
            title={title}
            onClick={(ev) => {
              ev.preventDefault();
              setGlobalVariables(globalVariables);
            }}>
            {linkProps.children}
          </a>
        );
      }
    }
    return null;
  }, [setGlobalVariables]);

  return <TextContent {...props} renderLink={renderLink} />;
};

export default TextContent;
