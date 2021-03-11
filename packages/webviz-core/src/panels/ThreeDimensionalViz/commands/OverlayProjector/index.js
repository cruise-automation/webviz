// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useContext, useMemo } from "react";
import type { Vec3, Dimensions, Point, WorldviewContextType } from "regl-worldview";
import { WorldviewReactContext } from "regl-worldview";

import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import type { OverlayIconMarker } from "webviz-core/src/types/Messages";

export type RenderItemOutput = {
  iconType: number,
  text: string,
  coordinates: Vec3,
  name: string,
  dimension: Dimensions,
  markerStyle: any,
  iconOffset: any,
};

type Props = {
  children: any[],
  setOverlayIcons: ({
    renderItems: RenderItemOutput[],
    sceneBuilderDrawables: Interactive<OverlayIconMarker>[],
  }) => void,
};

const projectCoordinate = (point: Point, context: ?WorldviewContextType): ?Vec3 => {
  if (!context || !context.initializedData) {
    return;
  }
  const { dimension } = context;
  const { camera } = context.initializedData;

  const vec = [point.x, point.y, point.z];
  const { left, top, width, height } = dimension;
  const viewport = [left, top, width, height];
  return camera.toScreenCoord(viewport, vec);
};

export const getIconName = (icon: Interactive<OverlayIconMarker>): string =>
  JSON.stringify([icon.interactionData?.topic, icon.ns, icon.id]);

export const projectItem = ({
  item,
  item: { metadata = {}, icon_type },
  coordinates,
  dimension: { width, height },
}: {|
  item: any,
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
  const iconType = icon_type || metadata.icon_type;
  const markerStyle = metadata.markerStyle || {};
  const { r, g, b, a } = item.color; // Use color to control the background color of the icon.
  markerStyle.backgroundColor = `rgba(${r * 255},${g * 255},${b * 255},${a})`;

  return iconType
    ? {
        name,
        iconType,
        coordinates,
        dimension: { width, height },
        text: item.text,
        markerStyle,
        ...(metadata.iconOffset ? { iconOffset: metadata.iconOffset } : undefined),
      }
    : undefined;
};

const OverlayProjector = (props: Props) => {
  const { children, setOverlayIcons } = props;
  const context = useContext(WorldviewReactContext);

  const renderItems = useMemo(() => {
    const dimension = context && context.dimension;
    if (!context || !dimension) {
      return [];
    }
    return children
      .map((item) => {
        const coordinates = projectCoordinate(item.pose.position, context);
        return projectItem({ item, coordinates, dimension });
      })
      .filter(Boolean);
  }, [context, children]);
  setOverlayIcons({ renderItems, sceneBuilderDrawables: children });
  return null;
};

export default OverlayProjector;
