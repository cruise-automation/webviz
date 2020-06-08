// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import InteractionContextMenu from "./InteractionContextMenu";

const selectedObject = {
  id: "obj-1",
  header: { frame_id: "some_frame", stamp: { sec: 0, nsec: 0 } },
  action: 0,
  ns: "",
  type: 0,
  scale: {
    x: 2,
    y: 2,
    z: 4,
  },
  color: {
    r: 1,
    g: 0.1,
    b: 0,
    a: 0.7,
  },
  pose: {
    position: {
      x: -1,
      y: 1,
      z: -5,
    },
    orientation: {
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    },
  },
};
const sharedProps = {
  onSelectObject: () => {},
  selectedObjects: [
    { object: { ...selectedObject, interactionData: { topic: "/foo/bar" } }, instanceIndex: undefined },
    { object: { ...selectedObject, interactionData: { topic: "/foo1/bar" }, id: null }, instanceIndex: undefined },
    { object: { ...selectedObject, interactionData: { topic: "/abc/xyz" } }, instanceIndex: 10 },
    {
      object: {
        ...selectedObject,
        id: null,
        interactionData: { topic: "/some_topic_name/nested_name/with_very_very_very_longer_name/" },
      },
      instanceIndex: 10,
    },
    {
      object: {
        ...selectedObject,
        interactionData: { topic: "/some_topic/with_slightly_longer_names" },
      },
      instanceIndex: 10,
    },
  ],
  clickedPosition: { clientX: 100, clientY: 200 },
};

storiesOf("<InteractionContextMenu>", module).add("default", () => {
  return (
    <div style={{ background: "#2d2c33", display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
      <InteractionContextMenu {...sharedProps} />
    </div>
  );
});
