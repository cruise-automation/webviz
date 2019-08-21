// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { type MouseEventObject } from "regl-worldview";
import styled from "styled-components";

import { type ClickedPosition } from "webviz-core/src/panels/ThreeDimensionalViz/Layout";
import colors from "webviz-core/src/styles/colors.module.scss";

const SInteractionContextMenu = styled.div`
  position: fixed;
  width: 240px;
  background: ${colors.toolbar};
  z-index: 100; /* above the Text marker */
`;

const SMenu = styled.ul`
  margin: 0;
  padding: 0;
`;

const STooltip = styled.div`
  cursor: pointer;
  background: #3b2e76;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  padding: 8px;
`;

const SMenuItem = styled.li`
  cursor: pointer;
  padding: 8px;
  position: relative;
  &:hover {
    background: #3b2e76;
    ${STooltip} {
      display: block;
    }
  }
`;

const STopic = styled.div`
  width: 100%;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;

type Props = {
  clickedPosition: ClickedPosition,
  selectedObjects: MouseEventObject[],
  onSelectObject: (MouseEventObject) => void,
};

export default function InteractionContextMenu({ selectedObjects = [], clickedPosition = {}, onSelectObject }: Props) {
  return (
    <SInteractionContextMenu
      style={{
        top: clickedPosition.clientY,
        left: clickedPosition.clientX,
      }}>
      <SMenu>
        {selectedObjects.map(({ object, instanceIndex }, index) => (
          <SMenuItem key={index}>
            <STopic
              key={object.id || (object.interactionData && object.interactionData.topic)}
              onClick={() => onSelectObject({ object, instanceIndex })}>
              {object.interactionData && object.interactionData.topic}
              <STooltip>{object.interactionData && object.interactionData.topic}</STooltip>
            </STopic>
          </SMenuItem>
        ))}
      </SMenu>
    </SInteractionContextMenu>
  );
}
