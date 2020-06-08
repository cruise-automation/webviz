// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Tabs } from "antd";
import { isEmpty, omit } from "lodash";
import React, { useCallback } from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import Button from "webviz-core/src/components/Button";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import Modal from "webviz-core/src/components/Modal";
import { RenderToBodyComponent } from "webviz-core/src/components/renderToBody";
import { getSettingsByColumnWithDefaults } from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/topicGroupsMigrations";
import { topicSettingsEditorForDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import type { Topic } from "webviz-core/src/players/types";
import { SECOND_SOURCE_PREFIX } from "webviz-core/src/util/globalConstants";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const STopicSettingsEditor = styled.div`
  background: ${colors.TOOLBAR};
  color: ${colors.TEXT};
  padding: 16px;
`;
const STitle = styled.h3`
  font-size: 20px;
  font-size: 20px;
  margin-right: 36px;
  word-break: break-all;
  line-height: 1.3;
`;

const SDatatype = styled.p`
  padding-bottom: 12px;
`;

const SEditorWrapper = styled.div`
  color: ${colors.TEXT};
  width: 400px;
`;

function MainEditor({
  datatype,
  collectorMessage,
  columnIndex,
  onFieldChange,
  onSettingsChange,
  settings,
  topicName,
}: {|
  datatype: string,
  collectorMessage: any,
  columnIndex: number,
  onFieldChange: (fieldName: string, value: any) => void,
  onSettingsChange: (settings: any | ((prevSettings: {}) => {})) => void,
  settings: any,
  topicName: string,
|}) {
  const Editor = topicSettingsEditorForDatatype(datatype);
  if (!Editor) {
    throw new Error(`No topic settings editor available for ${datatype}`);
  }

  return (
    <ErrorBoundary>
      <SEditorWrapper>
        <Editor
          message={collectorMessage}
          onFieldChange={onFieldChange}
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
        <Button
          className="test-reset-settings-btn"
          style={{ marginTop: 8 }}
          onClick={() => {
            const defaultSettingsByColumn = getSettingsByColumnWithDefaults(topicName)?.settingsByColumn || [];
            onSettingsChange(defaultSettingsByColumn[columnIndex]);
          }}>
          Reset to defaults
        </Button>
      </SEditorWrapper>
    </ErrorBoundary>
  );
}

type Props = {|
  currentEditingTopic: Topic,
  hasFeatureColumn: boolean,
  saveConfig: Save3DConfig,
  sceneBuilderMessage: any,
  setCurrentEditingTopic: (?Topic) => void,
  settingsByKey: { [topic: string]: any },
|};

function TopicSettingsModal({
  currentEditingTopic,
  currentEditingTopic: { datatype, name: topicName },
  hasFeatureColumn,
  saveConfig,
  sceneBuilderMessage,
  setCurrentEditingTopic,
  settingsByKey,
}: Props) {
  const topicSettingsKey = `t:${topicName}`;
  const onSettingsChange = useCallback(
    (settings: any | ((prevSettings: {}) => {})) => {
      if (typeof settings !== "function" && isEmpty(settings)) {
        // Remove the field if the topic settings are empty to prevent the panelConfig from every growing.
        saveConfig({ settingsByKey: omit(settingsByKey, [topicSettingsKey]) });
        return;
      }
      saveConfig({
        settingsByKey: {
          ...settingsByKey,
          [topicSettingsKey]:
            typeof settings === "function" ? settings(settingsByKey[topicSettingsKey] || {}) : settings,
        },
      });
    },
    [saveConfig, settingsByKey, topicSettingsKey]
  );

  const onFieldChange = useCallback(
    (fieldName: string, value: any) => {
      onSettingsChange((newSettings) => ({ ...newSettings, [fieldName]: value }));
    },
    [onSettingsChange]
  );

  const columnIndex = topicName.startsWith(SECOND_SOURCE_PREFIX) ? 1 : 0;
  const nonPrefixedTopic = columnIndex === 1 ? topicName.substr(SECOND_SOURCE_PREFIX.length) : topicName;

  const editorElem = (
    <MainEditor
      collectorMessage={sceneBuilderMessage}
      columnIndex={columnIndex}
      datatype={datatype}
      onFieldChange={onFieldChange}
      onSettingsChange={onSettingsChange}
      settings={settingsByKey[topicSettingsKey] || {}}
      topicName={nonPrefixedTopic}
    />
  );
  return (
    <RenderToBodyComponent>
      <Modal
        onRequestClose={() => setCurrentEditingTopic(undefined)}
        contentStyle={{
          maxHeight: "calc(100vh - 200px)",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
        }}>
        <STopicSettingsEditor>
          <STitle>{currentEditingTopic.name}</STitle>
          <SDatatype>{currentEditingTopic.datatype}</SDatatype>
          {hasFeatureColumn ? (
            <div className="ant-component">
              <Tabs
                activeKey={`${columnIndex}`}
                onChange={(newKey) => {
                  const newEditingTopicName =
                    newKey === "0" ? nonPrefixedTopic : `${SECOND_SOURCE_PREFIX}${nonPrefixedTopic}`;
                  setCurrentEditingTopic({ datatype, name: newEditingTopicName });
                }}>
                <Tabs.TabPane tab={"base"} key={"0"}>
                  {editorElem}
                </Tabs.TabPane>
                <Tabs.TabPane tab={SECOND_SOURCE_PREFIX} key={"1"}>
                  {editorElem}
                </Tabs.TabPane>
              </Tabs>
            </div>
          ) : (
            editorElem
          )}
        </STopicSettingsEditor>
      </Modal>
    </RenderToBodyComponent>
  );
}

export default React.memo<Props>(TopicSettingsModal);
