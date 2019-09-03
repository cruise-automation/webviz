// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { upperFirst } from "lodash";
import React, { useCallback, type ComponentType } from "react";
import styled from "styled-components";

import LaserScanSettingsEditor from "./LaserScanSettingsEditor";
import MarkerSettingsEditor from "./MarkerSettingsEditor";
import PointCloudSettingsEditor from "./PointCloudSettingsEditor";
import PoseSettingsEditor from "./PoseSettingsEditor";
import styles from "./TopicSettingsEditor.module.scss";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import Flex from "webviz-core/src/components/Flex";
import { Select, Option } from "webviz-core/src/components/Select";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { Topic } from "webviz-core/src/players/types";
import { POINT_CLOUD_DATATYPE, POSE_STAMPED_DATATYPE, LASER_SCAN_DATATYPE } from "webviz-core/src/util/globalConstants";

export const LINED_CONVEX_HULL_RENDERING_SETTING = "LinedConvexHull";

export const SLabel = styled.label`
  display: block;
  font-size: 14px;
  margin: 6px 2px;
  text-decoration: ${(props) => (props.strikethrough ? "line-through" : null)};
`;
export const SDescription = styled.label`
  display: block;
  margin: 6px 2px;
  opacity: 0.8;
`;

export const SInput = styled.input`
  flex: 1 1 auto;
  margin-bottom: 8px;
`;

// Parse color saved into topic settings into {r, g, b, a} form.
export function parseColorSetting(rgba: ?string) {
  const [r = 255, g = 255, b = 255, a = 1] = (rgba || "")
    .split(",")
    .map(parseFloat)
    .map((x) => (isNaN(x) ? undefined : x));
  return { r: r / 255, g: g / 255, b: b / 255, a };
}

export function CommonPointSettings({
  defaultPointSize,
  defaultPointShape = "circle",
  settings,
  onFieldChange,
}: {
  defaultPointSize: number,
  defaultPointShape?: string,
  settings: {
    pointSize?: ?number,
    pointShape?: ?string,
  },
  onFieldChange: (name: string, value: any) => void,
}) {
  const pointSizeVal = settings.pointSize === undefined ? "" : settings.pointSize;

  const pointShape = settings.pointShape;
  const pointShapeVal = pointShape ? pointShape : defaultPointShape;
  const pointShapeOpts = ["circle", "square"].map((field) => (
    <Option key={field} value={field}>
      {upperFirst(field)}
    </Option>
  ));

  return (
    <Flex col>
      <SLabel>Point size</SLabel>
      <SInput
        type="number"
        placeholder={defaultPointSize.toString()}
        value={pointSizeVal}
        min={1}
        max={50}
        step={1}
        onChange={(e) => {
          const isInputValid = !isNaN(parseFloat(e.target.value));
          onFieldChange("pointSize", isInputValid ? parseFloat(e.target.value) : undefined);
        }}
      />

      <SLabel>Point shape</SLabel>
      <Select
        text={upperFirst(pointShapeVal)}
        value={pointShapeVal}
        onChange={(value) => onFieldChange("pointShape", value)}>
        {pointShapeOpts}
      </Select>
    </Flex>
  );
}

export function CommonDecaySettings({
  settings,
  onFieldChange,
}: {
  settings: { decayTime?: ?number },
  onFieldChange: (name: string, value: any) => any,
}) {
  const decayTime = settings.decayTime;
  const decayTimeValue = decayTime === undefined ? "" : decayTime;

  return (
    <Flex col>
      <SLabel>Decay time (seconds)</SLabel>
      <SDescription>When set to 0, only the latest received data will be displayed.</SDescription>
      <SInput
        type="number"
        placeholder="0"
        value={decayTimeValue}
        min={0}
        step={0.1}
        onChange={(e) => {
          const isInputValid = !isNaN(parseFloat(e.target.value));
          onFieldChange("decayTime", isInputValid ? parseFloat(e.target.value) : undefined);
        }}
      />
    </Flex>
  );
}

export type TopicSettingsEditorProps<Msg, Settings: {}> = {|
  message: ?Msg,
  settings: Settings,
  onFieldChange: (name: string, value: any) => void,
  onSettingsChange: ({}) => void,
|};

function topicSettingsEditorForDatatype(datatype: string): ?ComponentType<TopicSettingsEditorProps<any, any>> {
  const editors = {
    [POINT_CLOUD_DATATYPE]: PointCloudSettingsEditor,
    [POSE_STAMPED_DATATYPE]: PoseSettingsEditor,
    [LASER_SCAN_DATATYPE]: LaserScanSettingsEditor,
    "visualization_msgs/Marker": MarkerSettingsEditor,
    "visualization_msgs/MarkerArray": MarkerSettingsEditor,
    ...getGlobalHooks().perPanelHooks().ThreeDimensionalViz.topicSettingsEditors,
  };
  return editors[datatype];
}

export function canEditDatatype(datatype: string) {
  return topicSettingsEditorForDatatype(datatype) != null;
}

// Get topic settings with configurable defaults applied
export function getTopicSettings(topic: Topic, settings: ?{}) {
  const { getDefaultTopicSettings } = getGlobalHooks().perPanelHooks().ThreeDimensionalViz;
  const defaultSettings = getDefaultTopicSettings && getDefaultTopicSettings(topic);
  return { ...defaultSettings, ...settings };
}

type Props = {|
  topic: Topic,
  message: any,
  settings: ?{},
  onSettingsChange: ({}) => void,
|};

export default React.memo<Props>(function TopicSettingsEditor({ topic, message, settings, onSettingsChange }: Props) {
  const onFieldChange = useCallback(
    (fieldName: string, value: any) => {
      onSettingsChange({ ...settings, [fieldName]: value });
    },
    [settings, onSettingsChange]
  );

  const Editor = topicSettingsEditorForDatatype(topic.datatype);
  if (!Editor) {
    throw new Error(`No topic settings editor available for ${topic.datatype}`);
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.topicName}>{topic.name}</h3>
      <h4 className={styles.datatype}>
        <tt>{topic.datatype}</tt>
      </h4>
      <ErrorBoundary>
        <Editor
          message={message}
          settings={getTopicSettings(topic, settings)}
          onFieldChange={onFieldChange}
          onSettingsChange={onSettingsChange}
        />
      </ErrorBoundary>
      <button onClick={() => onSettingsChange({})}>Reset to defaults</button>
    </div>
  );
});
