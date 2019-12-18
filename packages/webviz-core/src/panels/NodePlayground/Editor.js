// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as monacoApi from "monaco-editor/esm/vs/editor/editor.api";
import { initVimMode } from "monaco-vim";
import * as React from "react";
import Dimensions from "react-container-dimensions";
import MonacoEditor from "react-monaco-editor";

import vsWebvizTheme from "webviz-core/src/panels/NodePlayground/theme/vs-webviz.json";
import { lib_filename, lib_es6_dts } from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/lib";
import {
  ros_lib_filename,
  ros_lib_dts,
} from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/ros";

const VS_WEBVIZ_THEME = "vs-webviz";

type Props = { script: string, setScript: (script: string) => void, vimMode: boolean };
const Editor = ({ script, setScript, vimMode }: Props) => {
  const editorRef = React.useRef(null);
  const vimModeRef = React.useRef(null);
  React.useEffect(
    () => {
      if (editorRef.current) {
        if (vimMode) {
          vimModeRef.current = initVimMode(editorRef.current);
        } else if (vimModeRef.current) {
          // Turn off VimMode.
          vimModeRef.current.dispose();
        }
      }
    },
    [vimMode]
  );
  return (
    <Dimensions>
      {({ width, height }) => (
        <MonacoEditor
          key={`${width}-${height}`}
          language="typescript"
          theme={VS_WEBVIZ_THEME}
          editorWillMount={(monaco) => {
            monaco.editor.defineTheme(VS_WEBVIZ_THEME, vsWebvizTheme);
            // This line ensures the type defs we enforce in
            // the 'compile' step match that of monaco. Adding the 'lib'
            // this way (instead of specifying it in the compiler options)
            // is a hack to overwrite the default type defs since the
            // typescript language service does not expose such a method.
            monaco.languages.typescript.typescriptDefaults.addExtraLib(lib_es6_dts, lib_filename);
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
              ros_lib_dts,
              `file:///node_modules/@types/${ros_lib_filename}`
            );
          }}
          editorDidMount={(editor) => {
            editorRef.current = editor;
            if (vimMode) {
              vimModeRef.current = initVimMode(editorRef.current);
            }
          }}
          options={{
            // A 'model' in monaco is the interface through which monaco
            // (and consumers of monaco) update and refer to the text model.
            // E.g. there is a method called `model.pushEditOperations()`
            // which is how you set user input. If we do not explicitly set
            // the model with our desired URI (in this case,
            // 'file:///main.ts'), monaco will create a default model that
            // is set to `inmemory://model/`, which, for some reason,
            // blocks our ability to add custom modules (like `lib.d.ts` above) to the system.
            model:
              monacoApi.editor.getModel("file:///main.ts") ||
              monacoApi.editor.createModel(script, "typescript", monacoApi.Uri.parse("file:///main.ts")),
            wordWrap: "on",
            minimap: {
              enabled: false,
            },
          }}
          value={script}
          onChange={setScript}
        />
      )}
    </Dimensions>
  );
};

export default Editor;
