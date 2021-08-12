// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import WavesIcon from "@mdi/svg/svg/waves.svg";
import cx from "classnames";
import { uniq, keyBy, partition } from "lodash";
import React, { useMemo, useCallback, type Node } from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import ImageCanvas from "./ImageCanvas";
import imageCanvasStyles from "./ImageCanvas.module.scss";
import helpContent from "./index.help.md";
import style from "./index.module.scss";
import { getCameraInfoTopic, getCameraNamespace, getRelatedMarkerTopics, getMarkerOptions, groupTopics } from "./util";
import Autocomplete from "webviz-core/src/components/Autocomplete";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Dropdown from "webviz-core/src/components/Dropdown";
import dropDownStyles from "webviz-core/src/components/Dropdown/index.module.scss";
import EmptyState from "webviz-core/src/components/EmptyState";
import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import { Item, SubMenu } from "webviz-core/src/components/Menu";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import filterMap from "webviz-core/src/filterMap";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import IconTextMenu from "webviz-core/src/panels/ImageView/IconTextMenu";
import type { Message, TypedMessage } from "webviz-core/src/players/types";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { CameraInfo } from "webviz-core/src/types/Messages";
import type { SaveConfig } from "webviz-core/src/types/panels";
import { deepParse, maybeGetBobjectHeaderStamp } from "webviz-core/src/util/binaryObjects";
import { WEBVIZ_ICON_MSGS$WEBVIZ_2D_ICON_ARRAY } from "webviz-core/src/util/globalConstants";
import { useShallowMemo, useDeepMemo } from "webviz-core/src/util/hooks";
import naturalSort from "webviz-core/src/util/naturalSort";
import { getTopicsByTopicName } from "webviz-core/src/util/selectors";
import { colors as sharedColors } from "webviz-core/src/util/sharedStyleConstants";
import { getSynchronizingReducers } from "webviz-core/src/util/synchronizeMessages";
import { formatTimeRaw } from "webviz-core/src/util/time";
import toggle from "webviz-core/src/util/toggle";

type DefaultConfig = {|
  cameraTopic: string,
  enabledMarkerTopics: string[],
  customMarkerTopicOptions?: string[],
  scale: number,
  synchronize: boolean,
  // Use template string to create icon text from the metadata fields of the icon msg.
  iconTextTemplate?: string,
|};

type ImageViewPanelHooks = {
  defaultConfig: DefaultConfig,
  imageMarkerDatatypes: string[],
};
const DEFAULT_PANEL_HOOKS = { imageMarkerDatatypes: [] };

// const IMAGE_ICON_MARKER_DATATYPES = [WEBVIZ_ICON_MSGS$WEBVIZ_2D_ICON_ARRAY];
export type Config = {|
  ...DefaultConfig,
  panelHooks?: ImageViewPanelHooks,
  transformMarkers: boolean,
  mode: "fit" | "fill" | "other" | null,
  zoomPercentage: ?number,
  offset: ?(number[]),
  saveStoryConfig?: () => void,
|};

export type SaveImagePanelConfig = SaveConfig<Config>;

type Props = {
  config: Config,
  saveConfig: SaveImagePanelConfig,
};

const TopicTimestampSpan = styled.span`
  padding: 0px 15px 0px 0px;
  font-size: 10px;
  font-style: italic;
`;

const SEmptyStateWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  z-index: 200;
  background: ${sharedColors.DARK};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TopicTimestamp = ({ text, style: styleObj }: { text: string, style?: { [string]: string } }) =>
  text === "" ? null : <TopicTimestampSpan style={styleObj}>{text}</TopicTimestampSpan>;

const BottomBar = ({ children, containsOpen }: { children?: Node, containsOpen: boolean }) => (
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

function renderEmptyState(
  cameraTopic: string,
  markerTopics: string[],
  shouldSynchronize: boolean,
  messagesByTopic: { [topic: string]: Message[] }
) {
  return (
    <SEmptyStateWrapper>
      <EmptyState>
        Waiting for images {markerTopics.length > 0 && "and markers"} on:
        <br />
        <br />
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
            <p>Synchronization is enabled, so all messages with `header.stamp`s must match exactly.</p>
            <ul>
              {Object.keys(messagesByTopic).map((topic) => (
                <li key={topic}>
                  <code>{topic}</code>:{" "}
                  {messagesByTopic[topic] && messagesByTopic[topic].length
                    ? messagesByTopic[topic]
                        .map(({ message }) => {
                          const stamp = maybeGetBobjectHeaderStamp(message);
                          // In some cases, a user may have subscribed to a topic that does not include a header stamp.
                          return stamp ? formatTimeRaw(stamp) : "[ unknown ]";
                        })
                        .join(", ")
                    : "no messages"}
                </li>
              ))}
            </ul>
          </>
        )}
      </EmptyState>
    </SEmptyStateWrapper>
  );
}

const AddTopic = ({ onSelectTopic, topics }: { onSelectTopic: (string) => void, topics: string[] }) => {
  return (
    <div style={{ padding: "8px 12px", height: "31px" }}>
      <Autocomplete
        placeholder="Add topic"
        items={topics}
        onSelect={onSelectTopic}
        getItemValue={(s) => s}
        getItemText={(s) => s}
      />
    </div>
  );
};

const NO_CUSTOM_OPTIONS = [];

function ImageView(props: Props) {
  const { config, saveConfig } = props;
  const {
    scale,
    synchronize,
    cameraTopic,
    enabledMarkerTopics,
    panelHooks,
    transformMarkers,
    customMarkerTopicOptions = NO_CUSTOM_OPTIONS,
    iconTextTemplate,
  } = config;
  const { topics } = PanelAPI.useDataSourceInfo();
  // For looking up datatype by topic name.
  const topicsKeyByTopicName = useMemo(() => keyBy(topics, "name"), [topics]);
  const isDemoMode = useExperimentalFeature("demoMode");
  const cameraTopicFullObject = useMemo(() => getTopicsByTopicName(topics)[cameraTopic], [cameraTopic, topics]);

  // Namespaces represent marker topics based on the camera topic prefix (e.g. "/camera_front_medium")
  const { allCameraNamespaces, imageTopicsByNamespace } = useMemo(() => {
    const imageTopics = (topics ?? []).filter(({ datatype }) =>
      ["sensor_msgs/Image", "sensor_msgs/CompressedImage"].includes(datatype)
    );
    const topicsByNamespace = groupTopics(imageTopics);
    return { imageTopicsByNamespace: topicsByNamespace, allCameraNamespaces: [...topicsByNamespace.keys()] };
  }, [topics]);

  const { imageMarkerDatatypes } = panelHooks || getGlobalHooks().perPanelHooks().ImageView || DEFAULT_PANEL_HOOKS;

  const combinedImageMarkerDataTypes = useMemo(() => [...imageMarkerDatatypes, WEBVIZ_ICON_MSGS$WEBVIZ_2D_ICON_ARRAY], [
    imageMarkerDatatypes,
  ]);
  const defaultAvailableMarkerTopics = useMemo(
    () => getMarkerOptions(cameraTopic, topics, allCameraNamespaces, combinedImageMarkerDataTypes),
    [cameraTopic, topics, allCameraNamespaces, combinedImageMarkerDataTypes]
  );
  const availableAndEnabledMarkerTopics = useShallowMemo(
    uniq([...defaultAvailableMarkerTopics, ...customMarkerTopicOptions, ...enabledMarkerTopics]).sort()
  );
  const onToggleMarkerName = useCallback((markerTopic: string) => {
    saveConfig({ enabledMarkerTopics: toggle(enabledMarkerTopics, markerTopic) });
  }, [saveConfig, enabledMarkerTopics]);

  const onChangeCameraTopic = useCallback((newCameraTopic: string) => {
    const newAvailableMarkerTopics = getMarkerOptions(
      newCameraTopic,
      topics,
      allCameraNamespaces,
      combinedImageMarkerDataTypes
    );

    const newEnabledMarkerTopics = getRelatedMarkerTopics(enabledMarkerTopics, newAvailableMarkerTopics);
    saveConfig({
      cameraTopic: newCameraTopic,
      transformMarkers: getGlobalHooks()
        .perPanelHooks()
        .ImageView.canTransformMarkersByTopic(newCameraTopic),

      enabledMarkerTopics: newEnabledMarkerTopics,
    });
  }, [topics, allCameraNamespaces, combinedImageMarkerDataTypes, enabledMarkerTopics, saveConfig]);

  const onChangeScale = useCallback((newScale: number) => {
    saveConfig({ scale: newScale });
  }, [saveConfig]);

  const onToggleSynchronize = useCallback(() => {
    saveConfig({ synchronize: !synchronize });
  }, [saveConfig, synchronize]);

  const imageTopicDropdown = useMemo(() => {
    const cameraNamespace = getCameraNamespace(cameraTopic);

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
                onClick={() => onChangeCameraTopic(topic.name)}>
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
  }, [cameraTopic, imageTopicsByNamespace, onChangeCameraTopic]);

  const cameraInfoTopic = getCameraInfoTopic(cameraTopic);
  const cameraInfo: ?CameraInfo = PanelAPI.useMessageReducer({
    topics: cameraInfoTopic ? [cameraInfoTopic] : [],
    restore: useCallback((value) => value, []),
    addMessage: useCallback((value, { message }: TypedMessage<CameraInfo>) => message, []),
  });

  const shouldSynchronize = synchronize && enabledMarkerTopics.length > 0;
  const imageAndMarkerTopics = useDeepMemo([{ topic: cameraTopic, imageScale: scale }, ...enabledMarkerTopics]);

  const { messagesByTopic: pendingSynchronizedMessages, synchronizedMessages } = PanelAPI.useMessageReducer({
    topics: imageAndMarkerTopics,
    ...useMemo(
      () =>
        getSynchronizingReducers(
          imageAndMarkerTopics.map((request) => (typeof request === "string" ? request : request.topic))
        ),
      [imageAndMarkerTopics]
    ),
  });
  const unsynchronizedMessages = PanelAPI.useMessageReducer({
    topics: imageAndMarkerTopics,
    restore: useCallback((previousValue) => previousValue ?? {}, []),
    addBobjects: useCallback((oldState, newBobjects) => {
      const newState = { ...oldState };
      newBobjects.forEach((bobject) => {
        newState[bobject.topic] = bobject;
      });
      return newState;
    }, []),
  });
  const bobjectFrame = shouldSynchronize ? synchronizedMessages : unsynchronizedMessages;
  // TODO(steel): Move the parsing into the worker.
  const parsedFrame = useMemo(() => {
    if (bobjectFrame == null) {
      return bobjectFrame;
    }
    const ret = {};
    Object.keys(bobjectFrame).forEach((topic) => {
      const { message, receiveTime } = bobjectFrame[topic];
      ret[topic] = { message: deepParse(message), topic, receiveTime };
    });
    return ret;
  }, [bobjectFrame]);

  const { iconMarkersToRender, nonIconMarkersToRender } = useMemo(() => {
    const combinedMarkers: Message[] = filterMap(enabledMarkerTopics, (topic) => parsedFrame?.[topic]);
    const [iconMarkers, nonIconMarkers] = partition(combinedMarkers, ({ topic }) => {
      return topicsKeyByTopicName[topic].datatype === WEBVIZ_ICON_MSGS$WEBVIZ_2D_ICON_ARRAY;
    });
    return { iconMarkersToRender: iconMarkers, nonIconMarkersToRender: nonIconMarkers };
  }, [enabledMarkerTopics, parsedFrame, topicsKeyByTopicName]);

  // Timestamps are displayed for informational purposes in the markers menu
  const renderedMarkerTimestamps = useMemo(() => {
    const stamps = {};
    for (const { topic, message } of nonIconMarkersToRender) {
      // In some cases, a user may have subscribed to a topic that does not include a header stamp.
      stamps[topic] = message?.header?.stamp ? formatTimeRaw(message.header.stamp) : "[ not available ]";
    }
    return stamps;
  }, [nonIconMarkersToRender]);

  const rawMarkerData = {
    markers: nonIconMarkersToRender,
    scale,
    transformMarkers,
    cameraInfo: nonIconMarkersToRender.length > 0 ? cameraInfo : null,
  };

  const addTopicsMenu = useMemo(
    () => (
      <AddTopic
        topics={topics.map(({ name }) => name).filter((topic) => !availableAndEnabledMarkerTopics.includes(topic))}
        onSelectTopic={(topic) =>
          saveConfig({
            enabledMarkerTopics: [...enabledMarkerTopics, topic],
            customMarkerTopicOptions: [...customMarkerTopicOptions, topic],
          })
        }
      />
    ),
    [topics, availableAndEnabledMarkerTopics, saveConfig, enabledMarkerTopics, customMarkerTopicOptions]
  );

  const markerDropdown = useMemo(() => {
    const missingRequiredCameraInfo = scale !== 1 && !cameraInfo;
    return (
      <Dropdown
        dataTest={"markers-dropdown"}
        closeOnChange={false}
        onChange={onToggleMarkerName}
        value={enabledMarkerTopics}
        text={availableAndEnabledMarkerTopics.length > 0 ? "markers" : "no markers"}
        tooltip={
          missingRequiredCameraInfo
            ? "camera_info is required when image resolution is set to less than 100%.\nResolution can be changed in the panel settings."
            : undefined
        }
        disabled={availableAndEnabledMarkerTopics.length === 0 || missingRequiredCameraInfo}>
        {availableAndEnabledMarkerTopics.map((topic) => (
          <Item
            icon={enabledMarkerTopics.includes(topic) ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
            key={topic}
            value={topic}
            className={style.dropdownItem}>
            <span style={{ display: "inline-block", marginRight: "15px" }}>{topic}</span>
            <TopicTimestamp text={renderedMarkerTimestamps[topic] || ""} />
            {customMarkerTopicOptions.includes(topic) && (
              <Icon
                style={{ position: "absolute", right: "10px" }}
                onClick={() =>
                  saveConfig({
                    enabledMarkerTopics: enabledMarkerTopics.filter((topicOption) => topicOption !== topic),
                    customMarkerTopicOptions: customMarkerTopicOptions.filter((topicOption) => topicOption !== topic),
                  })
                }>
                <CloseIcon />
              </Icon>
            )}
          </Item>
        ))}
        {addTopicsMenu}
      </Dropdown>
    );
  }, [
    addTopicsMenu,
    availableAndEnabledMarkerTopics,
    cameraInfo,
    customMarkerTopicOptions,
    enabledMarkerTopics,
    onToggleMarkerName,
    renderedMarkerTimestamps,
    saveConfig,
    scale,
  ]);

  const onIconTextChange = useCallback((newVal: string) => {
    saveConfig({ iconTextTemplate: newVal });
  }, [saveConfig]);

  const menuContent = useMemo(
    () => (
      <>
        <Item icon={synchronize ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />} onClick={onToggleSynchronize}>
          <span>Synchronize images and markers</span>
        </Item>
        <IconTextMenu value={iconTextTemplate || ""} onChange={onIconTextChange} />

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
    [synchronize, onToggleSynchronize, iconTextTemplate, onIconTextChange, scale, onChangeScale]
  );

  const imageMessage = parsedFrame?.[cameraTopic];
  const lastImageMessageRef = React.useRef(imageMessage);
  if (imageMessage) {
    lastImageMessageRef.current = imageMessage;
  }
  // Keep the last image message, if it exists, to render on the ImageCanvas.
  // Improve perf by hiding the ImageCanvas while seeking, instead of unmounting and remounting it.
  const imageMessageToRender = imageMessage || lastImageMessageRef.current;

  const { pauseFrame } = useMessagePipeline(
    useCallback((messagePipeline) => ({ pauseFrame: messagePipeline.pauseFrame }), [])
  );
  const onStartRenderImage = useCallback(() => {
    const resumeFrame = pauseFrame("ImageView");
    const onFinishRenderImage = () => {
      resumeFrame();
    };
    return onFinishRenderImage;
  }, [pauseFrame]);

  const toolbar = useMemo(() => {
    return (
      <PanelToolbar floating helpContent={helpContent} menuContent={menuContent}>
        <div className={style.controls}>
          {imageTopicDropdown}
          {markerDropdown}
        </div>
      </PanelToolbar>
    );
  }, [imageTopicDropdown, markerDropdown, menuContent]);

  const renderBottomBar = () => {
    return (
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
    );
  };

  const showEmptyState = !imageMessage || (shouldSynchronize && !parsedFrame);

  return (
    <Flex col clip>
      {toolbar}
      {/* If rendered, EmptyState will hide the always-present ImageCanvas */}
      {showEmptyState &&
        renderEmptyState(cameraTopic, enabledMarkerTopics, shouldSynchronize, pendingSynchronizedMessages)}
      {/* Always render the ImageCanvas because it's expensive to unmount and start up. */}
      {imageMessageToRender && (
        <ImageCanvas
          topic={cameraTopicFullObject}
          image={imageMessageToRender}
          rawMarkerData={rawMarkerData}
          iconMarkers={iconMarkersToRender}
          config={config}
          saveConfig={saveConfig}
          onStartRenderImage={onStartRenderImage}
        />
      )}
      {!showEmptyState && !isDemoMode && renderBottomBar()}
    </Flex>
  );
}

ImageView.panelType = "ImageViewPanel";
ImageView.defaultConfig = getGlobalHooks().perPanelHooks().ImageView.defaultConfig;
ImageView.shortcuts = [
  { description: "Zoom in", keys: ["="] },
  { description: "Zoom out", keys: ["-"] },
  { description: "Zoom to percentage (10% - 100%)", keys: ["⌘", "1|2|...|9|0"] },
];
export default hot(Panel<Config>(ImageView));
