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
import {
  DEFAULT_TEXT_COLOR,
  sendIconTypeDeprecatedNotification,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands/OverlayProjector";
import { ICON_BY_TYPE } from "webviz-core/src/panels/ThreeDimensionalViz/constants";
import { BG_COLOR, SText } from "webviz-core/src/panels/ThreeDimensionalViz/IconOverlay";
import { SRow, SValue } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/Interactions";
import ObjectDetails from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/ObjectDetails";
import TopicLink from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/TopicLink";
import useLinkedGlobalVariables from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
import { parseStringTemplate } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder/index";
import { getUpdatedGlobalVariablesBySelectedObject } from "webviz-core/src/panels/ThreeDimensionalViz/threeDimensionalVizUtils";
import type { TypedMessage } from "webviz-core/src/players/types";
import type { Icon2dMarkersMessage, Icon2dMarker } from "webviz-core/src/types/Messages";
import { colorToRgbaString } from "webviz-core/src/util/colorUtils";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const ICON_WRAPPER_HEIGHT = 24;
const ICON_SIZE = 16;

const SIconMarker = styled.div`
  border-radius: ${ICON_WRAPPER_HEIGHT / 2}px;
  box-shadow: 0px 1px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.075);
  display: flex;
  align-items: center;
  background: ${BG_COLOR};
  position: absolute;
  cursor: pointer;
  font-size: 12px;
  padding: ${(ICON_WRAPPER_HEIGHT - ICON_SIZE) / 2}px;
`;
const SInnerWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
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
  object: $ReadOnly<{|
    interactionData: $ReadOnly<{ topic: string, originalMessage: Icon2dMarker }>,
  |}>,
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
              let iconTypes = metadata.icon_types;
              const iconType = icon_type || metadata.icon_type;
              if (!iconTypes && iconType) {
                sendIconTypeDeprecatedNotification();
                iconTypes = [{ icon_type: iconType }];
              }
              if (!iconTypes) {
                return null;
              }

              const text = object.text || (iconTextTemplate && parseStringTemplate(iconTextTemplate, metadata)) || "";
              const textColor = object.outline_color || DEFAULT_TEXT_COLOR;

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

                    if (
                      clickedObject &&
                      clickedObject.object.interactionData.originalMessage.id === originalMessage.id
                    ) {
                      // Unset the state when clicked the same object.
                      setClickedObject(undefined);
                      return;
                    }
                    setClickedObject({
                      left,
                      top,
                      object: { interactionData: { topic, originalMessage } },
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
                    color: colorToRgbaString(textColor),
                    borderRadius: ICON_WRAPPER_HEIGHT / 2,
                    left: (x * zoomPercentage) / 100 - ICON_WRAPPER_HEIGHT / 2,
                    top: (y * zoomPercentage) / 100 - ICON_WRAPPER_HEIGHT / 2,
                  }}
                  key={`${icon_type}_${idx}`}>
                  {iconTypes.map((iconConfig, idx1) => {
                    const SvgIcon = ICON_BY_TYPE[`${iconConfig.icon_type}`] || ICON_BY_TYPE.DEFAULT;
                    let fill = colors.BLUE;
                    if (iconConfig.color) {
                      const { r, g, b, a } = iconConfig.color; // Use color to control the background color of the icon.
                      fill = `rgba(${r * 255},${g * 255},${b * 255},${a})`;
                    }
                    return <SvgIcon key={`${icon_type}${idx1}`} width={ICON_SIZE} height={ICON_SIZE} fill={fill} />;
                  })}
                  {text && <SText>{text}</SText>}
                </SIconMarker>
              );
            })}
            {clickedObject && (
              <SObjectDetailsWrapper
                onClick={onClickObjectDetailsWrapper}
                style={{
                  left: clickedObject.left + ICON_WRAPPER_HEIGHT / 2,
                  top: clickedObject.top + ICON_WRAPPER_HEIGHT / 2,
                }}>
                <SRow>
                  <SValue>
                    <TopicLink topic={clickedObject.object.interactionData.topic} />
                  </SValue>
                </SRow>
                <ObjectDetails selectedObject={clickedObject.object.interactionData.originalMessage} />
              </SObjectDetailsWrapper>
            )}
          </SInnerWrapper>
        );
      })}
    </div>
  );
}
