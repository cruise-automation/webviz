// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import GridIcon from "@mdi/svg/svg/grid.svg";
import MapMarkerIcon from "@mdi/svg/svg/map-marker.svg";
import { storiesOf } from "@storybook/react";
import React, { useState } from "react";

import Menu from "webviz-core/src/components/Menu";
import Tree, { type Node } from "webviz-core/src/components/Tree";

function getInitialState() {
  const root = {
    text: "foo",
    id: "root",
    visible: true,
    expanded: true,
    checked: false,
    children: [
      {
        id: "branch-1",
        text: "this is the name of a very long branch",
        expanded: true,
        checked: false,
        visible: true,
        children: [
          {
            id: "sub-branch-1",
            text: "sub branch 1",
            icon: <MapMarkerIcon />,
            checked: false,
            visible: true,
            expanded: true,
            children: [
              {
                id: "leaf-1",
                text: "this is the name of a very long leaf node 1",
                checked: false,
                visible: true,
                icon: <MapMarkerIcon />,
              },
              {
                id: "leaf-2",
                text: "this is the name of another very long leaf node 2",
                checked: false,
                visible: true,
                icon: <GridIcon />,
              },
            ],
          },
        ],
      },
      {
        id: "branch-2",
        text: "branch 2",
        checked: false,
        visible: true,
        children: [
          {
            id: "child-1",
            text: "child 1",
            checked: false,
            visible: true,
          },
          {
            id: "invisible",
            text: "invisible",
            checked: false,
            visible: false,
          },
        ],
      },
      {
        id: "branch-3",
        text: "branch 3",
        checked: false,
        visible: true,
        expanded: true,
        children: [
          {
            id: "foobar",
            text: "foo bar baz",
            checked: false,
            visible: true,
            expanded: true,
            disabled: true,
            children: [
              {
                id: "foobar child",
                text: "child of foo bar baz",
                checked: false,
                visible: true,
                expanded: true,
                disabled: true,
                children: [
                  {
                    id: "far child",
                    text: "At the bottom of everything",
                    checked: false,
                    visible: true,
                    disabled: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  return {
    root,
  };
}

function Example({ hideRoot }: { hideRoot?: boolean }) {
  const [state, setState] = useState(() => getInitialState());
  const { root } = state;
  const onNodeCheck = (node: Node) => {
    node.checked = !node.checked;
    setState({ ...state, root });
  };
  const onNodeExpand = (node: Node) => {
    node.expanded = !node.expanded;
    setState({ ...state, root });
  };

  return (
    <div style={{ backgroundColor: "pink", padding: 20, maxWidth: 350 }}>
      <Menu>
        <Tree hideRoot={hideRoot} onToggleCheck={onNodeCheck} onToggleExpand={onNodeExpand} root={root} />
      </Menu>
    </div>
  );
}

storiesOf("<Tree>", module)
  .add("standard hideRoot_true", () => <Example hideRoot />)
  .add("standard hideRoot_false", () => <Example />);
