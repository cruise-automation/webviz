// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { connect } from "react-redux";

import { importPanelLayout } from "webviz-core/src/actions/panels";
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
import type { ImportPanelLayoutPayload } from "webviz-core/src/types/panels";
import type { Player } from "webviz-core/src/types/players";
import demoLayoutJson from "webviz-core/src/util/demoLayout.json";
import {
  LOAD_ENTIRE_BAG_QUERY_KEY,
  MEASURE_DATA_PROVIDERS_QUERY_KEY,
  REMOTE_BAG_URL_QUERY_KEY,
  DEMO_QUERY_KEY,
  SECOND_BAG_PREFIX,
} from "webviz-core/src/util/globalConstants";

const getDataProviderBase = createGetDataProvider({
  BagDataProvider,
  ParseMessagesDataProvider,
  ReadAheadDataProvider,
  WorkerDataProvider,
  IdbCacheReaderDataProvider,
  IdbCacheWriterDataProvider,
});
function getDataProvider(tree: ChainableDataProviderDescriptor): ChainableDataProvider {
  if (new URLSearchParams(location.search).has(MEASURE_DATA_PROVIDERS_QUERY_KEY)) {
    tree = instrumentDataProviderTree(tree);
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

type OwnProps = { children: React.Node };

type Props = OwnProps & {
  importPanelLayout: (payload: ImportPanelLayoutPayload, isFromUrl: boolean, skipSettingLocalStorage: boolean) => void,
};

function PlayerManager({ importPanelLayout, children }: Props) {
  const usedFiles = React.useRef<File[]>([]);
  const [player, setPlayer] = React.useState();

  React.useEffect(
    () => {
      const params = new URLSearchParams(window.location.search);
      const remoteDemoBagUrl = "https://open-source-webviz-ui.s3.amazonaws.com/demo.bag";
      if (params.has(REMOTE_BAG_URL_QUERY_KEY) || params.has(DEMO_QUERY_KEY)) {
        const url = params.has(REMOTE_BAG_URL_QUERY_KEY)
          ? params.get(REMOTE_BAG_URL_QUERY_KEY) || ""
          : remoteDemoBagUrl;
        getRemoteBagGuid(url).then((guid: ?string) => {
          setPlayer(
            new NodePlayer(
              new RandomAccessPlayer(
                getDataProvider(getRemoteBagDescriptor(url, guid, params.has(LOAD_ENTIRE_BAG_QUERY_KEY))),
                undefined,
                true
              )
            )
          );
        });
        if (params.has(DEMO_QUERY_KEY)) {
          importPanelLayout(demoLayoutJson, false, true);
        }
      }
    },
    [importPanelLayout]
  );

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

export default connect<Props, OwnProps, _, _, _, _>(
  () => {},
  { importPanelLayout }
)(PlayerManager);
