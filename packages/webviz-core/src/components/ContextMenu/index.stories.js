// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import ContextMenu from "webviz-core/src/components/ContextMenu";
import Menu, { Item } from "webviz-core/src/components/Menu";

storiesOf("<ContextMenu>", module).add("standard", () => {
  const onContextMenu = (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    const menu = (
      <Menu>
        <Item>foo</Item>
        <Item>bar</Item>
        <Item>baz</Item>
      </Menu>
    );
    ContextMenu.show(e.clientX, e.clientY, menu);
  };
  return (
    <div style={{ margin: 20 }}>
      <div onContextMenu={onContextMenu} style={{ margin: 20, padding: 20, backgroundColor: "pink" }}>
        right click on me
      </div>
    </div>
  );
});
