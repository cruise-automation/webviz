// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React from "react";

import NodePlayer from "webviz-core/src/components/MessagePipeline/NodePlayer";
import type { UserWebvizNodes } from "webviz-core/src/reducers/panels";

type Props = {
  nodePlayer: ?NodePlayer,
  userWebvizNodes: UserWebvizNodes,
};

const useUserWebvizNodes = ({ nodePlayer, userWebvizNodes }: Props) => {
  React.useEffect(
    () => {
      if (nodePlayer) {
        nodePlayer.useUserWebvizNodes(userWebvizNodes);
      }
    },
    [userWebvizNodes, nodePlayer]
  );

  return null;
};

export default useUserWebvizNodes;
