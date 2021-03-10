// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useState, useRef, useCallback } from "react";
import styled from "styled-components";

import useGlobalVariables from "webviz-core/src/hooks/useGlobalVariables";
import { ICON_BY_TYPE } from "webviz-core/src/panels/ThreeDimensionalViz/constants";
import { SRow, SValue } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/Interactions";
import { ObjectDetailsBase as ObjectDetails } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/ObjectDetails";
import TopicLink from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/TopicLink";
import type { InteractionData } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import { parseStringTemplate } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/index";
import { getUpdatedGlobalVariablesBySelectedObject } from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import { BG_COLOR, SText } from "webviz-core/src/panels/ThreeDimensionalViz/WorldMarkers";
import type { TypedMessage } from "webviz-core/src/players/types";
import type { Icon2dMarkersMessage, Icon2dMarker } from "webviz-core/src/types/Messages";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const ICON_WRAPPER_WIDTH = 24;

const SIconMarker = styled.div`
  border-radius: ${ICON_WRAPPER_WIDTH / 2}px;
  display: flex;
  align-items: center;
  background: ${BG_COLOR};
  position: absolute;
  cursor: pointer;
  font-size: 12px;
`;
const SInnerWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;
const SCircle = styled.div`
  width: ${ICON_WRAPPER_WIDTH}px;
  height: ${ICON_WRAPPER_WIDTH}px;
  border-radius: ${ICON_WRAPPER_WIDTH / 2}px;
  background: ${colors.BLUE};
  display: flex;
  align-items: center;
  justify-content: center;
`;
const SObjectDetailsWrapper = styled.div`
  position: absolute;
  padding: 12px;
  background: ${colors.DARK};
  font-size: 12px;
  max-width: 288px;
`;

type Props = {|
  style: { [attr: string]: string | number },
  iconMarkers: TypedMessage<Icon2dMarkersMessage>[],
  iconTextTemplate: ?string,
  zoomPercentage: number, // Use the zoomPercentage to calculate the icon position.
|};

type ClickedObject = {|
  left: number,
  top: number,
  object: Icon2dMarker,
  interactionData: InteractionData,
|};
export default function IconMarkers({ iconMarkers, iconTextTemplate, style, zoomPercentage }: Props) {
  const [clickedObject, setClickedObject] = useState<?ClickedObject>();
  const containerRef = useRef<?HTMLDivElement>();
  const { linkedGlobalVariables } = useLinkedGlobalVariables();

  const { setGlobalVariables } = useGlobalVariables();

  const unsetClickedObject = useCallback(() => setClickedObject(undefined), []);
  const onClickObjectDetailsWrapper = useCallback((e: MouseEvent) => e.stopPropagation(), []);

  return (
    <div onClick={unsetClickedObject} ref={containerRef} style={{ ...style, position: "absolute" }}>
      {iconMarkers.map(({ message, topic }) => {
        return (
          <SInnerWrapper key={topic}>
            {message.markers.map((object, idx) => {
              const {
                position: { x, y },
                icon_type,
                metadata = {},
              } = object;

              const text = object.text || (iconTextTemplate && parseStringTemplate(iconTextTemplate, metadata)) || "";
              const SvgIcon = ICON_BY_TYPE[icon_type] || ICON_BY_TYPE.DEFAULT;
              return (
                <SIconMarker
                  onClick={(ev: MouseEvent) => {
                    ev.stopPropagation();
                    if (!containerRef.current) {
                      return;
                    }
                    const containerRect = containerRef.current.getBoundingClientRect();
                    const left = ev.clientX - containerRect.left;
                    const top = ev.clientY - containerRect.top;
                    const originalMessage = object;

                    if (clickedObject && clickedObject.object.id === originalMessage.id) {
                      // Unset the state when clicked the same object.
                      setClickedObject(undefined);
                      return;
                    }
                    setClickedObject({
                      left,
                      top,
                      object: originalMessage,
                      interactionData: { topic, originalMessage },
                    });
                    const newGlobalVariables = getUpdatedGlobalVariablesBySelectedObject(
                      {
                        instanceIndex: undefined,
                        object: { ...object, interactionData: { topic, originalMessage } },
                      },
                      linkedGlobalVariables
                    );
                    if (newGlobalVariables) {
                      setGlobalVariables(newGlobalVariables);
                    }
                  }}
                  // Place the svg icon at the center of the specified position. Ok to let the text flow to right.
                  style={{
                    left: (x * zoomPercentage) / 100 - ICON_WRAPPER_WIDTH / 2,
                    top: (y * zoomPercentage) / 100 - ICON_WRAPPER_WIDTH / 2,
                  }}
                  key={`${icon_type}_${idx}`}>
                  <SCircle>
                    <SvgIcon fill="white" width={16} height={16} />
                  </SCircle>
                  {text && <SText>{text}</SText>}
                </SIconMarker>
              );
            })}
            {clickedObject && (
              <SObjectDetailsWrapper
                onClick={onClickObjectDetailsWrapper}
                style={{
                  left: clickedObject.left + ICON_WRAPPER_WIDTH / 2,
                  top: clickedObject.top + ICON_WRAPPER_WIDTH / 2,
                }}>
                <SRow>
                  <SValue>
                    <TopicLink topic={clickedObject.interactionData.topic} />
                  </SValue>
                </SRow>
                <ObjectDetails interactionData={clickedObject.interactionData} objectToDisplay={clickedObject.object} />
              </SObjectDetailsWrapper>
            )}
          </SInnerWrapper>
        );
      })}
    </div>
  );
}
