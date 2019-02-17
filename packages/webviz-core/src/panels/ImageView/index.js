// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CameraMeteringMatrixIcon from "@mdi/svg/svg/camera-metering-matrix.svg";
import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import { sortBy } from "lodash";
import React, { Component } from "react";
import { createSelector } from "reselect";

import ImageCanvas from "./ImageCanvas";
import helpContent from "./index.help.md";
import style from "./index.module.scss";
import { getCameraInfoTopic, getMarkerTopics, getMarkerOptions, groupTopics, RECTIFIED_TOPIC_REGEX } from "./util";
import Dropdown from "webviz-core/src/components/Dropdown";
import Flex from "webviz-core/src/components/Flex";
import { Item, SubMenu } from "webviz-core/src/components/Menu";
import MessageHistory, { type MessageHistoryData } from "webviz-core/src/components/MessageHistory";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import Tooltip from "webviz-core/src/components/Tooltip";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { Topic } from "webviz-core/src/types/dataSources";
import naturalSort from "webviz-core/src/util/naturalSort";
import toggle from "webviz-core/src/util/toggle";

export type Config = {
  cameraTopic: string,
  enabledMarkerNames: string[],
  scale: number,
};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
  topics: Topic[],
};

// Group image topics by the first component of their name
const imageTopicsByNamespaceSelector = createSelector(
  (topics?: Topic[]) => topics || [],
  (topics: Topic[]): Map<string, Topic[]> => {
    const imageTopics = topics.filter(
      (topic) => topic.datatype === "sensor_msgs/Image" || topic.datatype === "sensor_msgs/CompressedImage"
    );
    return groupTopics(imageTopics);
  }
);

const markerTopicSelector = createSelector(
  (topics?: Topic[]) => topics || [],
  (topics: Topic[]): Topic[] => {
    const imageViewHooks = getGlobalHooks().perPanelHooks().ImageView;
    const markerTopics = topics.filter((topic) =>
      imageViewHooks.imageMarkerDatatypes.concat(imageViewHooks.imageMarkerArrayDatatypes).includes(topic.datatype)
    );
    return sortBy(markerTopics, (topic) => topic.name);
  }
);

class ImageView extends Component<Props> {
  static panelType = "ImageViewPanel";
  static defaultConfig = getGlobalHooks().perPanelHooks().ImageView.defaultConfig;

  onToggleMarkerName = (markerName: string) => {
    this.props.saveConfig({ enabledMarkerNames: toggle(this.props.config.enabledMarkerNames, markerName) });
  };

  onChangeTopic = (cameraTopic: string) => {
    this.props.saveConfig({ cameraTopic });
  };

  onChangeScale = (scale: number) => {
    this.props.saveConfig({ scale });
  };

  renderImageTopicDropdown() {
    const { cameraTopic } = this.props.config;
    const imageTopicsByNamespace = imageTopicsByNamespaceSelector(this.props.topics);

    if (!imageTopicsByNamespace || imageTopicsByNamespace.size === 0) {
      return <Dropdown disabled text={cameraTopic || "no image topics yet"} />;
    }

    const items = [...imageTopicsByNamespace.keys()].sort().map((group) => {
      const topics = imageTopicsByNamespace.get(group);
      if (!topics) {
        return null;
      } // satisfy flow
      topics.sort(naturalSort("name"));

      const rectifiedTopics = topics
        .filter((topic) => RECTIFIED_TOPIC_REGEX.test(topic.name))
        .map((topic) => topic.name);
      const hasRectifiedTopic = rectifiedTopics.length > 0;
      const isSelected = topics.some((topic) => topic.name === cameraTopic);

      // place rectified topic above other topics
      return (
        <SubMenu direction="right" key={group} text={group} checked={isSelected}>
          {rectifiedTopics.map((rectifiedTopic) => {
            return (
              <Item
                key={rectifiedTopic}
                value={rectifiedTopic}
                icon={<CameraMeteringMatrixIcon />}
                onClick={() => this.onChangeTopic(rectifiedTopic)}>
                <Tooltip contents={hasRectifiedTopic ? null : `rectified image is not available in the current bag`}>
                  <span>{rectifiedTopic}</span>
                </Tooltip>
              </Item>
            );
          })}
          {topics.map((topic) => {
            if (RECTIFIED_TOPIC_REGEX.test(topic.name)) {
              return null;
            }
            return (
              <Item
                key={topic.name}
                value={topic.name}
                checked={topic.name === cameraTopic}
                onClick={() => this.onChangeTopic(topic.name)}>
                {topic.name}
              </Item>
            );
          })}
        </SubMenu>
      );
    });
    return <Dropdown text={cameraTopic}>{items}</Dropdown>;
  }

  renderMarkerDropdown() {
    const { cameraTopic, enabledMarkerNames } = this.props.config;
    const imageTopicsByNamespace = imageTopicsByNamespaceSelector(this.props.topics);
    const markerTopics = markerTopicSelector(this.props.topics);

    const allCameraNamespaces = imageTopicsByNamespace ? [...imageTopicsByNamespace.keys()] : [];
    const markerOptions = getMarkerOptions(cameraTopic, (markerTopics || []).map((t) => t.name), allCameraNamespaces);
    return (
      <Dropdown
        closeOnChange={false}
        onChange={this.onToggleMarkerName}
        value={enabledMarkerNames}
        text={markerOptions.length > 0 ? "markers" : "no markers"}
        tooltip={markerOptions.length === 0 ? "camera_info must be available to render markers" : undefined}
        disabled={markerOptions.length === 0}>
        {markerOptions.map((option) => (
          <Item
            icon={enabledMarkerNames.includes(option.name) ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
            key={option.name}
            value={option.name}>
            {option.name}
          </Item>
        ))}
      </Dropdown>
    );
  }

  renderDropdown() {
    const { scale } = this.props.config;
    return (
      <PanelToolbar floating helpContent={helpContent}>
        <div className={style.controls}>
          {this.renderImageTopicDropdown()}
          {this.renderMarkerDropdown()}
          <Dropdown
            tooltip="Resolution"
            onChange={this.onChangeScale}
            text={`${(scale * 100).toFixed()}%`}
            value={scale}>
            <span value={0.2}>20%</span>
            <span value={0.5}>50%</span>
            <span value={1}>100%</span>
          </Dropdown>
        </div>
      </PanelToolbar>
    );
  }

  render() {
    const { cameraTopic, enabledMarkerNames, scale } = this.props.config;
    const cameraInfoTopic = getCameraInfoTopic(cameraTopic);
    const markerTopics = getMarkerTopics(cameraTopic, enabledMarkerNames);

    return (
      <Flex col>
        {this.renderDropdown()}
        <MessageHistory paths={[cameraTopic]} imageScale={scale} historySize={1}>
          {({ itemsByPath: { [cameraTopic]: cameraMessages } }: MessageHistoryData) => (
            <MessageHistory paths={markerTopics.concat(cameraInfoTopic ? [cameraInfoTopic] : [])} historySize={1}>
              {({ itemsByPath }: MessageHistoryData) => (
                <ImageCanvas
                  topic={cameraTopic}
                  image={cameraMessages[0] && cameraMessages[0].message}
                  cameraInfo={
                    cameraInfoTopic && itemsByPath[cameraInfoTopic][0]
                      ? itemsByPath[cameraInfoTopic][0].message.message
                      : undefined
                  }
                  markers={markerTopics
                    .map((topic) => itemsByPath[topic][0] && itemsByPath[topic][0].message)
                    .filter(Boolean)}
                />
              )}
            </MessageHistory>
          )}
        </MessageHistory>
      </Flex>
    );
  }
}

export default Panel(ImageView);
