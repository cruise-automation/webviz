// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import prefixCollapsedSectionsWithDiagnosticName from "webviz-core/migrations/frozenMigrations/2020.07.07.11:17:28.prefixCollapsedSectionsWithDiagnosticName.js";

describe("prefixCollapsedSectionsWithDiagnosticName", () => {
  expect(
    prefixCollapsedSectionsWithDiagnosticName({
      savedProps: {
        "DiagnosticStatusPanel!123": {
          topicToRender: "/diagnostics",
          selectedName: "diagnostic_name",
          collapsedSections: ["--section a--", "--section b--", "--section c--"],
        },
      },
    })
  ).toEqual({
    savedProps: {
      "DiagnosticStatusPanel!123": {
        topicToRender: "/diagnostics",
        selectedName: "diagnostic_name",
        collapsedSections: [
          { name: "diagnostic_name", section: "--section a--" },
          { name: "diagnostic_name", section: "--section b--" },
          { name: "diagnostic_name", section: "--section c--" },
        ],
      },
    },
  });
});
