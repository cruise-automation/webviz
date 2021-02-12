// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { Time } from "rosbag";

import type { PlayerState } from "webviz-core/src/players/types";
import { toMillis, fromMillis } from "webviz-core/src/util/time";

export const ARROW_SEEK_BIG_MS = 500;
export const ARROW_SEEK_DEFAULT_MS = 100;
export const ARROW_SEEK_SMALL_MS = 10;
export const DIRECTION = {
  FORWARD: 1,
  BACKWARD: -1,
};

export const jumpSeek = (
  directionSign: $Values<typeof DIRECTION>,
  playerProps: { seek: (Time) => void, player: PlayerState },
  modifierKeys?: { altKey: boolean, shiftKey: boolean }
) => {
  const { player, seek } = playerProps;
  if (!player.activeData) {
    return;
  }

  const timeMs = toMillis(player.activeData.currentTime);
  const deltaMs = modifierKeys?.altKey
    ? ARROW_SEEK_BIG_MS
    : modifierKeys?.shiftKey
    ? ARROW_SEEK_SMALL_MS
    : ARROW_SEEK_DEFAULT_MS;
  const nextTime = fromMillis(timeMs + deltaMs * directionSign);
  if (nextTime) {
    seek(nextTime);
  }
};

export const togglePlayPause = (props: { player: PlayerState, pause: () => void, play: () => void }) => {
  const { pause, play, player } = props;
  const { activeData } = player;
  if (activeData) {
    (activeData.isPlaying ? pause : play)();
  }
};
