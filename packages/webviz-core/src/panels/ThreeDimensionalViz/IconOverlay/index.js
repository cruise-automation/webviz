// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { clamp, isEqual } from "lodash";
import React, { type Node } from "react";
import styled from "styled-components";
import tinyColor from "tinycolor2";

import { type RenderItemOutput } from "webviz-core/src/panels/ThreeDimensionalViz/commands/OverlayProjector";
import { ICON_BY_TYPE } from "webviz-core/src/panels/ThreeDimensionalViz/constants";
import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import type { OverlayIconMarker } from "webviz-core/src/types/Messages";
import { useChangeDetector } from "webviz-core/src/util/hooks";
import Rpc from "webviz-core/src/util/Rpc";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

// Unfortunately, we call onIconClick with a nasty "drawable icon data" message, for which we have
// no good type. It bears a little resemblance to a parsed icon marker, though.
type OnIconClick = (iconMarker: Interactive<OverlayIconMarker>, {| clientX: number, clientY: number |}) => void;

type Props = {
  cameraDistance: number,
  onIconClick: OnIconClick,
  rpc: Rpc,
};

export const SText = styled.span`
  margin-left: 4px;
  margin-right: 8px;
`;

const ICON_WRAPPER_SIZE = 24;
const ICON_SIZE = 16;
const ICON_WIDTH = 28;
export const BG_COLOR = tinyColor(colors.DARK2)
  .setAlpha(0.75)
  .toRgbString();
export const SIconWrapper = styled.div`
  box-shadow: 0px 1px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: ${ICON_WIDTH / 2}px;
  display: flex;
  overflow: hidden;
  align-items: center;
  background: ${BG_COLOR};
  position: absolute;
  top: 0;
  left: 0;
  cursor: pointer;
`;

const MIN_SCALE = 0.6;
const MIN_DISTANCE = 50;
const MAX_DISTANCE = 100;
// The icons will scale according to camera distance between MIN_DISTANCE and MAX_DISTANCE, from 100% to MIN_SCALE.
function getIconScaleByCameraDistance(distance: number): number {
  const effectiveIconDistance = clamp(distance, MIN_DISTANCE, MAX_DISTANCE);
  return 1 - ((effectiveIconDistance - MIN_DISTANCE) * (1 - MIN_SCALE)) / (MAX_DISTANCE - MIN_DISTANCE);
}

function getIconStyles(
  distance: number
): {|
  iconWrapperPadding: number,
  scaledIconSize: number,
  scaledIconWrapperSize: number,
|} {
  const scale = getIconScaleByCameraDistance(distance);
  const scaledIconWrapperSize = Math.round(scale * ICON_WRAPPER_SIZE);
  const scaledIconSize = Math.round(scale * ICON_SIZE);
  const iconWrapperPadding = Math.floor((scaledIconWrapperSize - scaledIconSize) / 2);
  return {
    iconWrapperPadding,
    scaledIconSize,
    scaledIconWrapperSize,
  };
}

const IconOverlay = (props: Props) => {
  const { cameraDistance, onIconClick, rpc } = props;
  const [overlayIcons, setOverlayIcons] = React.useState<RenderItemOutput[]>([]);
  const updateOverlayIcons = React.useCallback((newIcons) => {
    // Make sure the new icons are different from the existing ones in order to
    // prevent re-renders if the state does not actually change. Also, use the
    // functional type state setter to avoid the `updateOverlayIcons` function
    // to change when the icon state does.
    setOverlayIcons((oldIcons) => (isEqual(oldIcons, newIcons) ? oldIcons : newIcons));
  }, [setOverlayIcons]);
  if (useChangeDetector([rpc], true)) {
    rpc.receive("updateOverlayIcons", updateOverlayIcons);
  }

  // Render smaller icons when camera is zoomed out.
  const { scaledIconWrapperSize, iconWrapperPadding, scaledIconSize } = getIconStyles(cameraDistance);
  const onClick = React.useCallback(async (ev) => {
    const name = ev.currentTarget.dataset.iconName;
    const marker = await rpc.send<?Interactive<OverlayIconMarker>>("getIconData", name);
    if (marker) {
      onIconClick(marker, { clientX: ev.clientX, clientY: ev.clientY });
    }
  }, [onIconClick, rpc]);

  return overlayIcons.map<Node>((icon) => {
    if (!icon) {
      return null;
    }
    const {
      textColor,
      name,
      iconTypes,
      text,
      markerStyle = {},
      iconOffset: { x = 0, y = 0 } = {},
      coordinates: [left, top],
    } = icon;

    return (
      <SIconWrapper
        key={name}
        data-icon-name={name}
        onClick={onClick}
        style={{
          ...markerStyle,
          color: `rgba(${textColor.r * 255},${textColor.g * 255},${textColor.b * 255},${textColor.a})`,
          borderRadius: scaledIconWrapperSize / 2,
          padding: iconWrapperPadding,
          transform: `translate(${(left - scaledIconWrapperSize / 2 + x).toFixed()}px,${(
            top -
            scaledIconWrapperSize / 2 +
            y
          ).toFixed()}px)`,
        }}>
        {iconTypes.map(({ icon_type, color }, idx) => {
          const SvgIcon = ICON_BY_TYPE[`${icon_type}`] || ICON_BY_TYPE.DEFAULT;
          let fill = colors.BLUE;
          if (color) {
            const { r, g, b, a } = color; // Use color to control the background color of the icon.
            fill = `rgba(${r * 255},${g * 255},${b * 255},${a})`;
          }
          return <SvgIcon key={`${icon_type}${idx}`} width={scaledIconSize} height={scaledIconSize} fill={fill} />;
        })}
        {text && <SText>{text}</SText>}
      </SIconWrapper>
    );
  });
};

export default IconOverlay;
