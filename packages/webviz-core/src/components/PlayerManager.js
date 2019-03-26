// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import withHooks, { useRef, useState } from "react-with-hooks";

import DocumentDropListener from "webviz-core/src/components/DocumentDropListener";
import DropOverlay from "webviz-core/src/components/DropOverlay";
import { MessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import NodePlayer from "webviz-core/src/components/MessagePipeline/NodePlayer";
import { BagDataProvider } from "webviz-core/src/players/bag/BagDataProvider";
import CombinedDataProvider from "webviz-core/src/players/CombinedDataProvider";
import RandomAccessPlayer from "webviz-core/src/players/RandomAccessPlayer";
import ReadAheadDataProvider from "webviz-core/src/players/ReadAheadDataProvider";
import type { Player } from "webviz-core/src/types/players";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

function buildPlayer(files: File[]): Player {
  let bagProvider = new BagDataProvider(files[0]);
  if (files.length === 2) {
    bagProvider = new CombinedDataProvider([
      { provider: new BagDataProvider(files[0]) },
      { provider: new BagDataProvider(files[1]), prefix: SECOND_BAG_PREFIX },
    ]);
  }
  return new RandomAccessPlayer(new ReadAheadDataProvider(bagProvider), undefined, true);
}

const PlayerManager = withHooks(function PlayerManager({ children }: {| children: React.Node |}) {
  const usedFiles: { current: File[] } = useRef([]);
  const [player, setPlayer] = useState();

  return (
    <React.Fragment>
      <DocumentDropListener
        filesSelected={({ files, shiftPressed }: { files: FileList, shiftPressed: boolean }) => {
          if (shiftPressed && usedFiles.current.length === 1) {
            usedFiles.current = [usedFiles.current[0], files[0]];
          } else {
            usedFiles.current = [files[0]];
          }
          setPlayer(new NodePlayer(buildPlayer(usedFiles.current)));
        }}>
        <DropOverlay>
          <div style={{ fontSize: "4em", marginBottom: "1em" }}>Drop a bag file to load it!</div>
          <div style={{ fontSize: "2em" }}>
            (hold SHIFT while dropping a second bag file to add it
            <br />
            with all topics prefixed with {SECOND_BAG_PREFIX})
          </div>
        </DropOverlay>
      </DocumentDropListener>
      <MessagePipelineProvider player={player}>{children}</MessagePipelineProvider>
    </React.Fragment>
  );
});

export default PlayerManager;
