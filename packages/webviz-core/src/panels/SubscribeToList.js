// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";
import { hot } from "react-hot-loader/root";

import Flex from "webviz-core/src/components/Flex";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { SaveConfig } from "webviz-core/src/types/panels";

// Little dummy panel that just subscribes to a bunch of topics. Doesn't actually
// do anything with them.

type Config = { topics: string };
type Props = { config: Config, saveConfig: SaveConfig<Config> };

function SubscribeToList({ config, saveConfig }: Props): React.Node {
  const topics = config.topics.split(/\s*(?:\n|,|\s)\s*/);
  const messagesSeen = PanelAPI.useMessageReducer<number>({
    topics,
    restore: React.useCallback(() => 0, []),
    addMessage: React.useCallback((seenBefore) => seenBefore + 1, []),
  });
  return (
    <Flex col>
      <PanelToolbar floating />
      <textarea
        style={{ flexGrow: 1, border: "none" }}
        placeholder="add /some/topics/here separated by newlines or commas or whitespace"
        value={config.topics}
        onChange={React.useCallback((event) => saveConfig({ topics: event.target.value }), [saveConfig])}
      />
      <div style={{ position: "absolute", bottom: 8, right: 12 }}>messages seen: {messagesSeen}</div>
    </Flex>
  );
}

SubscribeToList.panelType = "SubscribeToList";
SubscribeToList.defaultConfig = { topics: "" };

export default hot(Panel<Config>(SubscribeToList));
