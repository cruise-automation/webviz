// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { DiagnosticSeverity, type Diagnostic } from "webviz-core/src/players/UserNodePlayer/types";

// Typescript is required since the `import` syntax breaks VSCode, presumably
// because VSCode has Typescript built in and our import is conflicting with
// some model of theirs. We could just manually insert the entire TS
// source code.
const ts = require("typescript/lib/typescript");

const mapCategoryToDiagnosticSeverity = (category: ts.DiagnosticCategory): $Values<typeof DiagnosticSeverity> => {
  switch (category) {
    case ts.DiagnosticCategory.Error:
      return DiagnosticSeverity.Error;
    case ts.DiagnosticCategory.Warning:
      return DiagnosticSeverity.Warning;
    case ts.DiagnosticCategory.Message:
      return DiagnosticSeverity.Info;
    case ts.DiagnosticCategory.Suggestion:
      return DiagnosticSeverity.Hint;
    default:
      throw new Error("Diagnostic category not recognized");
  }
};

// Function responsible for transforming diagnostic information into a format
// the monaco-editor can use.
export const transformDiagnosticToMarkerData = (diagnostic: ts.Diagnostic): Diagnostic => {
  const { line: startLineNumber, character: startColumn } = diagnostic.file.getLineAndCharacterOfPosition(
    diagnostic.start
  );

  const { line: endLineNumber, character: endColumn } = diagnostic.file.getLineAndCharacterOfPosition(
    diagnostic.start + diagnostic.length
  );

  let messageText = "";
  // Typescript sometimes builds a linked list of formatted diagnostic messages
  // to be used as part of a multiline message.
  if (typeof diagnostic.messageText === "string") {
    messageText = diagnostic.messageText;
  } else {
    let message = diagnostic.messageText;
    while (message.next) {
      messageText += `\n${message.messageText}`;
      message = message.next;
    }
  }

  return {
    message: messageText,
    severity: mapCategoryToDiagnosticSeverity(diagnostic.category),
    source: "Typescript",
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn,
    // TODO: Maybe map these 'codes' to meaningful strings?
    code: diagnostic.code,
  };
};

// https://www.typescriptlang.org/docs/handbook/compiler-options.html
export const baseCompilerOptions = {
  strict: true,
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
};
