// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React from "react";

import NodePlayer from "webviz-core/src/players/NodePlayer";
import UserNodePlayer from "webviz-core/src/players/UserNodePlayer";
import type { UserNodes } from "webviz-core/src/types/panels";

type Props = {
  nodePlayer: ?(NodePlayer | UserNodePlayer),
  userNodes: UserNodes,
};

const useUserNodes = ({ nodePlayer, userNodes }: Props) => {
  React.useEffect(
    () => {
      if (nodePlayer) {
        nodePlayer.setUserNodes(userNodes);
      }
    },
    [userNodes, nodePlayer]
  );

  return null;
};

export default useUserNodes;
