// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback, useMemo } from "react";
import styled from "styled-components";

import { CommonPointSettings, CommonDecaySettings, type TopicSettingsEditorProps } from ".";
import ColorPickerForTopicSettings from "./ColorPickerForTopicSettings";
import { SLabel, SInput } from "./common";
import Flex from "webviz-core/src/components/Flex";
import GradientPicker from "webviz-core/src/components/GradientPicker";
import Radio from "webviz-core/src/components/Radio";
import SegmentedControl from "webviz-core/src/components/SegmentedControl";
import { Select, Option } from "webviz-core/src/components/Select";
import {
  type ColorMode,
  DEFAULT_FLAT_COLOR,
  DEFAULT_MIN_COLOR,
  DEFAULT_MAX_COLOR,
  type PointCloudSettings,
} from "webviz-core/src/panels/ThreeDimensionalViz/commands/PointClouds/types";
import type { PointCloud2 } from "webviz-core/src/types/Messages";
import { deepParse, getField, isBobject } from "webviz-core/src/util/binaryObjects";

const SValueRangeInput = styled(SInput).attrs({ type: "number", placeholder: "auto" })`
  width: 0px;
  margin-left: 8px;
  flex: 1 1 auto;
`;

const SegmentedControlWrapper = styled.div`
  min-width: 152px;
  display: flex;
  align-items: center;
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

  const onColorModeChange = useCallback((newValue: ?ColorMode | ((?ColorMode) => ?ColorMode)) => {
    onSettingsChange((newSettings) => ({
      ...newSettings,
      colorMode: typeof newValue === "function" ? newValue(newSettings.colorMode) : newValue,
    }));
  }, [onSettingsChange]);

  const fields =
    useMemo(() => {
      if (!message) {
        return;
      }
      const maybeBobjectFields = getField(message, "fields");
      return isBobject(maybeBobjectFields) ? deepParse(maybeBobjectFields) : maybeBobjectFields;
    }, [message]) ?? [];
  const hasRGB = fields.some(({ name }) => name === "rgb");
  const defaultColorField = fields.find(({ name }) => name !== "rgb")?.name;
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
        <SegmentedControlWrapper>
          <SegmentedControl
            selectedId={colorMode.mode === "flat" ? "flat" : "data"}
            onChange={(id) =>
              onColorModeChange((newColorMode) => {
                if (id === "flat") {
                  return {
                    mode: "flat",
                    flatColor:
                      newColorMode && newColorMode.mode === "gradient" ? newColorMode.minColor : DEFAULT_FLAT_COLOR,
                  };
                }
                if (hasRGB) {
                  return { mode: "rgb" };
                }
                return defaultColorField ? { mode: "rainbow", colorField: defaultColorField } : null;
              })
            }
            options={[{ id: "flat", label: "Flat" }, { id: "data", label: "Point data" }]}
          />
        </SegmentedControlWrapper>
        <Flex row style={{ margin: "2px 0 2px 12px", alignItems: "center" }}>
          {colorMode.mode === "flat" ? (
            // For flat mode, pick a single color
            <ColorPickerForTopicSettings
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
                  (newColorMode): ColorMode => {
                    if (value === "rgb") {
                      return { mode: "rgb" };
                    }
                    if (newColorMode && newColorMode.mode === "gradient") {
                      return { ...newColorMode, colorField: value };
                    }
                    if (newColorMode && newColorMode.mode === "rainbow") {
                      return { ...newColorMode, colorField: value };
                    }
                    return { mode: "rainbow", colorField: value };
                  }
                )
              }>
              {fields.map(({ name }) => (
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
                  onColorModeChange((newColorMode: any) => ({
                    ...newColorMode,
                    minValue: value === "" ? null : +value,
                  }))
                }
              />
            </Flex>
            <Flex row style={{ flex: "1 1 100%", alignItems: "baseline" }}>
              Max
              <SValueRangeInput
                value={colorMode.maxValue ?? ""}
                onChange={({ target: { value } }) =>
                  onColorModeChange((newColorMode: any) => ({
                    ...newColorMode,
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
                  : {
                      mode: "gradient",
                      colorField,
                      minValue,
                      maxValue,
                      minColor: DEFAULT_MIN_COLOR,
                      maxColor: DEFAULT_MAX_COLOR,
                    }
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
            minColor={colorMode.minColor || DEFAULT_MIN_COLOR}
            maxColor={colorMode.maxColor || DEFAULT_MAX_COLOR}
            onChange={({ minColor, maxColor }) =>
              onColorModeChange((newColorMode) => ({
                mode: "gradient",
                ...newColorMode,
                minColor,
                maxColor,
              }))
            }
          />
        </div>
      )}
    </Flex>
  );
}

PointCloudSettingsEditor.canEditNamespaceOverrideColor = true;
