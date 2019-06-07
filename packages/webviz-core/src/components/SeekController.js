// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useEffect, useRef } from "react";
import { TimeUtil } from "rosbag";

import { useMessagePipeline } from "./MessagePipeline";
import { fromMillis } from "webviz-core/src/util/time";

// Accept a search string to be injected into the component.
// The default value comes from window.location.search but allowing one to be provided
// makes testing much easier as window.location is a bit hard to mock out cleanly as it's a singleton.
type Props = {
  search?: string,
};

// seeks player based on url parameters once per page load to allow linking into a player's initial position
export default function SeekController(props: Props) {
  const context = useMessagePipeline();
  const seekApplied = useRef<boolean>(false);
  const search = props.search || window.location.search;
  // Only apply seek once per page load.
  // It doesn't make sense to apply a seek to a different instance of a player.
  // e.g. a user links to ?segment=foo&seek-to=4814814710 and then drops a bag - we don't
  // want to seek into the bag later.
  const shouldRunEffect = Boolean(
    context && context.playerState.activeData && context.playerState.activeData.isPlaying && !seekApplied.current
  );
  useEffect(
    () => {
      const { activeData, playerId } = context.playerState;
      if (!playerId || !activeData) {
        return;
      }
      if (seekApplied.current) {
        return;
      }
      if (!activeData.isPlaying) {
        return;
      }
      seekApplied.current = true;
      const params = new URLSearchParams(search);
      const seekTo = parseInt(params.get("seek-to"), 10);
      if (!seekTo) {
        return;
      }
      const { startTime, endTime } = activeData;
      const seekToTime = fromMillis(seekTo);
      if (TimeUtil.isGreaterThan(seekToTime, startTime) && TimeUtil.isLessThan(seekToTime, endTime)) {
        context.seekPlayback(seekToTime);
      }
    },
    [shouldRunEffect, search] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return null;
}
