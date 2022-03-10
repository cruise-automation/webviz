// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useMemo } from "react";
import { GLText } from "regl-worldview";
import tinyColor from "tinycolor2";

import { ICON_CHAR_BY_TYPE, LAYER_INDEX_TEXT } from "webviz-core/src/panels/ThreeDimensionalViz/constants";
import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import { type TextAtlas } from "webviz-core/src/panels/ThreeDimensionalViz/utils/glTextAtlasLoader";
import type { OverlayIconMarker } from "webviz-core/src/types/Messages";
import { cssColorStrToColorObj } from "webviz-core/src/util/colorUtils";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

type Props = {|
  children: Interactive<OverlayIconMarker>[],
  textAtlas: ?TextAtlas,
  layerIndex: number,
  alphabet: string[],
|};

const { r, g, b, a } = tinyColor(colors.DARK2).toRgb();
const BG_COLOR = { r: r / 255, g: g / 255, b: b / 255, a };

const GLIcon = ({ textAtlas, children, layerIndex, alphabet }: Props) => {
  const overlayIconAsText = useMemo(
    () =>
      children.map((icon) => {
        const { metadata, icon_type, color } = icon;
        const iconTypes = (icon_type && [icon_type]) ||
          (metadata?.icon_types && metadata.icon_types.map((_icon) => _icon.icon_type)) ||
          (metadata?.icon_type && [metadata.icon_type]) || ["DEFAULT"];
        const backgroundColor =
          (metadata?.markerStyle?.backgroundColor && cssColorStrToColorObj(metadata.markerStyle.backgroundColor)) ||
          BG_COLOR;
        const textColor = metadata?.icon_types?.[0].color || color;
        const iconStr = iconTypes.map((type) => ICON_CHAR_BY_TYPE[type] || ICON_CHAR_BY_TYPE.DEFAULT).join("");
        const text = [iconStr, icon.text].filter(Boolean).join(" ");
        return { ...icon, text, colors: [textColor, backgroundColor] };
      }),
    [children]
  );

  return (
    <GLText
      alphabet={alphabet}
      borderRadius={1}
      paddingScale={[1.5, 1.5]}
      layerIndex={layerIndex + LAYER_INDEX_TEXT}
      scaleInvariantFontSize={14}
      textAtlas={textAtlas}>
      {overlayIconAsText}
    </GLText>
  );
};

export default GLIcon;
