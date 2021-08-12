// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import type { Vec3, Dimensions, RGBA, Color } from "regl-worldview";
import { Overlay } from "regl-worldview";

import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import type { OverlayIconMarker } from "webviz-core/src/types/Messages";
import { emptyPose } from "webviz-core/src/util/Pose";
import sendNotification from "webviz-core/src/util/sendNotification";

export const DEFAULT_TEXT_COLOR = { r: 1, g: 1, b: 1, a: 1 };

type IconTypeItem = {| icon_type: number | string, color?: RGBA |};
export type RenderItemOutput = {|
  text: string,
  textColor: Color,
  coordinates: Vec3,
  name: string,
  dimension: Dimensions,
  markerStyle: any,
  iconOffset: any,
  iconTypes: IconTypeItem[],
|};

type Props = {
  children: any[],
  setOverlayIcons: ({
    renderItems: RenderItemOutput[],
    sceneBuilderDrawables: Interactive<OverlayIconMarker>[],
  }) => void,
};

let sentNotification = false;
export function sendIconTypeDeprecatedNotification() {
  if (!sentNotification) {
    sendNotification(
      `Deprecated icon_type usage`,
      `icon_type has been deprecated. Use 'icon_types' instead. Example format: 'iconTypes: [{icon_type: 'arrow-left', color: {r: 1, g: 1, b: 1, a: 1}}]'`,
      "user",
      "warn"
    );
    sentNotification = true;
  }
}

export const getIconName = (icon: Interactive<OverlayIconMarker>): string =>
  JSON.stringify([icon.interactionData?.topic, icon.ns, icon.id]);

const projectItem = ({
  item,
  item: { metadata = {}, icon_type },
  coordinates,
  dimension: { width, height },
}: {|
  item: Interactive<OverlayIconMarker>,
  coordinates: ?Vec3,
  dimension: Dimensions,
|}): ?RenderItemOutput => {
  if (!coordinates) {
    return null;
  }
  const [left, top] = coordinates;
  if (left < -10 || top < -10 || left > width + 10 || top > height + 10) {
    return null; // Don't render anything that's too far outside of the canvas
  }
  const name = getIconName(item);
  const markerStyle = metadata.markerStyle || {};
  let iconTypes: ?(IconTypeItem[]) = metadata.icon_types;
  // TODO[Audrey]: deprecate the support for icon_type in late 2021.
  const iconType = icon_type || metadata.icon_type;
  if (!iconTypes && iconType) {
    sendIconTypeDeprecatedNotification();
    iconTypes = [{ icon_type: iconType, color: item.color }];
  }

  return iconTypes && iconTypes.length > 0
    ? {
        textColor: item.color || DEFAULT_TEXT_COLOR,
        name,
        coordinates,
        dimension: { width, height },
        text: item.text,
        markerStyle,
        ...(metadata.iconOffset ? { iconOffset: metadata.iconOffset } : undefined),
        iconTypes,
      }
    : undefined;
};

const OverlayProjector = (props: Props) => {
  const { children, setOverlayIcons } = props;
  const renderItems = [];
  // We call setOverlayIcons after the last child has been processed. If there are no children, we
  // still want to delay calling setOverlayIcons until regl renders, so add a dummy child.
  const nonEmptyChildren = children.length === 0 ? [{ pose: emptyPose(), dummy: true }] : children;
  return (
    <Overlay
      renderItem={({ item, index, coordinates, dimension }) => {
        if (index === 0) {
          renderItems.length = 0;
        }
        if (!("dummy" in item)) {
          renderItems.push(projectItem({ item, coordinates, dimension }));
        }
        if (index === nonEmptyChildren.length - 1) {
          // Set icons even if there aren't any, so the main thread knows when the last ones have
          // disappeared.
          setOverlayIcons({ renderItems: renderItems.filter(Boolean), sceneBuilderDrawables: children });
        }
        return null;
      }}>
      {nonEmptyChildren}
    </Overlay>
  );
};

export default OverlayProjector;
