// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Tabs } from "antd";
// eslint-disable-next-line no-restricted-imports
import { get } from "lodash";
import React from "react";
import styled from "styled-components";

import { getSettingsByColumnWithDefaults } from "./topicGroupsMigrations";
import type { TopicItem, TopicGroupType, OnTopicGroupsChange } from "./types";
import Button from "webviz-core/src/components/Button";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import { topicSettingsEditorForDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const STopicSettingsEditor = styled.div`
  background: ${colors.TOOLBAR};
  color: ${colors.TEXT};
  padding: 16px;
`;
const STitle = styled.h3`
  font-size: 20px;
  word-wrap: break-word;
`;

const SDatatype = styled.p`
  padding-bottom: 12px;
`;

const STabWrapper = styled.div`
  color: ${colors.TEXT};
`;

type Props = {|
  objectPath: string,
  onTopicGroupsChange: OnTopicGroupsChange,
  sceneCollectorMsgForTopicSetting: any,
|};

function MainEditor({
  columnIndex,
  objectPath,
  onTopicGroupsChange,
  sceneCollectorMsgForTopicSetting,
  topicItem: {
    topicName,
    settingsByColumn,
    derivedFields: { datatype },
  },
}: {|
  ...Props,
  columnIndex: number,
  topicItem: TopicItem,
|}) {
  if (!datatype) {
    return null;
  }
  const settings = (settingsByColumn && settingsByColumn[columnIndex]) || {};
  const Editor = topicSettingsEditorForDatatype(datatype);
  if (!Editor) {
    throw new Error(`No topic settings editor available for ${datatype}`);
  }

  return (
    <ErrorBoundary>
      <>
        <Editor
          message={sceneCollectorMsgForTopicSetting}
          onFieldChange={(fieldName, value) => {
            const newSettings = {
              ...settings,
              [fieldName]: value,
            };
            onTopicGroupsChange(`${objectPath}.settingsByColumn[${columnIndex}]`, newSettings);
          }}
          settings={settings}
          onSettingsChange={(newSettings) => {
            const newSettingsToSave = typeof newSettings === "function" ? newSettings(settings) : newSettings;
            onTopicGroupsChange(`${objectPath}.settingsByColumn[${columnIndex}]`, newSettingsToSave);
          }}
        />
        <Button
          className="test-reset-settings-btn"
          style={{ marginTop: 8 }}
          onClick={() => {
            const defaultSettings = getSettingsByColumnWithDefaults(topicName)?.settingsByColumn || [];
            onTopicGroupsChange(`${objectPath}.settingsByColumn[${columnIndex}]`, defaultSettings[columnIndex]);
          }}>
          Reset to defaults
        </Button>
      </>
    </ErrorBoundary>
  );
}
export default function TopicSettingsEditor({
  objectPath,
  onTopicGroupsChange,
  sceneCollectorMsgForTopicSetting,
  topicGroups,
  dataTestDefaultTabKey,
}: {|
  ...Props,
  topicGroups: TopicGroupType[],
  dataTestDefaultTabKey?: string,
|}) {
  const topicItem: TopicItem = get(topicGroups, objectPath);
  const {
    topicName,
    derivedFields: { prefixByColumn, datatype },
  } = topicItem;

  if (!datatype) {
    return null;
  }

  return (
    <STopicSettingsEditor>
      <STitle> {topicName}</STitle>
      <SDatatype>{datatype}</SDatatype>
      <div className="ant-component">
        <Tabs defaultActiveKey={dataTestDefaultTabKey || "0"}>
          {prefixByColumn.map((prefix, columnIndex) => (
            <Tabs.TabPane tab={prefix || "base"} key={columnIndex}>
              <STabWrapper>
                <MainEditor
                  columnIndex={columnIndex}
                  objectPath={objectPath}
                  onTopicGroupsChange={onTopicGroupsChange}
                  sceneCollectorMsgForTopicSetting={sceneCollectorMsgForTopicSetting}
                  topicItem={topicItem}
                />
              </STabWrapper>
            </Tabs.TabPane>
          ))}
        </Tabs>
      </div>
    </STopicSettingsEditor>
  );
}
