// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { PlayerState } from "webviz-core/src/players/types";

export const ARROW_SEEK_TYPES = {
  TINY: "TINY",
  SMALL: "SMALL",
  DEFAULT: "DEFAULT",
  BIG: "BIG",
  TICKS: "TICKS",
};

export type SeekType = $Values<typeof ARROW_SEEK_TYPES>;

export const ARROW_SEEK_MS = {
  TINY: 1,
  SMALL: 10,
  DEFAULT: 100,
  BIG: 500,
  TICKS: 0, // this is just to satisfy Flow and is never used
};

export const ARROW_LABELS_BY_VALUE = {
  TINY: "1ms",
  SMALL: "10ms",
  DEFAULT: "100ms",
  BIG: "500ms",
  TICKS: "Ticks",
};

export const DIRECTION = {
  FORWARD: 1,
  BACKWARD: -1,
};

export const getSeekType = (ev: KeyboardEvent): SeekType => {
  if (ev?.altKey) {
    return ARROW_SEEK_TYPES.BIG;
  } else if (ev?.shiftKey) {
    return ARROW_SEEK_TYPES.SMALL;
  } else if (ev?.metaKey || ev?.ctrlKey) {
    return ARROW_SEEK_TYPES.TINY;
  }
  return ARROW_SEEK_TYPES.DEFAULT;
};

export const togglePlayPause = (props: { player: PlayerState, pause: () => void, play: () => void }) => {
  const { pause, play, player } = props;
  const { activeData } = player;
  if (activeData) {
    (activeData.isPlaying ? pause : play)();
  }
};
