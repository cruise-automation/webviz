// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import memoizeWeak from "memoize-weak";
import React, { useMemo, useCallback } from "react";
import { hot } from "react-hot-loader/root";
import { type Time } from "rosbag";
import styled from "styled-components";

import AudioPlayer, { type Config } from "./AudioPlayer";
import helpContent from "./index.help.md";
import { type AudioFrame, generateSamplesFromFrames, isAudioDatatype } from "./utils";
import EmptyState from "webviz-core/src/components/EmptyState";
import Flex from "webviz-core/src/components/Flex";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import SpinningLoadingIcon from "webviz-core/src/components/SpinningLoadingIcon";
import TopicToRenderMenu from "webviz-core/src/components/TopicToRenderMenu";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { useBlocksByTopic } from "webviz-core/src/PanelAPI";
import BlockLoadingProgress from "webviz-core/src/panels/Audio/BlockLoadingProgress";
import type { TypedMessage } from "webviz-core/src/players/types";
import { type Header } from "webviz-core/src/types/Messages";
import { deepParse } from "webviz-core/src/util/binaryObjects";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SContainer = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
`;
const SLoading = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;
const SLoadingToolbarWrapper = styled.div`
  height: 32px;
  display: flex;
  align-items: center;
  background: ${colors.DARK1};
  fill: ${colors.LIGHT};
`;
const SSpinningWrapper = styled.span`
  padding: 4px 8px;
`;

const { defaultTopic } = getGlobalHooks().perPanelHooks().Audio;
const DEFAULT_SAMPLING_RATE = 48000;
const DEFAULT_FRAME_PER_MESSAGE = 1024;
export const DEFAULT_SAMPLE_VALUE = 0;
const DEFAULT_MESSAGE_PER_BLOCK = 4;

type AudioMessage = $ReadOnly<{|
  header: Header,
  sampling_rate_hz: number,
  frames: $ReadOnlyArray<AudioFrame>,
|}>;

type AudioBlock = TypedMessage<AudioMessage>[];
type MessageTimestamps = { headerStamp: Time, receiveTime: Time }[];
type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
};

export type ProcessedAudioData = {|
  channelCount: number,
  messageTimestamps: MessageTimestamps,
  samples: number[][],
  samplingRate: number,
|};

const memoizedGetAudioDataFromBlocks = memoizeWeak(
  (audioBlocks: AudioBlock[]): ?ProcessedAudioData => {
    if (audioBlocks.length === 0) {
      return;
    }
    const firstAudioMsg = audioBlocks[0][0].message;
    const { frames, sampling_rate_hz } = firstAudioMsg;
    const channelCnt = frames[0].channels.length;

    const audioMsgTimestamps = [];
    const audioSamples = new Array(channelCnt).fill().map(() => []);

    audioBlocks.forEach((block) => {
      block.forEach((msg) => {
        audioMsgTimestamps.push({ receiveTime: msg.receiveTime, headerStamp: msg.message.header.stamp });
        const msgFrames = msg.message.frames;
        const perMsgSample = generateSamplesFromFrames(msgFrames);
        perMsgSample.forEach((item, channelIdx) => {
          for (let i = 0; i < item.length; i++) {
            audioSamples[channelIdx].push(item[i]);
          }
        });
      });
    });
    return {
      messageTimestamps: audioMsgTimestamps,
      samplingRate: sampling_rate_hz,
      samples: audioSamples,
      channelCount: channelCnt,
    };
  }
);

function Audio({ config, config: { topicToRender: configTopic }, saveConfig }: Props) {
  const availableTopics = useMessagePipeline(
    useCallback(
      ({ sortedTopics, datatypes }) => sortedTopics.filter(({ datatype }) => isAudioDatatype(datatype, datatypes)),
      []
    )
  );
  // If there's no default, pick the first available but don't save it to the config. If there are none available show
  // "Default (not available)" and don't save it to the config.
  const topicToRender = configTopic ?? defaultTopic ?? availableTopics[0] ?? "";
  const isAudioTopicAvailable = useMemo(() => !!availableTopics.find((item) => item.name === topicToRender), [
    availableTopics,
    topicToRender,
  ]);

  const blocks = useBlocksByTopic([topicToRender]);
  const { blockLoadingStates, isAllAudioBlocksLoaded } = useMemo(() => {
    const blockLoadingInfo = blocks.map((block) => !!block[topicToRender]);
    return {
      blockLoadingStates: blockLoadingInfo,
      isAllAudioBlocksLoaded: blockLoadingInfo.length > 0 && blockLoadingInfo.every((loaded) => !!loaded),
    };
  }, [blocks, topicToRender]);
  const defaultBlocks = useMemo(
    () =>
      new Array(blocks.length).fill().map(() =>
        new Array(DEFAULT_MESSAGE_PER_BLOCK).fill().map(() => ({
          message: {
            header: { frame_id: "", seq: 0, stamp: { sec: 0, nsec: 0 } },
            sampling_rate_hz: DEFAULT_SAMPLING_RATE,
            frames: new Array(DEFAULT_FRAME_PER_MESSAGE).fill().map(() => ({ channels: [DEFAULT_SAMPLE_VALUE] })),
          },
          receiveTime: { sec: 0, nsec: 0 },
          topic: topicToRender,
        }))
      ),
    [blocks.length, topicToRender]
  );
  const processedAudioData = useMemo(() => {
    // Use default blocks if any audio block is not yet loaded.
    const nonEmptyBlocks = !isAllAudioBlocksLoaded
      ? defaultBlocks
      : blocks
          .map((block) => {
            const audioBlock = block[topicToRender];
            // memoizedGetAudioDataFromBlocks expects each audioBlock to not be empty since it needs to read at least one msg to
            // get sampling rate and channel count.
            if (audioBlock.length === 0) {
              return undefined;
            }
            return ((audioBlock.map((msg) => ({
              ...msg,
              message: deepParse(msg.message),
            })): any): AudioBlock);
          })
          .filter(Boolean);
    return memoizedGetAudioDataFromBlocks(nonEmptyBlocks);
  }, [isAllAudioBlocksLoaded, defaultBlocks, blocks, topicToRender]);

  const renderAudioPlayer = isAllAudioBlocksLoaded && processedAudioData;
  return (
    <SContainer>
      <PanelToolbar
        helpContent={helpContent}
        additionalIcons={
          <TopicToRenderMenu
            topicToRender={topicToRender}
            onChange={(topic) => saveConfig({ topicToRender: topic })}
            topics={availableTopics}
            defaultTopicToRender={defaultTopic}
          />
        }
        floating
      />
      {!isAudioTopicAvailable && <EmptyState>No audio messages</EmptyState>}
      {renderAudioPlayer && <AudioPlayer config={config} {...processedAudioData} saveConfig={saveConfig} />}
      {!renderAudioPlayer && isAudioTopicAvailable && (
        <SLoading>
          <Flex center style={{ flex: 1 }}>
            <BlockLoadingProgress blockLoadingStates={blockLoadingStates} />
          </Flex>
          <SLoadingToolbarWrapper>
            <SSpinningWrapper>
              <SpinningLoadingIcon />
            </SSpinningWrapper>
            Loading audio...
          </SLoadingToolbarWrapper>
        </SLoading>
      )}
    </SContainer>
  );
}

Audio.panelType = "Audio";

Audio.defaultConfig = {
  showAllChannels: false,
  volume: 1,
  playbackRate: 1,
  selectedChannel: 0,
  topicToRender: defaultTopic,
};

export default hot(Panel<Config>(Audio));
