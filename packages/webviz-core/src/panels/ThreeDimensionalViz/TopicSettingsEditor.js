// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import { range } from "lodash";
import React, { PureComponent } from "react";
import styled from "styled-components";

import type { TopicSettings } from "./SceneBuilder";
import styles from "./TopicSettingsEditor.module.scss";
import Flex from "webviz-core/src/components/Flex";
import { Select, Option } from "webviz-core/src/components/Select";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { Topic } from "webviz-core/src/types/players";
import { POINT_CLOUD_DATATYPE, POSE_STAMPED_DATATYPE } from "webviz-core/src/util/globalConstants";

export type Props = {
  topic: Topic,
  message: any,
  settings: TopicSettings,
  onSettingsChange: (TopicSettings) => void,
};

export const SLabel = styled.label`
  display: block;
  margin: 5px 2px;
`;

export const SInput = styled.input`
  flex: 1 1 auto;
  margin-bottom: 8px;
`;

export const RenderResetButton = ({ onSettingsChange }: { onSettingsChange: (TopicSettings) => void }) => {
  return <button onClick={() => onSettingsChange({})}>Reset Settings</button>;
};

export const renderPoseMarkerSettings = (
  props: Props,
  onFieldChange: (fieldName: string) => (value: string) => void,
  onSizeChange: (fieldName: string) => (value: number) => void
) => {
  const { message, settings, onSettingsChange } = props;

  if (!message) {
    return null;
  }

  const alpha = settings.alpha != null ? settings.alpha : 1;
  const alphaField = (
    <Flex col>
      <SLabel>Alpha</SLabel>
      <SInput
        type="number"
        value={alpha.toString()}
        min={0}
        max={1}
        step={0.1}
        onChange={(e) => onSettingsChange({ ...settings, alpha: parseFloat(e.target.value) })}
      />
    </Flex>
  );
  const defaultColor = getGlobalHooks()
    .perPanelHooks()
    .ThreeDimensionalViz.getSyntheticArrowMarkerColor(props.topic.name);
  const currentPoseColor =
    settings.color || `${defaultColor.r * 255},${defaultColor.g * 255},${defaultColor.b * 255},${defaultColor.a}`;
  const currentShaftWidth = settings.size && settings.size.shaftWidth != null ? settings.size.shaftWidth : 2;
  const currentHeadWidth = settings.size && settings.size.headWidth != null ? settings.size.headWidth : 2;
  const currentHeadLength = settings.size && settings.size.headLength != null ? settings.size.headLength : 0.1;
  const colorInputFields = (
    <Flex col>
      <SLabel>Color (r,g,b,a)</SLabel>
      <SInput
        type="text"
        value={currentPoseColor}
        placeholder="e.g. 255, 0, 100, 0.5"
        onChange={(e) => {
          onFieldChange("color")(e.target.value);
        }}
      />
      <SLabel>Shaft width</SLabel>
      <SInput
        type="number"
        value={currentShaftWidth}
        placeholder="e.g. 2"
        onChange={(e) => {
          onSizeChange("shaftWidth")(parseFloat(e.target.value));
        }}
      />
      <SLabel>Head width</SLabel>
      <SInput
        type="number"
        value={currentHeadWidth}
        placeholder="e.g. 2"
        onChange={(e) => {
          onSizeChange("headWidth")(parseFloat(e.target.value));
        }}
      />
      <SLabel>Head length</SLabel>
      <SInput
        type="number"
        value={currentHeadLength}
        placeholder="e.g. 1"
        onChange={(e) => {
          onSizeChange("headLength")(parseFloat(e.target.value));
        }}
      />
    </Flex>
  );

  const CheckboxComponent = settings.useCarModel ? CheckboxMarkedIcon : CheckboxBlankOutlineIcon;
  const iconProps = {
    width: 16,
    height: 16,
    style: {
      fill: "currentColor",
      position: "relative",
      top: "3px",
    },
  };

  return (
    <Flex col>
      <Flex style={{ marginBottom: "5px", cursor: "pointer" }}>
        <CheckboxComponent
          {...iconProps}
          onClick={() => onSettingsChange({ ...settings, useCarModel: !settings.useCarModel, alpha: undefined })}
        />
        <SLabel>Use 3D model</SLabel>
      </Flex>
      {settings.useCarModel ? alphaField : colorInputFields}
      {RenderResetButton(props)}
    </Flex>
  );
};

export const RenderPointSettings = ({
  defaultPointSize,
  settings,
  onFieldChange,
}: {
  defaultPointSize: number,
  settings: TopicSettings,
  onFieldChange: (string) => Function,
}) => {
  const pointSize = settings.pointSize;

  const pointSizeVal = pointSize || defaultPointSize;
  const pointSizeOptions = range(1, 10).map((field) => (
    <Option key={field} value={field}>
      {field}
    </Option>
  ));

  const pointShape = settings.pointShape;
  const pointShapeVal = pointShape ? pointShape : "circle";
  const pointShapeOpts = ["circle", "square"].map((field) => (
    <Option key={field} value={field}>
      {field}
    </Option>
  ));

  return (
    <Flex col>
      <SLabel>Point Size</SLabel>
      <Select text={pointSizeVal.toString()} value={pointSizeVal} onChange={onFieldChange("pointSize")}>
        {pointSizeOptions}
      </Select>

      <SLabel>Point Shape</SLabel>
      <Select text={pointShapeVal} value={pointShapeVal} onChange={onFieldChange("pointShape")}>
        {pointShapeOpts}
      </Select>
    </Flex>
  );
};

export const renderDecaySettings = (props: Props, onFieldChange: (string) => Function) => {
  const { settings } = props;
  const decayTime = settings.decayTime;
  const decayTimeValue = decayTime === undefined ? "" : decayTime;

  return (
    <Flex col>
      <SLabel>Decay Time (# sec to display)</SLabel>
      <SLabel>e.g. 0s (default) - remove when new message with same topic received</SLabel>
      <SInput
        type="number"
        placeholder="e.g.: 1.5"
        value={decayTimeValue}
        min={0}
        step={0.1}
        onChange={(e) => {
          const isInputValid = !isNaN(parseFloat(e.target.value));
          onFieldChange("decayTime")(isInputValid ? parseFloat(e.target.value) : undefined);
        }}
      />
    </Flex>
  );
};

export default class TopicSettingsEditor extends PureComponent<Props> {
  static defaultProps = {
    settings: {},
  };

  _onFieldChange = (fieldName: string) => {
    return (value: string) => {
      const { onSettingsChange, settings } = this.props;
      const newSettings = {
        ...settings,
        [fieldName]: value,
      };
      onSettingsChange(newSettings);
    };
  };

  _onSizeChange = (sizeFieldName: string) => {
    return (value: number) => {
      const { onSettingsChange, settings } = this.props;
      const newSettings = {
        ...settings,
        size: {
          ...settings.size,
          [sizeFieldName]: value,
        },
      };
      onSettingsChange(newSettings);
    };
  };

  _renderPointCloudSettings() {
    const { message, settings, onSettingsChange } = this.props;
    if (!message || !message.fields) {
      return null;
    }
    const colorField = settings.colorField;
    const colorFieldValue = colorField ? colorField : "rgb";

    const color = settings.color;
    const colorValue = color || "";

    const colorFieldOptions = message.fields.map((field) => (
      <Option key={field.name} value={field.name}>
        {field.name}
      </Option>
    ));

    return (
      <Flex col>
        {RenderPointSettings({ defaultPointSize: 2, settings, onFieldChange: this._onFieldChange })}
        <SLabel>Color by</SLabel>
        <Select text={colorFieldValue} value={colorFieldValue} onChange={this._onFieldChange("colorField")}>
          {colorFieldOptions}
        </Select>
        <SLabel>Point Color in r,g,b (overrides Color Field)</SLabel>
        <SInput
          type="text"
          value={colorValue}
          placeholder="255, 0, 100"
          onChange={(e) => {
            this._onFieldChange("color")(e.target.value);
          }}
        />
        {renderDecaySettings(this.props, this._onFieldChange)}
        {RenderResetButton({ onSettingsChange })}
      </Flex>
    );
  }

  _renderSettings(datatype: string) {
    if (datatype === POINT_CLOUD_DATATYPE) {
      return this._renderPointCloudSettings();
    } else if (datatype === POSE_STAMPED_DATATYPE) {
      return renderPoseMarkerSettings(this.props, this._onFieldChange, this._onSizeChange);
    }

    return getGlobalHooks()
      .perPanelHooks()
      .ThreeDimensionalViz.renderTopicSettings(datatype, this.props, this._onFieldChange, this._onSizeChange);
  }

  render() {
    const { topic } = this.props;
    return (
      <div className={styles.container}>
        <h3 className={styles.topicName}>{topic.name}</h3>
        <h4 className={styles.datatype}>
          <tt>{topic.datatype}</tt>
        </h4>
        {this._renderSettings(topic.datatype)}
      </div>
    );
  }
}
