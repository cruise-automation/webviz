// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { connect } from "react-redux";

import { importPanelLayout, setGlobalVariables } from "webviz-core/src/actions/panels";
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
import { CoreDataProviders } from "webviz-core/src/dataProviders/constants";
import { getRemoteBagGuid } from "webviz-core/src/dataProviders/getRemoteBagGuid";
import {
  getLocalBagDescriptor,
  getRemoteBagDescriptor,
} from "webviz-core/src/dataProviders/standardDataProviderDescriptors";
import useUserNodes from "webviz-core/src/hooks/useUserNodes";
import RandomAccessPlayer from "webviz-core/src/players/RandomAccessPlayer";
import RosbridgePlayer from "webviz-core/src/players/RosbridgePlayer";
import type { Player } from "webviz-core/src/players/types";
import UserNodePlayer from "webviz-core/src/players/UserNodePlayer";
import type { UserNodes } from "webviz-core/src/types/panels";
import { corsError } from "webviz-core/src/util/corsError";
import demoLayoutJson from "webviz-core/src/util/demoLayout.json";
import { getGlobalVariablesFromUrl } from "webviz-core/src/util/getGlobalVariablesFromUrl";
import {
  DEMO_QUERY_KEY,
  LAYOUT_URL_QUERY_KEY,
  REMOTE_BAG_URL_2_QUERY_KEY,
  REMOTE_BAG_URL_QUERY_KEY,
  ROSBRIDGE_WEBSOCKET_URL_QUERY_KEY,
  SECOND_BAG_PREFIX,
} from "webviz-core/src/util/globalConstants";
import reportError from "webviz-core/src/util/reportError";
import { getSeekToTime } from "webviz-core/src/util/time";

function getPlayerOptions() {
  return { metricsCollector: undefined, seekToTime: getSeekToTime() };
}

type PlayerDefinition = {| player: Player, inputDescription: React.Node |};

function buildPlayerFromFiles(files: File[]): ?PlayerDefinition {
  if (files.length === 0) {
    return undefined;
  } else if (files.length === 1) {
    return {
      player: new RandomAccessPlayer(getLocalBagDescriptor(files[0]), getPlayerOptions()),
      inputDescription: (
        <>
          Using local bag file <code>{files[0].name}</code>.
        </>
      ),
    };
  } else if (files.length === 2) {
    return {
      player: new RandomAccessPlayer(
        {
          name: CoreDataProviders.CombinedDataProvider,
          args: { providerInfos: [{}, { prefix: SECOND_BAG_PREFIX }] },
          children: [getLocalBagDescriptor(files[0]), getLocalBagDescriptor(files[1])],
        },
        getPlayerOptions()
      ),
      inputDescription: (
        <>
          Using local bag files <code>{files[0].name}</code> and <code>{files[1].name}</code>.
        </>
      ),
    };
  }
  throw new Error(`Unsupported number of files: ${files.length}`);
}

async function buildPlayerFromBagURLs(urls: string[]): Promise<?PlayerDefinition> {
  const guids: (?string)[] = await Promise.all(urls.map(getRemoteBagGuid));

  if (urls.length === 0) {
    return undefined;
  } else if (urls.length === 1) {
    return {
      player: new RandomAccessPlayer(getRemoteBagDescriptor(urls[0], guids[0]), getPlayerOptions()),
      inputDescription: (
        <>
          Streaming bag from <code>{urls[0]}</code>.
        </>
      ),
    };
  } else if (urls.length === 2) {
    return {
      player: new RandomAccessPlayer(
        {
          name: CoreDataProviders.CombinedDataProvider,
          args: { providerInfos: [{}, { prefix: SECOND_BAG_PREFIX }] },
          children: [getRemoteBagDescriptor(urls[0], guids[0]), getRemoteBagDescriptor(urls[1], guids[1])],
        },
        getPlayerOptions()
      ),
      inputDescription: (
        <>
          Streaming bag from <code>{urls[0]}</code> and <code>{urls[1]}</code>.
        </>
      ),
    };
  }
  throw new Error(`Unsupported number of urls: ${urls.length}`);
}

type OwnProps = { children: ({ inputDescription: React.Node }) => React.Node };

type Props = OwnProps & {
  importPanelLayout: typeof importPanelLayout,
  userNodes: UserNodes,
  setUserNodeDiagnostics: SetUserNodeDiagnostics,
  addUserNodeLogs: AddUserNodeLogs,
  setUserNodeTrust: SetUserNodeTrust,
  setGlobalVariables: typeof setGlobalVariables,
};

function PlayerManager({
  importPanelLayout: importLayout,
  children,
  userNodes,
  setUserNodeDiagnostics: setDiagnostics,
  addUserNodeLogs: setLogs,
  setUserNodeTrust: setTrust,
  setGlobalVariables: setVariables,
}: Props) {
  const usedFiles = React.useRef<File[]>([]);
  const [player, setPlayerInternal] = React.useState<?UserNodePlayer>();
  const [inputDescription, setInputDescription] = React.useState<React.Node>("No input selected.");

  const setPlayer = React.useCallback(
    (playerDefinition: ?PlayerDefinition) => {
      if (!playerDefinition) {
        setPlayerInternal(undefined);
        setInputDescription("No input selected.");
        return;
      }
      setInputDescription(playerDefinition.inputDescription);
      const userNodePlayer = new UserNodePlayer(playerDefinition.player, {
        setUserNodeDiagnostics: setDiagnostics,
        addUserNodeLogs: setLogs,
        setUserNodeTrust: setTrust,
      });
      setPlayerInternal(userNodePlayer);
    },
    [setDiagnostics, setLogs, setTrust]
  );

  React.useEffect(
    () => {
      const params = new URLSearchParams(window.location.search);

      const globalVariables = getGlobalVariablesFromUrl(params);
      if (globalVariables) {
        setVariables(globalVariables);
      }

      // For testing, you can use ?layout-url=https://open-source-webviz-ui.s3.amazonaws.com/demoLayout.json
      const layoutUrl = params.get(LAYOUT_URL_QUERY_KEY);
      if (layoutUrl) {
        fetch(layoutUrl)
          .then((response) => response.json())
          .then((json) => {
            importLayout(json, { isFromUrl: true, skipSettingLocalStorage: false });
          })
          .catch((error) => {
            reportError(
              "Layout failed to load",
              `Fetching remote file failed. ${corsError(layoutUrl)} ${error}`,
              "user"
            );
          });
      } else if (params.has(DEMO_QUERY_KEY)) {
        importLayout(demoLayoutJson, { isFromUrl: false, skipSettingLocalStorage: true });
      }

      const remoteDemoBagUrl = "https://open-source-webviz-ui.s3.amazonaws.com/demo.bag";
      if (params.has(DEMO_QUERY_KEY)) {
        buildPlayerFromBagURLs([remoteDemoBagUrl]).then((playerDefinition: ?PlayerDefinition) => {
          setPlayer(playerDefinition);
          // When we're showing a demo, then automatically start playback (we don't normally
          // do that).
          if (playerDefinition) {
            setTimeout(() => {
              playerDefinition.player.startPlayback();
            }, 1000);
          }
        });
      }
      if (params.has(REMOTE_BAG_URL_QUERY_KEY)) {
        const urls = [params.get(REMOTE_BAG_URL_QUERY_KEY), params.get(REMOTE_BAG_URL_2_QUERY_KEY)].filter(Boolean);
        buildPlayerFromBagURLs(urls).then((playerDefinition: ?PlayerDefinition) => {
          setPlayer(playerDefinition);
        });
      } else {
        const websocketUrl = params.get(ROSBRIDGE_WEBSOCKET_URL_QUERY_KEY) || "ws://localhost:9090";
        setPlayer({
          player: new RosbridgePlayer(websocketUrl),
          inputDescription: (
            <>
              Using WebSocket at <code>{websocketUrl}</code>.
            </>
          ),
        });
      }
    },
    [importLayout, setPlayer, setVariables]
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
          setPlayer(buildPlayerFromFiles(usedFiles.current));
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
      <MessagePipelineProvider player={player}>{children({ inputDescription })}</MessagePipelineProvider>
    </>
  );
}

export default connect<Props, OwnProps, _, _, _, _>(
  (state) => ({
    userNodes: state.panels.userNodes,
  }),
  { importPanelLayout, setUserNodeDiagnostics, addUserNodeLogs, setUserNodeTrust, setGlobalVariables }
)(PlayerManager);
