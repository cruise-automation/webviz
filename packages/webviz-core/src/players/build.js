// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { playerDisconnected, getPlayer, getPipeline, setPlayerNull } from "webviz-core/src/actions/player";
import { BagDataProvider } from "webviz-core/src/players/bag/BagDataProvider";
import CombinedDataProvider from "webviz-core/src/players/CombinedDataProvider";
import RandomAccessPlayer from "webviz-core/src/players/RandomAccessPlayer";
import ReadAheadDataProvider from "webviz-core/src/players/ReadAheadDataProvider";
import type { Player } from "webviz-core/src/types/players";
import type { Dispatch, GetState } from "webviz-core/src/types/Store";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";
import reportError from "webviz-core/src/util/reportError";

export type PlayerInput = string | File | Player;

let lastBagPayload: ?File;

function clearPlayer(dispatch: Dispatch) {
  const player = getPlayer();
  if (player) {
    player.close();
  }
  setPlayerNull();
  dispatch(playerDisconnected());
}

export const loadBag = (files: FileList | File[], addBag: boolean) => async (
  dispatch: Dispatch,
  getState: GetState
): Promise<void> => {
  if (getPlayer()) {
    clearPlayer(dispatch);
  }
  const file = files[0];
  let bagProvider;
  if (lastBagPayload && addBag) {
    const bagProvider1 = new BagDataProvider(lastBagPayload);
    const bagProvider2 = new BagDataProvider(file);
    bagProvider = new CombinedDataProvider([
      { provider: bagProvider1 },
      { provider: bagProvider2, prefix: SECOND_BAG_PREFIX },
    ]);
    lastBagPayload = undefined;
  } else {
    bagProvider = new BagDataProvider(file);
    lastBagPayload = file;
  }
  const provider = new ReadAheadDataProvider(bagProvider);
  const player = new RandomAccessPlayer(provider, undefined, true);

  try {
    await getPipeline().initialize(dispatch, player);
  } catch (e) {
    reportError("Player failed to initialize", e);
    return clearPlayer(dispatch);
  }
};
