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
import {
  setUserNodeDiagnostics,
  addUserNodeLogs,
  setUserNodeTrust,
  type SetUserNodeDiagnostics,
  type AddUserNodeLogs,
  type SetUserNodeTrust,
} from "webviz-core/src/actions/userNodes";
import DocumentDropListener from "webviz-core/src/components/DocumentDropListener";
import DropOverlay from "webviz-core/src/components/DropOverlay";
import { MessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import { getRemoteBagGuid } from "webviz-core/src/dataProviders/getRemoteBagGuid";
import {
  getLocalBagDescriptor,
  getRemoteBagDescriptor,
} from "webviz-core/src/dataProviders/standardDataProviderDescriptors";
import useUserNodes from "webviz-core/src/hooks/useUserNodes";
import NodePlayer from "webviz-core/src/players/NodePlayer";
import RandomAccessPlayer from "webviz-core/src/players/RandomAccessPlayer";
import type { Player } from "webviz-core/src/players/types";
import UserNodePlayer from "webviz-core/src/players/UserNodePlayer";
import type { ImportPanelLayoutPayload, UserNodes } from "webviz-core/src/types/panels";
import demoLayoutJson from "webviz-core/src/util/demoLayout.json";
import {
  DEMO_QUERY_KEY,
  LOAD_ENTIRE_BAG_QUERY_KEY,
  REMOTE_BAG_URL_QUERY_KEY,
  SECOND_BAG_PREFIX,
  FRAME_SIZE_MS_QUERY_KEY,
} from "webviz-core/src/util/globalConstants";
import { getSeekToTime } from "webviz-core/src/util/time";

function buildPlayer(files: File[]): ?Player {
  if (files.length === 0) {
    return undefined;
  } else if (files.length === 1) {
    return new RandomAccessPlayer(getLocalBagDescriptor(files[0]), undefined);
  } else if (files.length === 2) {
    return new RandomAccessPlayer({
      name: "CombinedDataProvider",
      args: { providerInfos: [{}, { prefix: SECOND_BAG_PREFIX }] },
      children: [getLocalBagDescriptor(files[0]), getLocalBagDescriptor(files[1])],
    });
  }
  throw new Error(`Unsupported number of files: ${files.length}`);
}

type OwnProps = { children: React.Node };

type Props = OwnProps & {
  importPanelLayout: (payload: ImportPanelLayoutPayload, isFromUrl: boolean, skipSettingLocalStorage: boolean) => void,
  userNodes: UserNodes,
  setUserNodeDiagnostics: SetUserNodeDiagnostics,
  addUserNodeLogs: AddUserNodeLogs,
  setUserNodeTrust: SetUserNodeTrust,
};

export function getFrameSizeMs(params: URLSearchParams) {
  return params.get(FRAME_SIZE_MS_QUERY_KEY) ? Number(params.get(FRAME_SIZE_MS_QUERY_KEY)) : null;
}

function PlayerManager({
  importPanelLayout,
  children,
  userNodes,
  setUserNodeDiagnostics,
  addUserNodeLogs,
  setUserNodeTrust,
}: Props) {
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
          const newPlayer = new RandomAccessPlayer(
            getRemoteBagDescriptor(url, guid, params.has(LOAD_ENTIRE_BAG_QUERY_KEY)),
            undefined,
            { autoplay: true, seekToTime: getSeekToTime(), frameSizeMs: getFrameSizeMs(params) }
          );
          setPlayer(new UserNodePlayer(newPlayer, { setUserNodeDiagnostics, addUserNodeLogs, setUserNodeTrust }));
        });
        if (params.has(DEMO_QUERY_KEY)) {
          importPanelLayout(demoLayoutJson, false, true);
        }
      }
    },
    [importPanelLayout, setUserNodeDiagnostics, addUserNodeLogs, setUserNodeTrust]
  );

  useUserNodes({ nodePlayer: player, userNodes });

  return (
    <>
      <DocumentDropListener
        filesSelected={({ files, shiftPressed }: { files: FileList | File[], shiftPressed: boolean }) => {
          if (shiftPressed && usedFiles.current.length === 1) {
            usedFiles.current = [usedFiles.current[0], files[0]];
          } else if (files.length === 2) {
            usedFiles.current = [...files];
          } else {
            usedFiles.current = [files[0]];
          }
          const player = buildPlayer(usedFiles.current);
          setPlayer(player ? new NodePlayer(player) : undefined);
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
  (state) => ({
    userNodes: state.panels.userNodes,
  }),
  { importPanelLayout, setUserNodeDiagnostics, addUserNodeLogs, setUserNodeTrust }
)(PlayerManager);
