// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback, useContext, useEffect } from "react";
import { type MouseEventObject } from "regl-worldview";
import styled from "styled-components";

import type { InteractionData } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import { ThreeDimensionalVizContext } from "webviz-core/src/panels/ThreeDimensionalViz/ThreeDimensionalVizContext";
import { type ClickedPosition } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/Layout";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SInteractionContextMenu = styled.div`
  position: fixed;
  width: 240px;
  background: ${colors.DARK4};
  opacity: 0.9;
  z-index: 101; /* above the Text marker */
`;

const SMenu = styled.ul`
  margin: 0;
  padding: 0;
`;

const STooltip = styled.div`
  cursor: pointer;
  background: ${colors.PURPLE1};
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
    background: ${colors.PURPLE1};
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

const SId = styled.span`
  color: ${colors.YELLOW1};
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
          <InteractionContextMenuItem
            key={index}
            object={object}
            instanceIndex={instanceIndex}
            onSelectObject={onSelectObject}
          />
        ))}
      </SMenu>
    </SInteractionContextMenu>
  );
}

function InteractionContextMenuItem({
  object,
  onSelectObject,
  instanceIndex,
}: {
  object: {
    id: any,
    ns?: string,
    interactionData?: ?InteractionData,
  },
  onSelectObject: (MouseEventObject) => void,
  instanceIndex?: number,
}) {
  const menuText = (
    <>
      {object.id && <SId>{object.id}</SId>}
      {object.interactionData?.topic}
    </>
  );

  const topic = object.interactionData?.topic;
  const { setHoveredMarkerMatchers } = useContext(ThreeDimensionalVizContext);
  const onMouseEnter = useCallback(
    () => {
      if (topic) {
        const { id, ns } = object;
        const checks = [{ markerKeyPath: ["id"], value: id }];
        if (ns) {
          checks.push({ markerKeyPath: ["ns"], value: ns });
        }
        return setHoveredMarkerMatchers([{ topic, checks }]);
      }
    },
    [object, setHoveredMarkerMatchers, topic]
  );
  const onMouseLeave = useCallback(() => setHoveredMarkerMatchers([]), [setHoveredMarkerMatchers]);
  useEffect(() => onMouseLeave, [onMouseLeave]);

  const selectObject = useCallback(() => onSelectObject({ object, instanceIndex }), [
    instanceIndex,
    object,
    onSelectObject,
  ]);

  return (
    <SMenuItem onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} data-test="InteractionContextMenuItem">
      <STopic key={object.id || object.interactionData?.topic} onClick={selectObject}>
        {menuText}
        <STooltip>{menuText}</STooltip>
      </STopic>
    </SMenuItem>
  );
}
