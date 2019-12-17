// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CloseIcon from "@mdi/svg/svg/close.svg";
import * as React from "react";
import Draggable from "react-draggable";

import Icon from "webviz-core/src/components/Icon";
import {
  type LayoutTopicSettingsSharedProps,
  type EditTopicState,
} from "webviz-core/src/panels/ThreeDimensionalViz/Layout";
import styles from "webviz-core/src/panels/ThreeDimensionalViz/Layout.module.scss";
import SceneBuilder from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import type { TopicSettingsCollection } from "webviz-core/src/panels/ThreeDimensionalViz/SceneBuilder";
import TopicSettingsEditor from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";

const { useMemo } = React;

type Props = {|
  ...LayoutTopicSettingsSharedProps,
  topicSettings: TopicSettingsCollection,

  sceneBuilder: SceneBuilder,
  editTopicState: ?EditTopicState,
  setEditTopicState: (?EditTopicState) => void,
|};

function LayoutTopicSettings({
  saveConfig,
  sceneBuilder,
  topics,
  topicSettings,
  transforms,
  editTopicState,
  setEditTopicState,
}: Props) {
  const { cancelClick, onCloseTopicSettings, onSettingsChange } = useMemo(
    () => {
      return {
        // stop the event from bubbling up to onControlsOverlayClick but don't preventDefault because checkboxes, buttons, etc. should continue to work
        cancelClick: (e: SyntheticMouseEvent<HTMLDivElement>) => e.stopPropagation(),
        onCloseTopicSettings: () => setEditTopicState(null),
        onSettingsChange: (settings: {} | ((prevSettings: {}) => {})) => {
          if (!editTopicState) {
            return;
          }
          saveConfig({
            topicSettings: {
              ...topicSettings,
              [editTopicState.topic.name]:
                typeof settings === "function" ? settings(topicSettings[editTopicState.topic.name] || {}) : settings,
            },
          });
        },
      };
    },
    [editTopicState, saveConfig, setEditTopicState, topicSettings]
  );

  return (
    <>
      {editTopicState && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            zIndex: 103,
          }}>
          <Draggable
            bounds={{ left: 0, top: 0 }}
            defaultPosition={{ x: editTopicState.tooltipPosX + 30, y: 40 }}
            cancel="input">
            <div className={styles.topicSettingsEditor} onClick={cancelClick}>
              <Icon className={styles.closeIcon} onClick={onCloseTopicSettings}>
                <CloseIcon />
              </Icon>
              <TopicSettingsEditor
                topic={editTopicState.topic}
                message={
                  sceneBuilder.collectors[editTopicState.topic.name]
                    ? sceneBuilder.collectors[editTopicState.topic.name].getMessages()[0]
                    : undefined
                }
                settings={topicSettings[editTopicState.topic.name]}
                onSettingsChange={onSettingsChange}
              />
            </div>
          </Draggable>
        </div>
      )}
    </>
  );
}

export default React.memo<Props>(LayoutTopicSettings);
