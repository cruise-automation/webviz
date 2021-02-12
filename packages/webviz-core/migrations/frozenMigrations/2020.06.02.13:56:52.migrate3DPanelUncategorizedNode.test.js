// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { migrate3DPanelUncategorizedNode } from "webviz-core/migrations/frozenMigrations/2020.06.02.13:56:52.migrate3DPanelUncategorizedNode";

describe("migrate3DPanelUncategorizedNode", () => {
  it("changes 'name:Uncategorized' to 'name:Topic' for checkedKeys and expandedKeys", () => {
    expect(
      migrate3DPanelUncategorizedNode(
        ({
          savedPropsVersion: 17,
          checkedKeys: ["t:/foo", "name:Topic", "name:(Uncategorized)", "name_2:(Uncategorized)"],
          expandedKeys: ["name:(Uncategorized)"],
        }: any)
      )
    ).toEqual({ checkedKeys: ["t:/foo", "name:Topic", "name_2:Topic"], expandedKeys: ["name:Topic"] });
  });
});
