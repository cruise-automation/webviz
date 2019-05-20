// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { range } from "lodash";
import React, { PureComponent } from "react";
import styled from "styled-components";

import type { TopicSettings } from "./SceneBuilder";
import styles from "./TopicSettingsEditor.module.scss";
import Flex from "webviz-core/src/components/Flex";
import { Select, Option } from "webviz-core/src/components/Select";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { Topic } from "webviz-core/src/types/players";
import { POINT_CLOUD_DATATYPE } from "webviz-core/src/util/globalConstants";

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

export const RenderResetButton = ({ onSettingsChange }: { onSettingsChange: (TopicSettings) => void }) => {
  return <button onClick={() => onSettingsChange({})}>Reset Settings</button>;
};

export default class TopicSettingsEditor extends PureComponent<Props> {
  static defaultProps = {
    settings: {},
  };

  onFieldChange = (fieldName: string) => {
    return (value: string) => {
      const { onSettingsChange, settings } = this.props;
      const newSettings = {
        ...settings,
        [fieldName]: value,
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
        {RenderPointSettings({ defaultPointSize: 2, settings, onFieldChange: this.onFieldChange })}
        <SLabel>Color by</SLabel>
        <Select text={colorFieldValue} value={colorFieldValue} onChange={this.onFieldChange("colorField")}>
          {colorFieldOptions}
        </Select>
        <SLabel>Point Color in r,g,b (overrides Color Field)</SLabel>
        <SInput
          type="text"
          value={colorValue}
          placeholder="255, 0, 100"
          onChange={(e) => {
            this.onFieldChange("color")(e.target.value);
          }}
        />
        {renderDecaySettings(this.props, this.onFieldChange)}
        {RenderResetButton({ onSettingsChange })}
      </Flex>
    );
  }

  _renderSettings(datatype: string) {
    if (datatype === POINT_CLOUD_DATATYPE) {
      return this._renderPointCloudSettings();
    }

    return getGlobalHooks()
      .perPanelHooks()
      .ThreeDimensionalViz.renderTopicSettings(datatype, this.props, this.onFieldChange);
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
