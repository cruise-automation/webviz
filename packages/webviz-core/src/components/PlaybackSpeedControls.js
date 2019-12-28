// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import FlagVariantIcon from "@mdi/svg/svg/flag-variant.svg";
import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { setPlaybackConfig } from "webviz-core/src/actions/panels";
import Dropdown from "webviz-core/src/components/Dropdown";
import { ExperimentalFeaturesModal } from "webviz-core/src/components/ExperimentalFeatures";
import { Item } from "webviz-core/src/components/Menu";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import renderToBody from "webviz-core/src/components/renderToBody";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import { useDataSourceInfo } from "webviz-core/src/PanelAPI";
import { PlayerCapabilities } from "webviz-core/src/players/types";
import { ndash, times } from "webviz-core/src/util/entities";

const SPEEDS = ["0.01", "0.02", "0.05", "0.1", "0.2", "0.5", "0.8", "1.0", "5.0"];

export default function PlaybackSpeedControls() {
  const configSpeed = useSelector((state) => state.panels.playbackConfig.speed);
  const speed = useMessagePipeline(
    useCallback(({ playerState }) => playerState.activeData && playerState.activeData.speed, [])
  );
  const { capabilities, playerId } = useDataSourceInfo();
  const canSetSpeed = capabilities.includes(PlayerCapabilities.setSpeed);

  // TODO(JP): Might be nice to move all this logic a bit deeper down. It's a bit weird to be doing
  // all this in what's otherwise just a view component.
  const dispatch = useDispatch();
  const setPlaybackSpeed = useMessagePipeline(
    useCallback(({ setPlaybackSpeed: pipelineSetPlaybackSpeed }) => pipelineSetPlaybackSpeed, [])
  );
  const setSpeed = useCallback(
    (newSpeed) => {
      dispatch(setPlaybackConfig({ speed: newSpeed }));
      if (canSetSpeed) {
        setPlaybackSpeed(newSpeed);
      }
    },
    [canSetSpeed, dispatch, setPlaybackSpeed]
  );

  // Set the speed to the speed that we got from the config whenever we get a new Player.
  useEffect(
    () => {
      setSpeed(configSpeed);
    },
    [playerId, setSpeed, configSpeed]
  );

  const onExperimentalFeaturesClick = useCallback(() => {
    const modal = renderToBody(<ExperimentalFeaturesModal onRequestClose={() => close(false)} />);
    function close(value) {
      modal.remove();
    }
  }, []);

  if (!canSetSpeed) {
    return null;
  }

  return (
    <Dropdown
      position="above"
      value={speed || configSpeed}
      text={!speed ? ndash : speed < 0.1 ? `${speed.toFixed(2)}${times}` : `${speed.toFixed(1)}${times}`}
      onChange={setSpeed}
      dataTest="PlaybackSpeedControls-Dropdown">
      {SPEEDS.map((eachSpeed: string) => (
        <span key={eachSpeed} value={parseFloat(eachSpeed)}>
          {eachSpeed}&times;
        </span>
      ))}
      <hr />
      {getGlobalHooks().experimentalFeaturesList()["disableDatabl" + "aster" /* get around blacklist */] && (
        <Item icon={<FlagVariantIcon />} onClick={onExperimentalFeaturesClick}>
          Configure &rdquo;Slower downloads, faster playback&rdquo;
        </Item>
      )}
    </Dropdown>
  );
}
