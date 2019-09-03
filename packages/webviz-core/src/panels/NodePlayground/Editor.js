// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import Dimensions from "react-container-dimensions";

import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import SpinningLoadingIcon from "webviz-core/src/components/SpinningLoadingIcon";
import vsWebvizTheme from "webviz-core/src/panels/NodePlayground/theme/vs-webviz.json";

const VS_WEBVIZ_THEME = "vs-webviz";

const MonacoEditor = React.lazy(() => import(/* webpackChunkName: "react-monaco-editor" */ "react-monaco-editor"));
const Editor = ({
  script,
  setScript,
  editorForStorybook, // Currently this prop is only used for screenshot tests.
}: {
  script: string,
  setScript: (script: string) => void,
  editorForStorybook?: React.Node,
}) => {
  return (
    <Dimensions>
      {({ width, height }) => (
        <React.Suspense
          fallback={
            <Flex center style={{ width: "100%", height: "100%" }}>
              <Icon large>
                <SpinningLoadingIcon />
              </Icon>
            </Flex>
          }>
          {editorForStorybook || (
            <MonacoEditor
              key={`${width}-${height}`}
              language="typescript"
              theme={VS_WEBVIZ_THEME}
              editorWillMount={(monaco) => {
                monaco.editor.defineTheme(VS_WEBVIZ_THEME, vsWebvizTheme);
              }}
              options={{
                minimap: {
                  enabled: false,
                },
              }}
              value={script}
              onChange={setScript}
            />
          )}
        </React.Suspense>
      )}
    </Dimensions>
  );
};

export default Editor;
