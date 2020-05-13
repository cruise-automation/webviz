// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as monacoApi from "monaco-editor/esm/vs/editor/editor.api";
import { StaticServices } from "monaco-editor/esm/vs/editor/standalone/browser/standaloneServices";
import { initVimMode } from "monaco-vim";
import * as React from "react";
import MonacoEditor from "react-monaco-editor";

import { type Script } from "./script";
import vsWebvizTheme from "webviz-core/src/panels/NodePlayground/theme/vs-webviz.json";
import { getNodeProjectConfig } from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/typescript/projectConfig";

const VS_WEBVIZ_THEME = "vs-webviz";

const codeEditorService = StaticServices.codeEditorService.get();

type Props = {|
  script: Script | null,
  setScriptCode: (code: string) => void,
  vimMode: boolean,
  /* A minor hack to tell the monaco editor to resize when dimensions change. */
  resizeKey: string,
  save: (code: string) => void,
  setScriptOverride: (script: Script) => void,
|};

const Editor = ({ script, setScriptCode, vimMode, resizeKey, save, setScriptOverride }: Props) => {
  const editorRef = React.useRef<monacoApi.Editor>(null);
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

  /*
  In order to support go-to across files we override the code editor service doOpenEditor method.
  Default implementation checks if the requested resource is the current model and no ops if it isn't.
  Our implementation looks across all of our models to find the one requested and then queues that as
  an override along with the requested selection (containing line # etc). When we're told to load
  this override script we'll end up loading the model in the useEffect below, and then using this
  selection to move to the correct line.
  */
  codeEditorService.doOpenEditor = React.useCallback(
    (editor, input) => {
      const requestedModel = monacoApi.editor.getModel(input.resource);
      if (!requestedModel) {
        return editor;
      }
      setScriptOverride({
        fileName: requestedModel.uri.path,
        code: requestedModel.getValue(),
        readOnly: true,
        selection: input.options ? input.options.selection : undefined,
      });
      return editor;
    },
    [setScriptOverride]
  );

  React.useEffect(
    () => {
      const editor = editorRef.current;
      if (!editorRef || !script) {
        return;
      }
      const filePath = monacoApi.Uri.parse(`file://${script.fileName}`);
      const model =
        monacoApi.editor.getModel(filePath) || monacoApi.editor.createModel(script.code, "typescript", filePath);

      editor.setModel(model);

      const selection = script.selection;
      if (selection) {
        if (selection.endLineNumber && selection.endColumn) {
          // These fields indicate a range was selected, set the range and reveal it.
          editor.setSelection(selection);
          editor.revealRangeInCenter(selection, 1 /* Immediate */);
        } else {
          // Otherwise it's just a position
          const pos = {
            lineNumber: selection.startLineNumber,
            column: selection.startColumn,
          };
          editor.setPosition(pos);
          editor.revealPositionInCenter(pos, 1 /* Immediate */);
        }
      }
    },
    [script]
  );

  const options = React.useMemo(
    () => {
      return {
        wordWrap: "on",
        minimap: {
          enabled: false,
        },
        readOnly: script?.readOnly,
      };
    },
    [script]
  );

  const willMount = React.useCallback(
    (monaco) => {
      if (!script) {
        return;
      }
      monaco.editor.defineTheme(VS_WEBVIZ_THEME, vsWebvizTheme);
      // Set eager model sync to enable intellisense between the user code and utility files
      monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

      // Load declarations and additional utility files from project config

      // This ensures the type defs we enforce in
      // the 'compile' step match that of monaco. Adding the 'lib'
      // this way (instead of specifying it in the compiler options)
      // is a hack to overwrite the default type defs since the
      // typescript language service does not expose such a method.
      const projectConfig = getNodeProjectConfig();
      projectConfig.declarations.forEach((lib) =>
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          lib.sourceCode,
          `file:///node_modules/@types/${lib.fileName}`
        )
      );
      projectConfig.utilityFiles.forEach((sourceFile) => {
        const filePath = monacoApi.Uri.parse(`file://${sourceFile.filePath}`);
        if (!monaco.editor.getModel(filePath)) {
          monaco.editor.createModel(sourceFile.sourceCode, "typescript", filePath);
        }
      });

      const filePath = monacoApi.Uri.parse(`file://${script.fileName}`);
      const model = monaco.editor.getModel(filePath) || monaco.editor.createModel(script.code, "typescript", filePath);
      return {
        model,
      };
    },
    [script]
  );

  const didMount = React.useCallback(
    (editor) => {
      editorRef.current = editor;
      if (vimMode) {
        vimModeRef.current = initVimMode(editorRef.current);
      }
      editor.addAction({
        id: "ctrl-s",
        label: "Save current node",
        keybindings: [monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KEY_S],
        run: () => {
          if (editorRef?.current) {
            const model = editorRef.current.getModel();
            if (model && script && !script.readOnly) {
              save(model.getValue());
            }
          }
        },
      });
    },
    [save, script, vimMode]
  );

  const onChange = React.useCallback(
    (scr: string) => {
      setScriptCode(scr);
    },
    [setScriptCode]
  );

  if (!script) {
    // No script to load
    return null;
  }

  return (
    <MonacoEditor
      key={resizeKey}
      language="typescript"
      theme={VS_WEBVIZ_THEME}
      editorWillMount={willMount}
      editorDidMount={didMount}
      options={options}
      onChange={onChange}
    />
  );
};

export default Editor;
