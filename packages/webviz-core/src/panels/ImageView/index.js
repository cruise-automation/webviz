// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import WavesIcon from "@mdi/svg/svg/waves.svg";
import cx from "classnames";
import { sortBy, last, get } from "lodash";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import { createSelector } from "reselect";
import type { Time } from "rosbag";
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
import { useShallowMemo, useDeepMemo } from "webviz-core/src/components/MessageHistory/hooks";
import { getSynchronizingReducers } from "webviz-core/src/components/MessageHistory/synchronizeMessages";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import filterMap from "webviz-core/src/filterMap";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { Topic, Message, TypedMessage } from "webviz-core/src/players/types";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { CameraInfo } from "webviz-core/src/types/Messages";
import type { SaveConfig } from "webviz-core/src/types/panels";
import naturalSort from "webviz-core/src/util/naturalSort";
import { formatTimeRaw } from "webviz-core/src/util/time";
import toggle from "webviz-core/src/util/toggle";

const { useMemo, useCallback } = React;

export type ImageViewPanelHooks = {
  defaultConfig: {
    cameraTopic: string,
    enabledMarkerNames: string[],
    scale: number,
    synchronize: boolean,
  },
  imageMarkerDatatypes: string[],
  imageMarkerArrayDatatypes: string[],
};

export type Config = {|
  cameraTopic: string,
  enabledMarkerNames: string[],
  scale: number,
  panelHooks?: ImageViewPanelHooks,
  transformMarkers: boolean,
  synchronize: boolean,
  mode: "fit" | "fill" | "other" | null,
  zoomPercentage: ?number,
  offset: ?(number[]),
  saveStoryConfig?: () => void,
|};

export type SaveImagePanelConfig = SaveConfig<Config>;

type Props = {
  config: Config,
  saveConfig: SaveImagePanelConfig,
  topics: Topic[],
};

const TopicTimestampSpan = styled.span`
  padding: 0px 0px 0px 15px;
  font-size: 10px;
  font-style: italic;
`;

const TopicTimestamp = ({ text, style: styleObj }: { text: string, style?: { [string]: string } }) =>
  text === "" ? null : <TopicTimestampSpan style={styleObj}>{text}</TopicTimestampSpan>;

const BottomBar = ({ children, containsOpen }: { children?: React.Node, containsOpen: boolean }) => (
  <div
    className={cx(imageCanvasStyles["bottom-bar"], {
      [imageCanvasStyles.containsOpen]: inScreenshotTests ? true : containsOpen,
    })}>
    {children}
  </div>
);

const ToggleComponent = ({
  text,
  disabled = false,
  dataTest,
}: {
  text: string,
  disabled?: boolean,
  dataTest?: string,
}) => {
  return (
    <button style={{ maxWidth: "100%", padding: "4px 8px" }} className={cx({ disabled })} data-test={dataTest}>
      <span className={dropDownStyles.title}>{text}</span>
      <Icon style={{ marginLeft: 4 }}>
        <MenuDownIcon style={{ width: 14, height: 14, opacity: 0.5 }} />
      </Icon>
    </button>
  );
};

// Group image topics by the first component of their name
const imageTopicsByNamespaceSelector = createSelector(
  (topics?: $ReadOnlyArray<Topic>) => topics || [],
  (topics: $ReadOnlyArray<Topic>): Map<string, Topic[]> => {
    const imageTopics = topics.filter(
      (topic) => topic.datatype === "sensor_msgs/Image" || topic.datatype === "sensor_msgs/CompressedImage"
    );
    return groupTopics(imageTopics);
  }
);

const markerTopicSelector = createSelector(
  (topics?: $ReadOnlyArray<Topic>) => topics || [],
  (topics: $ReadOnlyArray<Topic>, imageViewHooksProp: ?ImageViewPanelHooks): Topic[] => {
    const imageViewHooks = imageViewHooksProp || getGlobalHooks().perPanelHooks().ImageView;
    const markerTopics = topics.filter((topic) =>
      imageViewHooks.imageMarkerDatatypes.concat(imageViewHooks.imageMarkerArrayDatatypes).includes(topic.datatype)
    );
    return sortBy(markerTopics, (topic) => topic.name);
  }
);

function renderEmptyState(
  cameraTopic: string,
  markerTopics: string[],
  shouldSynchronize: boolean,
  messagesByTopic: { [topic: string]: Message[] }
) {
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
        <>
          <p>
            Synchronization is enabled, so all <code>header.stamp</code>s must match exactly.
          </p>
          <ul>
            {Object.keys(messagesByTopic).map((topic) => (
              <li key={topic}>
                <code>{topic}</code>:{" "}
                {messagesByTopic[topic] && messagesByTopic[topic].length
                  ? messagesByTopic[topic].map(({ message }) => formatTimeRaw(message.header.stamp)).join(", ")
                  : "no messages"}
              </li>
            ))}
          </ul>
        </>
      )}
    </EmptyState>
  );
}

function useOptionallySynchronizedMessages(
  shouldSynchronize: boolean,
  topics: $ReadOnlyArray<PanelAPI.RequestedTopic>
) {
  const memoizedTopics = useDeepMemo(topics);
  const reducers = useMemo(
    () =>
      shouldSynchronize
        ? getSynchronizingReducers(
            memoizedTopics.map((request) => (typeof request === "string" ? request : request.topic))
          )
        : {
            restore: (previousValue) => ({
              messagesByTopic: previousValue ? previousValue.messagesByTopic : {},
              synchronizedMessages: null,
            }),
            addMessage: ({ messagesByTopic, synchronizedMessages }, newMessage) => ({
              messagesByTopic: { ...messagesByTopic, [newMessage.topic]: [newMessage] },
              synchronizedMessages: null,
            }),
          },
    [shouldSynchronize, memoizedTopics]
  );
  return PanelAPI.useMessages({
    topics,
    ...reducers,
  }).reducedValue;
}

function ImageView(props: Props) {
  const { config, saveConfig } = props;
  const { scale, synchronize, cameraTopic, enabledMarkerNames, panelHooks, transformMarkers } = config;
  const { topics } = PanelAPI.useDataSourceInfo();

  const onToggleMarkerName = useCallback(
    (markerName: string) => {
      saveConfig({ enabledMarkerNames: toggle(enabledMarkerNames, markerName) });
    },
    [saveConfig, enabledMarkerNames]
  );

  const onChangeTopic = useCallback(
    (newCameraTopic: string) => {
      saveConfig({
        cameraTopic: newCameraTopic,
        transformMarkers: getGlobalHooks()
          .perPanelHooks()
          .ImageView.canTransformMarkersByTopic(newCameraTopic),
      });
    },
    [saveConfig]
  );

  const onChangeScale = useCallback(
    (newScale: number) => {
      saveConfig({ scale: newScale });
    },
    [saveConfig]
  );

  const onToggleSynchronize = useCallback(
    () => {
      saveConfig({ synchronize: !config.synchronize });
    },
    [saveConfig, config.synchronize]
  );

  const renderImageTopicDropdown = () => {
    const cameraNamespace = getCameraNamespace(cameraTopic);
    const imageTopicsByNamespace = imageTopicsByNamespaceSelector(topics);

    if (!imageTopicsByNamespace || imageTopicsByNamespace.size === 0) {
      return (
        <Dropdown
          toggleComponent={
            <ToggleComponent dataTest={"topics-dropdown"} text={cameraTopic || "no image topics yet"} disabled />
          }
        />
      );
    }

    const items = [...imageTopicsByNamespace.keys()].sort().map((group) => {
      const imageTopics = imageTopicsByNamespace.get(group);
      if (!imageTopics) {
        return null;
      } // satisfy flow
      imageTopics.sort(naturalSort("name"));

      // place rectified topic above other imageTopics
      return (
        <SubMenu
          direction="right"
          key={group}
          text={group}
          checked={group === cameraNamespace}
          dataTest={group.substr(1)}>
          {imageTopics.map((topic) => {
            return (
              <Item
                key={topic.name}
                value={topic.name}
                checked={topic.name === cameraTopic}
                onClick={() => onChangeTopic(topic.name)}>
                {topic.name}
              </Item>
            );
          })}
        </SubMenu>
      );
    });
    return (
      <Dropdown toggleComponent={<ToggleComponent dataTest={"topics-dropdown"} text={cameraTopic} />}>{items}</Dropdown>
    );
  };

  const renderMarkerDropdown = (cameraInfo: ?CameraInfo, renderedMarkerTimestamps: { [topic: string]: Time }) => {
    const imageTopicsByNamespace = imageTopicsByNamespaceSelector(topics);
    const markerTopics = markerTopicSelector(topics, panelHooks);

    const allCameraNamespaces = imageTopicsByNamespace ? [...imageTopicsByNamespace.keys()] : [];
    const markerOptions = getMarkerOptions(cameraTopic, (markerTopics || []).map((t) => t.name), allCameraNamespaces);

    const missingRequiredCameraInfo = scale !== 1 && !cameraInfo;

    return (
      <Dropdown
        dataTest={"markers-dropdown"}
        closeOnChange={false}
        onChange={onToggleMarkerName}
        value={enabledMarkerNames}
        text={markerOptions.length > 0 ? "markers" : "no markers"}
        tooltip={
          missingRequiredCameraInfo
            ? "camera_info is required when image resolution is set to less than 100%.\nResolution can be changed in the panel settings."
            : undefined
        }
        disabled={markerOptions.length === 0 || missingRequiredCameraInfo}>
        {markerOptions.map((option) => (
          <Item
            icon={enabledMarkerNames.includes(option.name) ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
            key={option.name}
            value={option.name}>
            <span>{option.topic}</span>
            <TopicTimestamp
              text={renderedMarkerTimestamps[option.topic] ? formatTimeRaw(renderedMarkerTimestamps[option.topic]) : ""}
            />
          </Item>
        ))}
      </Dropdown>
    );
  };

  const menuContent = useMemo(
    () => (
      <>
        <Item icon={synchronize ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />} onClick={onToggleSynchronize}>
          <span>Synchronize images and markers</span>
        </Item>
        <hr />
        <SubMenu direction="right" text={`Image resolution: ${(scale * 100).toFixed()}%`}>
          {[0.2, 0.5, 1].map((value) => {
            return (
              <Item key={value} value={value} checked={scale === value} onClick={() => onChangeScale(value)}>
                {(value * 100).toFixed()}%
              </Item>
            );
          })}
        </SubMenu>
      </>
    ),
    [scale, onChangeScale, synchronize, onToggleSynchronize]
  );

  const cameraInfoTopic = getCameraInfoTopic(cameraTopic);
  const cameraInfo: ?CameraInfo = PanelAPI.useMessages({
    topics: cameraInfoTopic ? [cameraInfoTopic] : [],
    restore: useCallback((value) => value, []),
    addMessage: useCallback((value, { message }: TypedMessage<CameraInfo>) => message, []),
  }).reducedValue;

  const allMarkerTopics = markerTopicSelector(topics, panelHooks);
  const markerTopics = useShallowMemo(
    getMarkerTopics(cameraTopic, enabledMarkerNames).filter((markerTopic) =>
      allMarkerTopics.some(({ name }) => markerTopic === name)
    )
  );

  const shouldSynchronize = config.synchronize && markerTopics.length > 0;
  const imageAndMarkerTopics = useShallowMemo([{ topic: cameraTopic, imageScale: scale }, ...markerTopics]);
  const { messagesByTopic, synchronizedMessages } = useOptionallySynchronizedMessages(
    shouldSynchronize,
    imageAndMarkerTopics
  );
  const imageMessage = get(messagesByTopic, [cameraTopic, 0]);

  const markersToRender: Message[] = useMemo(
    () =>
      shouldSynchronize
        ? synchronizedMessages
          ? markerTopics.map((topic) => synchronizedMessages[topic])
          : []
        : filterMap(markerTopics, (topic) => last(messagesByTopic[topic])),
    [markerTopics, messagesByTopic, shouldSynchronize, synchronizedMessages]
  );
  // Timestamps are displayed for informational purposes in the markers menu
  const renderedMarkerTimestamps = useMemo(
    () => {
      const stamps = {};
      for (const { topic, message } of markersToRender) {
        stamps[topic] = message.header.stamp;
      }
      return stamps;
    },
    [markersToRender]
  );

  const rawMarkerData = {
    markers: markersToRender,
    scale,
    transformMarkers,
    cameraInfo: markersToRender.length > 0 ? cameraInfo : null,
  };

  const renderToolbar = () => {
    return (
      <PanelToolbar floating helpContent={helpContent} menuContent={menuContent}>
        <div className={style.controls}>
          {renderImageTopicDropdown()}
          {renderMarkerDropdown(cameraInfo, renderedMarkerTimestamps)}
        </div>
      </PanelToolbar>
    );
  };

  if (!imageMessage || (shouldSynchronize && !synchronizedMessages)) {
    return (
      <Flex col clip>
        {renderToolbar()}
        {renderEmptyState(cameraTopic, markerTopics, shouldSynchronize, messagesByTopic)}
      </Flex>
    );
  }

  return (
    <Flex col clip>
      {renderToolbar()}
      <ImageCanvas
        panelHooks={panelHooks}
        topic={cameraTopic}
        image={imageMessage}
        rawMarkerData={rawMarkerData}
        config={config}
        saveConfig={saveConfig}
      />
      <ChildToggle.ContainsOpen>
        {(containsOpen) => {
          const canTransformMarkers = getGlobalHooks()
            .perPanelHooks()
            .ImageView.canTransformMarkersByTopic(cameraTopic);

          const topicTimestamp = (
            <TopicTimestamp
              style={{ padding: "8px 8px 0px 0px" }}
              text={imageMessage ? formatTimeRaw(imageMessage.message.header.stamp) : ""}
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
    </Flex>
  );
}

ImageView.panelType = "ImageViewPanel";
ImageView.defaultConfig = getGlobalHooks().perPanelHooks().ImageView.defaultConfig;

export default hot(Panel<Config>(ImageView));
