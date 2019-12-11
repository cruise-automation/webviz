// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback } from "react";
import styled from "styled-components";

import { CommonPointSettings, CommonDecaySettings, type TopicSettingsEditorProps } from ".";
import { SLabel, SInput } from "./common";
import ColorPicker from "webviz-core/src/components/ColorPicker";
import Flex from "webviz-core/src/components/Flex";
import GradientPicker from "webviz-core/src/components/GradientPicker";
import Radio from "webviz-core/src/components/Radio";
import SegmentedControl from "webviz-core/src/components/SegmentedControl";
import { Select, Option } from "webviz-core/src/components/Select";
import type { PointCloud2 } from "webviz-core/src/types/Messages";

export type ColorMode =
  | {| mode: "rgb" |}
  | {| mode: "flat", flatColor: string |}
  | {|
      mode: "gradient",
      colorField: string,
      minColor: string,
      maxColor: string,
      minValue?: number,
      maxValue?: number,
    |}
  | {|
      mode: "rainbow",
      colorField: string,
      minValue?: number,
      maxValue?: number,
    |};

export const DEFAULT_FLAT_COLOR = "#ffffff";

export type PointCloudSettings = {|
  pointSize?: ?number,
  pointShape?: ?string,
  decayTime?: ?number,

  colorMode: ?ColorMode,
|};

const SValueRangeInput = styled(SInput).attrs({ type: "number", placeholder: "auto" })`
  width: 0px;
  margin-left: 8px;
  flex: 1 1 auto;
`;

const RainbowText = React.memo(function RainbowText({ children: text }: { children: string }) {
  const result = [];
  for (let i = 0; i < text.length; i++) {
    result.push(
      // Rainbow gradient goes from magenta (300) to red (0)
      <span key={i} style={{ color: `hsl(${300 - 300 * (i / (text.length - 1))}, 100%, 60%)` }}>
        {text[i]}
      </span>
    );
  }
  return result;
});

export default function PointCloudSettingsEditor(props: TopicSettingsEditorProps<PointCloud2, PointCloudSettings>) {
  const { message, settings = {}, onFieldChange, onSettingsChange } = props;

  const onColorModeChange = useCallback(
    (newValue: ?ColorMode | ((?ColorMode) => ?ColorMode)) => {
      onSettingsChange((settings) => ({
        ...settings,
        colorMode: typeof newValue === "function" ? newValue(settings.colorMode) : newValue,
      }));
    },
    [onSettingsChange]
  );

  const hasRGB = message && message.fields && message.fields.some(({ name }) => name === "rgb");
  const defaultColorField = message && message.fields && message.fields.find(({ name }) => name !== "rgb")?.name;
  const colorMode: ColorMode = settings.colorMode
    ? settings.colorMode
    : hasRGB
    ? { mode: "rgb" }
    : { mode: "flat", flatColor: DEFAULT_FLAT_COLOR };

  return (
    <Flex col>
      <CommonPointSettings settings={settings} defaultPointSize={2} onFieldChange={onFieldChange} />
      <CommonDecaySettings settings={settings} onFieldChange={onFieldChange} />

      <SLabel>Color by</SLabel>
      <Flex row style={{ justifyContent: "space-between", marginBottom: "8px" }}>
        <SegmentedControl
          selectedId={colorMode.mode === "flat" ? "flat" : "data"}
          onChange={(id) =>
            onColorModeChange((colorMode) =>
              id === "flat"
                ? {
                    mode: "flat",
                    flatColor: colorMode && colorMode.mode === "gradient" ? colorMode.minColor : DEFAULT_FLAT_COLOR,
                  }
                : hasRGB
                ? { mode: "rgb" }
                : defaultColorField
                ? { mode: "rainbow", colorField: defaultColorField }
                : null
            )
          }
          options={[{ id: "flat", label: "Flat" }, { id: "data", label: "Point data" }]}
        />

        <Flex row style={{ margin: "2px 0 2px 12px", alignItems: "center" }}>
          {colorMode.mode === "flat" ? (
            // For flat mode, pick a single color
            <ColorPicker
              color={colorMode.flatColor}
              onChange={(flatColor) => onColorModeChange({ mode: "flat", flatColor })}
            />
          ) : (
            // Otherwise, choose a field from the point cloud to color by
            <Select
              text={colorMode.mode === "rgb" ? "rgb" : colorMode.colorField}
              value={colorMode.mode === "rgb" ? "rgb" : colorMode.colorField}
              onChange={(value) =>
                onColorModeChange(
                  (colorMode): ColorMode => {
                    if (value === "rgb") {
                      return { mode: "rgb" };
                    }
                    if (colorMode && colorMode.mode === "gradient") {
                      return { ...colorMode, colorField: value };
                    }
                    if (colorMode && colorMode.mode === "rainbow") {
                      return { ...colorMode, colorField: value };
                    }
                    return { mode: "rainbow", colorField: value };
                  }
                )
              }>
              {!message
                ? []
                : message.fields.map(({ name }) => (
                    <Option key={name} value={name}>
                      {name}
                    </Option>
                  ))}
            </Select>
          )}
        </Flex>
      </Flex>

      {(colorMode.mode === "gradient" || colorMode.mode === "rainbow") && (
        <Flex col style={{ marginBottom: "8px" }}>
          <SLabel>Value range</SLabel>
          <Flex row style={{ marginLeft: "8px" }}>
            <Flex row style={{ flex: "1 1 100%", alignItems: "baseline", marginRight: "20px" }}>
              Min
              <SValueRangeInput
                value={colorMode.minValue ?? ""}
                onChange={({ target: { value } }) =>
                  onColorModeChange((colorMode: any) => ({
                    ...colorMode,
                    minValue: value === "" ? null : value,
                  }))
                }
              />
            </Flex>
            <Flex row style={{ flex: "1 1 100%", alignItems: "baseline" }}>
              Max
              <SValueRangeInput
                value={colorMode.maxValue ?? ""}
                onChange={({ target: { value } }) =>
                  onColorModeChange((colorMode: any) => ({
                    ...colorMode,
                    maxValue: value === "" ? null : +value,
                  }))
                }
              />
            </Flex>
          </Flex>
          <Radio
            selectedId={colorMode.mode}
            onChange={(id) =>
              onColorModeChange(({ colorField, minValue, maxValue }: any) =>
                id === "rainbow"
                  ? { mode: "rainbow", colorField, minValue, maxValue }
                  : { mode: "gradient", colorField, minValue, maxValue, minColor: "#0000ff", maxColor: "#ff0000" }
              )
            }
            options={[
              {
                id: "rainbow",
                label: colorMode.mode === "rainbow" ? <RainbowText>Rainbow</RainbowText> : "Rainbow",
              },
              { id: "gradient", label: "Custom gradient" },
            ]}
          />
        </Flex>
      )}
      {colorMode.mode === "gradient" && (
        <div style={{ margin: "8px" }}>
          <GradientPicker
            minColor={colorMode.minColor}
            maxColor={colorMode.maxColor}
            onChange={({ minColor, maxColor }) =>
              onColorModeChange((colorMode) => ({ mode: "gradient", ...colorMode, minColor, maxColor }))
            }
          />
        </div>
      )}
    </Flex>
  );
}
