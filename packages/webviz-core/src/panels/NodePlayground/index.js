// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import Dimensions from "react-container-dimensions";
import MonacoEditor from "react-monaco-editor";

import helpContent from "./index.help.md";
import WebvizNodesAccessor, { type NodesActions } from "./WebvizNodesAccessor";
import Flex from "webviz-core/src/components/Flex";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import NodesListSidebar from "webviz-core/src/panels/NodePlayground/NodesListSidebar";
import { DEFAULT_WEBVIZ_NODE_NAME } from "webviz-core/src/util/globalConstants";

type Config = {|
  selectedNode: ?string,
|};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
};

function NodePlayground(props: Props) {
  const { config, saveConfig } = props;
  const { selectedNode } = config;

  return (
    <Dimensions>
      {({ width, height }) => (
        <WebvizNodesAccessor>
          {(webvizNodes, { setWebvizNodes }: NodesActions) => {
            return (
              <Flex col>
                <PanelToolbar helpContent={helpContent} floating />
                <Flex style={{ height: "100%" }}>
                  <NodesListSidebar
                    onSelect={(node) => saveConfig({ selectedNode: node })}
                    onUpdate={setWebvizNodes}
                    selectedNode={selectedNode}
                    nodes={webvizNodes}
                  />
                  <Flex col>
                    <Flex start>
                      <div style={{ padding: 10, paddingLeft: 50 }}>Currently editing:</div>
                      <input
                        type="text"
                        placeholder="Selected node name"
                        value={selectedNode || DEFAULT_WEBVIZ_NODE_NAME}
                        onChange={(e) => {
                          const newNodeName = e.target.value;
                          saveConfig({ selectedNode: newNodeName });
                          if (selectedNode) {
                            setWebvizNodes({
                              [selectedNode]: undefined,
                              [newNodeName]: webvizNodes[selectedNode].text,
                            });
                          } else {
                            setWebvizNodes({ [newNodeName]: "" });
                          }
                        }}
                      />
                    </Flex>
                    <MonacoEditor
                      key={`${width}-${height}`}
                      language="javascript"
                      theme="vs-dark"
                      options={{ readOnly: webvizNodes[selectedNode] ? webvizNodes[selectedNode].readOnly : false }}
                      value={webvizNodes[selectedNode] ? webvizNodes[selectedNode].text : ""}
                      onChange={(newScript: string) => {
                        if (newScript) {
                          setWebvizNodes({ [selectedNode || DEFAULT_WEBVIZ_NODE_NAME]: newScript });
                        }
                        if (!selectedNode) {
                          saveConfig({ selectedNode: DEFAULT_WEBVIZ_NODE_NAME });
                        }
                      }}
                    />
                  </Flex>
                </Flex>
              </Flex>
            );
          }}
        </WebvizNodesAccessor>
      )}
    </Dimensions>
  );
}

NodePlayground.panelType = "NodePlayground";
NodePlayground.defaultConfig = { selectedNode: null };

export default Panel<Config>(NodePlayground);
