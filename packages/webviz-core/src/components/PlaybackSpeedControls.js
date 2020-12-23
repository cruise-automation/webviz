// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { setPlaybackConfig } from "webviz-core/src/actions/panels";
import Dropdown from "webviz-core/src/components/Dropdown";
import { useMessagePipeline } from "webviz-core/src/components/MessagePipeline";
import { useDataSourceInfo } from "webviz-core/src/PanelAPI";
import { PlayerCapabilities } from "webviz-core/src/players/types";
import { ndash } from "webviz-core/src/util/entities";

const SPEEDS = ["0.01", "0.02", "0.05", "0.1", "0.2", "0.5", "0.8", "1", "2", "3", "5"];

export default function PlaybackSpeedControls() {
  const configSpeed = useSelector((state) => state.persistedState.panels.playbackConfig.speed);
  const speed = useMessagePipeline(
    useCallback(({ playerState }) => playerState.activeData && playerState.activeData.speed, [])
  );
  const { capabilities } = useDataSourceInfo();
  const canSetSpeed = capabilities.includes(PlayerCapabilities.setSpeed);

  // TODO(JP): Might be nice to move all this logic a bit deeper down. It's a bit weird to be doing
  // all this in what's otherwise just a view component.
  const dispatch = useDispatch();
  const setPlaybackSpeed = useMessagePipeline(
    useCallback(({ setPlaybackSpeed: pipelineSetPlaybackSpeed }) => pipelineSetPlaybackSpeed, [])
  );
  const setSpeed = useCallback((newSpeed) => {
    dispatch(setPlaybackConfig({ speed: newSpeed }));
    if (canSetSpeed) {
      setPlaybackSpeed(newSpeed);
    }
  }, [canSetSpeed, dispatch, setPlaybackSpeed]);

  // Set the speed to the speed that we got from the config whenever we get a new Player.
  useEffect(() => setSpeed(configSpeed), [configSpeed, setSpeed]);

  const displayedSpeed = speed || configSpeed;
  let speedText = ndash;

  if (displayedSpeed) {
    speedText = displayedSpeed < 0.1 ? `${displayedSpeed.toFixed(2)}x` : `${displayedSpeed}x`;
  }

  return (
    <Dropdown
      position="above"
      value={displayedSpeed}
      text={speedText}
      onChange={setSpeed}
      menuStyle={{ width: "75px" }}
      btnStyle={{ marginRight: "16px", height: "28px" }}
      dataTest="PlaybackSpeedControls-Dropdown">
      {SPEEDS.map((eachSpeed: string) => (
        <span key={eachSpeed} value={parseFloat(eachSpeed)}>
          {eachSpeed}x
        </span>
      ))}
    </Dropdown>
  );
}
