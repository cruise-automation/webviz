// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import WavesIcon from "@mdi/svg/svg/waves.svg";
import cx from "classnames";
import { sortBy, pick, get } from "lodash";
import * as React from "react";
import { createSelector } from "reselect";
import styled from "styled-components";

import ImageCanvas from "./ImageCanvas";
import imageCanvasStyles from "./ImageCanvas.module.scss";
import helpContent from "./index.help.md";
import style from "./index.module.scss";
import { getCameraInfoTopic, getCameraNamespace, getMarkerTopics, getMarkerOptions, groupTopics } from "./util";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Dropdown from "webviz-core/src/components/Dropdown";
import dropDownStyles from "webviz-core/src/components/Dropdown/index.module.scss";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import { Item, SubMenu } from "webviz-core/src/components/Menu";
import MessageHistory, {
  type MessageHistoryData,
  type MessageHistoryItemsByPath,
} from "webviz-core/src/components/MessageHistory";
import synchronizeMessages from "webviz-core/src/components/MessageHistory/synchronizeMessages";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { Topic } from "webviz-core/src/types/players";
import naturalSort from "webviz-core/src/util/naturalSort";
import { formatTimeRaw } from "webviz-core/src/util/time";
import toggle from "webviz-core/src/util/toggle";

const IMAGE_QUEUE_SIZE = 3;
const MARKER_QUEUE_SIZE = 12;

export type ImageViewPanelHooks = {
  defaultConfig: {
    cameraTopic: string,
    enabledMarkerNames: string[],
    scale: number,
    synchronize: boolean,
  },
  imageMarkerArrayDatatypes: string[],
  imageMarkerDatatypes: string[],
};

export type Config = {
  cameraTopic: string,
  enabledMarkerNames: string[],
  scale: number,
  panelHooks?: ImageViewPanelHooks,
  transformMarkers: boolean,
  synchronize: boolean,
};

export type SaveConfig = ($Shape<Config>) => void;

type Props = {
  config: Config,
  saveConfig: SaveConfig,
  topics: Topic[],
};

const formatTimeForPath = (items: MessageHistoryItemsByPath, path: string): string => {
  const stamp = get(items, [path, "0", "message", "message", "header", "stamp"]);

  if (stamp === undefined) {
    return "";
  }

  return formatTimeRaw(stamp);
};

const TopicTimestampSpan = styled.span`
  padding: 0px 0px 0px 15px;
  font-size: 10px;
  font-style: italic;
`;

const TopicTimestamp = ({ text, style }: { text: string, style?: { [string]: string } }) =>
  text === "" ? null : <TopicTimestampSpan style={style}>{text}</TopicTimestampSpan>;

const BottomBar = ({ children, containsOpen }: { children?: React.Node, containsOpen: boolean }) => (
  <div
    className={cx(imageCanvasStyles["bottom-bar"], {
      [imageCanvasStyles.containsOpen]: inScreenshotTests ? true : containsOpen,
    })}>
    {children}
  </div>
);

const ToggleComponent = ({ text, disabled = false }: { text: string, disabled?: boolean }) => {
  return (
    <button style={{ maxWidth: "100%", padding: "4px 8px" }} className={cx({ disabled })}>
      <span className={dropDownStyles.title}>{text}</span>
      <Icon style={{ marginLeft: 4 }}>
        <MenuDownIcon style={{ width: 14, height: 14, opacity: 0.5 }} />
      </Icon>
    </button>
  );
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
  (topics: Topic[], imageViewHooksProp: ?ImageViewPanelHooks): Topic[] => {
    const imageViewHooks = imageViewHooksProp || getGlobalHooks().perPanelHooks().ImageView;
    const markerTopics = topics.filter((topic) =>
      imageViewHooks.imageMarkerDatatypes.concat(imageViewHooks.imageMarkerArrayDatatypes).includes(topic.datatype)
    );
    return sortBy(markerTopics, (topic) => topic.name);
  }
);

function renderEmptyState(cameraTopic: string, markerTopics: string[], shouldSynchronize: boolean) {
  return (
    <EmptyState>
      Waiting for images {markerTopics.length > 0 && "and markers"} on:
      <ul>
        <li>
          <code>{cameraTopic}</code>
        </li>
        {markerTopics.sort().map((m) => (
          <li key={m}>
            <code>{m}</code>
          </li>
        ))}
      </ul>
      {shouldSynchronize && (
        <p>
          Synchronization is enabled, so all <code>header.stamp</code>s must match exactly.
        </p>
      )}
    </EmptyState>
  );
}

class ImageView extends React.Component<Props> {
  static panelType = "ImageViewPanel";
  static defaultConfig = getGlobalHooks().perPanelHooks().ImageView.defaultConfig;

  onToggleMarkerName = (markerName: string) => {
    this.props.saveConfig({ enabledMarkerNames: toggle(this.props.config.enabledMarkerNames, markerName) });
  };

  onChangeTopic = (cameraTopic: string) => {
    this.props.saveConfig({
      cameraTopic,
      transformMarkers: getGlobalHooks()
        .perPanelHooks()
        .ImageView.canTransformMarkersByTopic(cameraTopic),
    });
  };

  onChangeScale = (scale: number) => {
    this.props.saveConfig({ scale });
  };

  renderImageTopicDropdown(allItemsByPath: MessageHistoryItemsByPath) {
    const { cameraTopic } = this.props.config;
    const cameraNamespace = getCameraNamespace(cameraTopic);
    const imageTopicsByNamespace = imageTopicsByNamespaceSelector(this.props.topics);

    if (!imageTopicsByNamespace || imageTopicsByNamespace.size === 0) {
      return <Dropdown toggleComponent={<ToggleComponent text={cameraTopic || "no image topics yet"} disabled />} />;
    }

    const items = [...imageTopicsByNamespace.keys()].sort().map((group) => {
      const topics = imageTopicsByNamespace.get(group);
      if (!topics) {
        return null;
      } // satisfy flow
      topics.sort(naturalSort("name"));

      // place rectified topic above other topics
      return (
        <SubMenu direction="right" key={group} text={group} checked={group === cameraNamespace}>
          {topics.map((topic) => {
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
    return <Dropdown toggleComponent={<ToggleComponent text={cameraTopic} />}>{items}</Dropdown>;
  }

  renderMarkerDropdown(allItemsByPath: MessageHistoryItemsByPath) {
    const { cameraTopic, enabledMarkerNames } = this.props.config;
    const imageTopicsByNamespace = imageTopicsByNamespaceSelector(this.props.topics);
    const markerTopics = markerTopicSelector(this.props.topics, this.props.config.panelHooks);

    const allCameraNamespaces = imageTopicsByNamespace ? [...imageTopicsByNamespace.keys()] : [];
    const markerOptions = getMarkerOptions(cameraTopic, (markerTopics || []).map((t) => t.name), allCameraNamespaces);
    return (
      <Dropdown
        dataTest={"markers-dropdown"}
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
            <span>{option.name}</span>
            <TopicTimestamp text={formatTimeForPath(allItemsByPath, option.topic)} />
          </Item>
        ))}
      </Dropdown>
    );
  }

  _renderToolbar(allItemsByPath: MessageHistoryItemsByPath) {
    return (
      <PanelToolbar floating helpContent={helpContent} menuContent={this._renderMenuContent()}>
        <div className={style.controls}>
          {this.renderImageTopicDropdown(allItemsByPath)}
          {this.renderMarkerDropdown(allItemsByPath)}
        </div>
      </PanelToolbar>
    );
  }

  _toggleSynchronize = () => {
    this.props.saveConfig({ synchronize: !this.props.config.synchronize });
  };

  _renderMenuContent() {
    const { scale, synchronize } = this.props.config;
    return (
      <>
        <Item
          icon={synchronize ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
          onClick={this._toggleSynchronize}
          tooltip={`Image queue size: ${IMAGE_QUEUE_SIZE}\nMarker queue size: ${MARKER_QUEUE_SIZE}`}>
          <span>Synchronize images and markers</span>
        </Item>
        <hr />
        <SubMenu direction="right" text={`Image resolution: ${(scale * 100).toFixed()}%`}>
          {[0.2, 0.5, 1].map((value) => {
            return (
              <Item key={value} value={value} checked={scale === value} onClick={() => this.onChangeScale(value)}>
                {(value * 100).toFixed()}%
              </Item>
            );
          })}
        </SubMenu>
      </>
    );
  }

  render() {
    const {
      saveConfig,
      config,
      config: { cameraTopic, enabledMarkerNames, scale, panelHooks, transformMarkers },
    } = this.props;

    const cameraInfoTopic = getCameraInfoTopic(cameraTopic);
    const allMarkerTopics = markerTopicSelector(this.props.topics, this.props.config.panelHooks);
    const markerTopics = getMarkerTopics(cameraTopic, enabledMarkerNames).filter((markerTopic) =>
      allMarkerTopics.some(({ name }) => markerTopic === name)
    );

    const shouldSynchronize = config.synchronize && markerTopics.length > 0;

    // When synchronizing, keep some extra historical messages so we can synchronize over
    // significant time delays.
    const imageHistorySize = shouldSynchronize ? IMAGE_QUEUE_SIZE : 1;
    const markerHistorySize = shouldSynchronize ? MARKER_QUEUE_SIZE : 1;

    return (
      <Flex col>
        <MessageHistory paths={[cameraTopic]} imageScale={scale} historySize={imageHistorySize}>
          {({ itemsByPath: imageItemsByPath }: MessageHistoryData) => (
            <MessageHistory
              paths={markerTopics.concat(cameraInfoTopic ? [cameraInfoTopic] : [])}
              historySize={markerHistorySize}>
              {({ itemsByPath: markerItemsByPath }: MessageHistoryData) => {
                const allItemsByPath: ?MessageHistoryItemsByPath = (() => {
                  const items = {
                    ...imageItemsByPath,
                    ...pick(markerItemsByPath, markerTopics),
                  };
                  return shouldSynchronize ? synchronizeMessages(items) : items;
                })();

                if (!allItemsByPath || allItemsByPath[cameraTopic].length === 0) {
                  return (
                    <>
                      {this._renderToolbar({})}
                      {renderEmptyState(cameraTopic, markerTopics, shouldSynchronize)}
                    </>
                  );
                }

                return (
                  <>
                    {this._renderToolbar(allItemsByPath)}
                    <ImageCanvas
                      transformMarkers={!!transformMarkers}
                      saveConfig={saveConfig}
                      panelHooks={panelHooks}
                      topic={cameraTopic}
                      image={allItemsByPath[cameraTopic][0] && allItemsByPath[cameraTopic][0].message}
                      cameraInfo={
                        cameraInfoTopic ? get(markerItemsByPath, [cameraInfoTopic, 0, "message", "message"]) : undefined
                      }
                      markers={markerTopics.map((topic) => get(allItemsByPath[topic], [0, "message"])).filter(Boolean)}
                    />
                    <ChildToggle.ContainsOpen>
                      {(containsOpen) => {
                        const canTransformMarkers = getGlobalHooks()
                          .perPanelHooks()
                          .ImageView.canTransformMarkersByTopic(cameraTopic);

                        const topicTimestamp = (
                          <TopicTimestamp
                            style={{ padding: "8px 8px 0px 0px" }}
                            text={formatTimeForPath(allItemsByPath, cameraTopic)}
                          />
                        );

                        if (!canTransformMarkers) {
                          return <BottomBar containsOpen={containsOpen}>{topicTimestamp}</BottomBar>;
                        }

                        return (
                          <BottomBar containsOpen={containsOpen}>
                            {topicTimestamp}
                            <Icon
                              onClick={() => saveConfig({ transformMarkers: !transformMarkers })}
                              tooltip={
                                transformMarkers
                                  ? "Markers are being transformed by webviz based on the camera model. Click to turn it off."
                                  : `Markers can be transformed by webviz based on the camera model. Click to turn it on.`
                              }
                              fade
                              medium>
                              <WavesIcon style={{ color: transformMarkers ? colors.orange : colors.textBright }} />
                            </Icon>
                          </BottomBar>
                        );
                      }}
                    </ChildToggle.ContainsOpen>
                  </>
                );
              }}
            </MessageHistory>
          )}
        </MessageHistory>
      </Flex>
    );
  }
}

export default Panel<Config>(ImageView);
