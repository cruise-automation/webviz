// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { groupBy } from "lodash";
import * as React from "react"; // eslint-disable-line import/no-duplicates
import { useEffect, useState } from "react"; // eslint-disable-line import/no-duplicates

import NodePlayer from "webviz-core/src/players/NodePlayer";
import StoryPlayer from "webviz-core/src/players/StoryPlayer";
import type { PlayerState } from "webviz-core/src/players/types";
import PanelSetup, { type Fixture } from "webviz-core/src/stories/PanelSetup";

const defaultGetMergedFixture = (bagFixture) => bagFixture;

type Props = {|
  bag: string,
  bag2?: string,
  children: React.Node,
  subscriptions?: string[],
  bobjectSubscriptions?: string[],
  // merge the bag data with existing fixture data
  getMergedFixture?: (bagFixture: Fixture) => Fixture,
  onMount?: (HTMLDivElement) => void,
  onFirstMount?: (HTMLDivElement) => void,
|};

// A util component for testing panels that need to load the raw ROS bags.
// Make sure the bag is uncompressed and is small (only contains related topics).
// If the final fixture data is a mix of bag data (e.g. audio, image) and json/js data, you can
// merge them together using getMergedFixture
export default function PanelSetupWithBag({
  bag,
  bag2,
  children,
  getMergedFixture = defaultGetMergedFixture,
  // TODO(troy): Ideally we wouldn't even need subscriptions here, relying on
  // the PanelApi hooks to pick up on subscriptions and set them to the player
  // created in this component. We'll need to overhaul
  // `PanelSetup`/`MockMessagePipelineProvider` to accomplish this, mainly by
  // threading the `player` created here through those components.
  subscriptions,
  bobjectSubscriptions,
  onMount,
  onFirstMount,
}: Props) {
  const [fixture, setFixture] = useState();
  useEffect(
    () => {
      (async () => {
        const player = new NodePlayer(new StoryPlayer([bag, bag2].filter(Boolean)));
        player.setSubscriptions([
          ...(subscriptions || []).map((topic) => ({ topic, format: "parsedMessages" })),
          ...(bobjectSubscriptions || []).map((topic) => ({ topic, format: "bobjects" })),
        ]);

        player.setListener(({ activeData }: PlayerState) => {
          if (!activeData) {
            return Promise.resolve();
          }
          const { messages, bobjects, topics } = activeData;
          const frame = groupBy([...messages, ...bobjects], "topic");
          setFixture(
            getMergedFixture({
              frame,
              topics,
            })
          );
          return Promise.resolve();
        });
      })();
    },
    [bag, bag2, bobjectSubscriptions, getMergedFixture, subscriptions]
  );

  return fixture ? (
    <PanelSetup fixture={fixture} onMount={onMount} onFirstMount={onFirstMount}>
      {children}
    </PanelSetup>
  ) : null;
}
