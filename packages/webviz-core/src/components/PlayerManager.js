// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

import DocumentDropListener from "webviz-core/src/components/DocumentDropListener";
import DropOverlay from "webviz-core/src/components/DropOverlay";
import { MessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import NodePlayer from "webviz-core/src/components/MessagePipeline/NodePlayer";
import BagDataProvider from "webviz-core/src/players/BagDataProvider";
import CombinedDataProvider from "webviz-core/src/players/CombinedDataProvider";
import createGetDataProvider from "webviz-core/src/players/createGetDataProvider";
import { getRemoteBagGuid } from "webviz-core/src/players/getRemoteBagGuid";
import IdbCacheReaderDataProvider from "webviz-core/src/players/IdbCacheReaderDataProvider";
import IdbCacheWriterDataProvider from "webviz-core/src/players/IdbCacheWriterDataProvider";
import { instrumentDataProviderTree } from "webviz-core/src/players/MeasureDataProvider";
import ParseMessagesDataProvider from "webviz-core/src/players/ParseMessagesDataProvider";
import RandomAccessPlayer from "webviz-core/src/players/RandomAccessPlayer";
import ReadAheadDataProvider from "webviz-core/src/players/ReadAheadDataProvider";
import { getLocalBagDescriptor, getRemoteBagDescriptor } from "webviz-core/src/players/standardDataProviderDescriptors";
import type { ChainableDataProvider, ChainableDataProviderDescriptor } from "webviz-core/src/players/types";
import WorkerDataProvider from "webviz-core/src/players/WorkerDataProvider";
import type { Player } from "webviz-core/src/types/players";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

const getDataProviderBase = createGetDataProvider({
  BagDataProvider,
  ParseMessagesDataProvider,
  ReadAheadDataProvider,
  WorkerDataProvider,
  IdbCacheReaderDataProvider,
  IdbCacheWriterDataProvider,
});
function getDataProvider(tree: ChainableDataProviderDescriptor): ChainableDataProvider {
  if (new URLSearchParams(location.search).has("_measureDataProviders")) {
    tree = instrumentDataProviderTree(tree);
    console.log("tree", tree);
  }
  return getDataProviderBase(tree);
}

function buildPlayer(files: File[]): Player {
  let bagProvider = getDataProvider(getLocalBagDescriptor(files[0]));
  if (files.length === 2) {
    bagProvider = new CombinedDataProvider([
      { provider: getDataProvider(getLocalBagDescriptor(files[0])) },
      { provider: getDataProvider(getLocalBagDescriptor(files[1])), prefix: SECOND_BAG_PREFIX },
    ]);
  }
  return new RandomAccessPlayer(bagProvider, undefined, true);
}

export default function PlayerManager({ children }: {| children: React.Node |}) {
  const usedFiles = React.useRef<File[]>([]);
  const [player, setPlayer] = React.useState();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("remote-bag-url")) {
      const url = params.get("remote-bag-url") || "";
      getRemoteBagGuid(url).then((guid: ?string) => {
        setPlayer(
          new NodePlayer(
            new RandomAccessPlayer(
              getDataProvider(getRemoteBagDescriptor(url, guid, params.has("load-entire-bag"))),
              undefined,
              true
            )
          )
        );
      });
    }
  }, []);

  return (
    <>
      <DocumentDropListener
        filesSelected={({ files, shiftPressed }: { files: FileList, shiftPressed: boolean }) => {
          if (shiftPressed && usedFiles.current.length === 1) {
            usedFiles.current = [usedFiles.current[0], files[0]];
          } else if (files.length === 2) {
            usedFiles.current = [...files];
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
    </>
  );
}
