// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import removeEmptyDiagnosticsConfigNames from "webviz-core/migrations/frozenMigrations/2020.10.22.14:44:54.removeEmptyDiagnosticsConfigNames.js";

describe("removeEmptyDiagnosticsConfigNames", () => {
  it("removes empty selected names from the relevant panel types", () => {
    expect(
      removeEmptyDiagnosticsConfigNames({
        savedProps: {
          "DiagnosticSummary!3bqkn1w": {
            selectedHardwareId: "/foo",
            selectedName: "",
            topicToRender: "/diagnostics",
            collapsedSections: [],
          },
          "DiagnosticStatusPanel!3bqkn1w": {
            selectedHardwareId: "/foo",
            selectedName: "",
            topicToRender: "/diagnostics",
            collapsedSections: [],
          },
        },
      })
    ).toEqual({
      savedProps: {
        "DiagnosticSummary!3bqkn1w": {
          selectedHardwareId: "/foo",
          selectedName: undefined,
          topicToRender: "/diagnostics",
          collapsedSections: [],
        },
        "DiagnosticStatusPanel!3bqkn1w": {
          selectedHardwareId: "/foo",
          selectedName: undefined,
          topicToRender: "/diagnostics",
          collapsedSections: [],
        },
      },
    });
  });

  it("does not remove names when it shouldn't", () => {
    const savedProps = {
      "NodePlayground!3bqkn1w": {
        selectedNodeId: undefined,
        vimMode: false,
        autoFormatOnSave: false,
      },
      "DiagnosticSummary!3bqkn1w": {
        selectedHardwareId: "/foo",
        selectedName: "asdf",
        topicToRender: "/diagnostics",
        collapsedSections: [],
      },
      "DiagnosticStatusPanel!3bqkn1w": {
        selectedHardwareId: "/foo",
        selectedName: "qwer",
        topicToRender: "/diagnostics",
        collapsedSections: [],
      },
    };
    expect(removeEmptyDiagnosticsConfigNames({ savedProps })).toEqual({ savedProps });
  });
});
