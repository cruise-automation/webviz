// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEmpty, omit } from "lodash";
import Tabs, { TabPane } from "rc-tabs";
import React, { useCallback } from "react";
import styled from "styled-components";

import { type Save3DConfig } from "../index";
import Button from "webviz-core/src/components/Button";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import Modal from "webviz-core/src/components/Modal";
import { RenderToBodyPortal } from "webviz-core/src/components/renderToBody";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { useArbitraryTopicMessage } from "webviz-core/src/PanelAPI";
import { topicSettingsEditorForDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import type { SetCurrentEditingTopic } from "webviz-core/src/panels/ThreeDimensionalViz/TopicTree/types";
import type { StructuralDatatypes } from "webviz-core/src/panels/ThreeDimensionalViz/utils/datatypes";
import { $WEBVIZ_SOURCE_2 } from "webviz-core/src/util/globalConstants";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const STopicSettingsEditor = styled.div`
  background: ${colors.DARK2};
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

const STabWrapper = styled.div`
  .rc-tabs-nav-list {
    display: flex;
  }
  .rc-tabs-tab {
    margin-right: 16px;
    padding-bottom: 6px;
    margin-bottom: 8px;
    color: ${colors.TEXT};
    font-size: 14px;
    cursor: pointer;
  }
  .rc-tabs-tab-active {
    border-bottom: 2px solid ${colors.BLUEL1};
  }
  .rc-tabs-nav-operations {
    display: none;
  }
`;

function getSettingsByColumnWithDefaults(topicName: string, settingsByColumn: ?(any[])): ?{ settingsByColumn: any[] } {
  const defaultTopicSettingsByColumn = getGlobalHooks()
    .startupPerPanelHooks()
    .ThreeDimensionalViz.getDefaultTopicSettingsByColumn(topicName);

  if (defaultTopicSettingsByColumn) {
    const newSettingsByColumn = settingsByColumn || [undefined, undefined];
    newSettingsByColumn.forEach((settings, columnIndex) => {
      if (settings === undefined) {
        // Only apply default settings if there are no settings present.
        newSettingsByColumn[columnIndex] = defaultTopicSettingsByColumn[columnIndex];
      }
    });
    return { settingsByColumn: newSettingsByColumn };
  }
  return settingsByColumn ? { settingsByColumn } : undefined;
}

function MainEditor({
  datatype,
  message,
  columnIndex,
  onFieldChange,
  onSettingsChange,
  settings,
  structuralDatatypes,
  topicName,
}: {|
  datatype: string,
  message: any,
  columnIndex: number,
  onFieldChange: (fieldName: string, value: any) => void,
  onSettingsChange: (settings: any | ((prevSettings: {}) => {})) => void,
  settings: any,
  structuralDatatypes: StructuralDatatypes,
  topicName: string,
|}) {
  const Editor = topicSettingsEditorForDatatype(datatype, structuralDatatypes);
  if (!Editor) {
    throw new Error(`No topic settings editor available for ${datatype}`);
  }

  return (
    <ErrorBoundary>
      <SEditorWrapper>
        <Editor
          message={message}
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
  currentEditingTopic: { datatypeName: string, name: string },
  hasFeatureColumn: boolean,
  saveConfig: Save3DConfig,
  setCurrentEditingTopic: SetCurrentEditingTopic,
  settingsByKey: { [topic: string]: any },
  structuralDatatypes: StructuralDatatypes,
|};

function TopicSettingsModal({
  currentEditingTopic: { datatypeName, name: topicName },
  hasFeatureColumn,
  saveConfig,
  setCurrentEditingTopic,
  settingsByKey,
  structuralDatatypes,
}: Props) {
  const topicSettingsKey = `t:${topicName}`;
  const onSettingsChange = useCallback((settings: any | ((prevSettings: {}) => {})) => {
    if (typeof settings !== "function" && isEmpty(settings)) {
      // Remove the field if the topic settings are empty to prevent the panelConfig from every growing.
      saveConfig({ settingsByKey: omit(settingsByKey, [topicSettingsKey]) });
      return;
    }
    saveConfig({
      settingsByKey: {
        ...settingsByKey,
        [topicSettingsKey]: typeof settings === "function" ? settings(settingsByKey[topicSettingsKey] || {}) : settings,
      },
    });
  }, [saveConfig, settingsByKey, topicSettingsKey]);

  const onFieldChange = useCallback((fieldName: string, value: any) => {
    onSettingsChange((newSettings) => ({ ...newSettings, [fieldName]: value }));
  }, [onSettingsChange]);

  const columnIndex = topicName.startsWith($WEBVIZ_SOURCE_2) ? 1 : 0;
  const nonPrefixedTopic = columnIndex === 1 ? topicName.substr($WEBVIZ_SOURCE_2.length) : topicName;
  const message = useArbitraryTopicMessage(topicName);

  const editorElem = (
    <MainEditor
      columnIndex={columnIndex}
      datatype={datatypeName}
      message={message}
      onFieldChange={onFieldChange}
      onSettingsChange={onSettingsChange}
      settings={settingsByKey[topicSettingsKey] || {}}
      structuralDatatypes={structuralDatatypes}
      topicName={nonPrefixedTopic}
    />
  );
  return (
    <RenderToBodyPortal>
      <Modal
        onRequestClose={() => setCurrentEditingTopic(undefined)}
        contentStyle={{
          maxHeight: "calc(100vh - 200px)",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}>
        <STopicSettingsEditor>
          <STitle>{topicName}</STitle>
          <SDatatype>{datatypeName}</SDatatype>
          {hasFeatureColumn ? (
            <STabWrapper>
              <Tabs
                activeKey={`${columnIndex}`}
                onChange={(newKey) => {
                  const newEditingTopicName =
                    newKey === "0" ? nonPrefixedTopic : `${$WEBVIZ_SOURCE_2}${nonPrefixedTopic}`;
                  setCurrentEditingTopic({ datatypeName, name: newEditingTopicName });
                }}>
                <TabPane tab={"base"} key={"0"}>
                  {editorElem}
                </TabPane>
                <TabPane tab={$WEBVIZ_SOURCE_2} key={"1"}>
                  {editorElem}
                </TabPane>
              </Tabs>
            </STabWrapper>
          ) : (
            editorElem
          )}
        </STopicSettingsEditor>
      </Modal>
    </RenderToBodyPortal>
  );
}

export default React.memo<Props>(TopicSettingsModal);
