// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { syncBags, SYNC_OPTIONS } from "./PanelToolbarMenu";

describe("PanelToolbarMenu utils", () => {
  describe("syncBag1ToBag2", () => {
    it("wipes bag2 checkedKeys and settingsByKey and copies checkedKeys and settingsByKey from bag1 to bag2", () => {
      expect(
        syncBags(
          {
            checkedKeys: [
              "name:Group 1",
              "t:/foo",
              "ns:/foo:ns1",
              "name_2:Group 2",
              "t:/webviz_source_2/foo",
              "t:/webviz_source_2/bar",
              "ns:/webviz_source_2/bar:ns1",
            ],
            settingsByKey: {
              "t:/foo": { name: "foo" },
              "t:/foo1": { name: "foo1" },
              "ns:/foo:ns1": { color: "white" },
              "t:/webviz_source_2/bar": { name: "bar" },
              "t:/webviz_source_2/foo": { name: "foo2" },
              "ns:/webviz_source_2/bar:ns1": { color: "black" },
            },
          },
          SYNC_OPTIONS.bag1ToBag2
        )
      ).toEqual({
        checkedKeys: [
          "name:Group 1",
          "t:/foo",
          "ns:/foo:ns1",
          "name_2:Group 1",
          "t:/webviz_source_2/foo",
          "ns:/webviz_source_2/foo:ns1",
        ],
        settingsByKey: {
          "t:/foo": { name: "foo" },
          "t:/foo1": { name: "foo1" },
          "ns:/foo:ns1": { color: "white" },
          "ns:/webviz_source_2/foo:ns1": { color: "white" },
          "t:/webviz_source_2/foo": { name: "foo" },
          "t:/webviz_source_2/foo1": { name: "foo1" },
        },
      });
    });
  });

  describe("syncBag2ToBag1", () => {
    it("wipes bag1 checkedKeys and settingsByKey and copies checkedKeys and settingsByKey from bag2 to bag1", () => {
      expect(
        syncBags(
          {
            checkedKeys: [
              "name:Group 1",
              "t:/foo",
              "t:/bar",
              "ns:/foo:ns1",
              "name_2:Group 2",
              "t:/webviz_source_2/bar",
              "ns:/webviz_source_2/bar:ns1",
            ],
            settingsByKey: {
              "t:/foo": { name: "foo" },
              "t:/foo1": { name: "foo1" },
              "t:/bar": { name: "bar1" },
              "ns:/foo:ns1": { color: "white" },
              "t:/webviz_source_2/bar": { name: "bar" },
              "ns:/webviz_source_2/bar:ns1": { color: "black" },
            },
          },
          SYNC_OPTIONS.bag2ToBag1
        )
      ).toEqual({
        checkedKeys: [
          "name:Group 2",
          "t:/bar",
          "ns:/bar:ns1",
          "name_2:Group 2",
          "t:/webviz_source_2/bar",
          "ns:/webviz_source_2/bar:ns1",
        ],
        settingsByKey: {
          "ns:/bar:ns1": { color: "black" },
          "ns:/webviz_source_2/bar:ns1": { color: "black" },
          "t:/bar": { name: "bar" },
          "t:/webviz_source_2/bar": { name: "bar" },
        },
      });
    });
  });
  describe("swapBag1AndBag2", () => {
    it("swaps bag1 and bag2 checkedKeys and settingsByKey", () => {
      expect(
        syncBags(
          {
            checkedKeys: [
              "name:Group 1",
              "t:/foo",
              "t:/bar",
              "ns:/foo:ns1",
              "name_2:Group 2",
              "t:/webviz_source_2/bar",
              "ns:/webviz_source_2/bar:ns1",
            ],
            settingsByKey: {
              "t:/foo": { name: "foo" },
              "t:/foo1": { name: "foo1" },
              "t:/bar": { name: "bar1" },
              "ns:/foo:ns1": { color: "white" },
              "t:/webviz_source_2/bar": { name: "bar" },
              "ns:/webviz_source_2/bar:ns1": { color: "black" },
            },
          },
          SYNC_OPTIONS.swapBag1AndBag2
        )
      ).toEqual({
        checkedKeys: [
          "name:Group 2",
          "t:/bar",
          "ns:/bar:ns1",
          "name_2:Group 1",
          "t:/webviz_source_2/foo",
          "t:/webviz_source_2/bar",
          "ns:/webviz_source_2/foo:ns1",
        ],
        settingsByKey: {
          "ns:/bar:ns1": { color: "black" },
          "t:/bar": { name: "bar" },
          "ns:/webviz_source_2/foo:ns1": { color: "white" },
          "t:/webviz_source_2/bar": { name: "bar1" },
          "t:/webviz_source_2/foo": { name: "foo" },
          "t:/webviz_source_2/foo1": { name: "foo1" },
        },
      });
    });
  });
});
