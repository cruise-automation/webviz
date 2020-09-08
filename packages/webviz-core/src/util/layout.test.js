// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import LZString from "lz-string";
import { updateTree } from "react-mosaic-component";

import {
  getPanelTypeFromId,
  getSaveConfigsPayloadForAddedPanel,
  removePanelFromTabPanel,
  getPanelIdsInsideTabPanels,
  createAddUpdates,
  addPanelToTab,
  replaceAndRemovePanels,
  updateTabPanelLayout,
  validateTabPanelConfig,
  moveTabBetweenTabPanels,
  reorderTabWithinTabPanel,
  getLayoutPatch,
  getUpdatedURLWithDecodedLayout,
  getUpdatedURLWithPatch,
  getUpdatedURLWithNewVersion,
} from "./layout";

describe("layout", () => {
  describe("getSaveConfigsPayloadForAddedPanel", () => {
    it("properly map template panel IDs to new IDs when adding a Tab panel", () => {
      const tabConfig = { title: "First tab", layout: { first: "Plot!1", second: "Plot!2" } };
      const firstPlotConfig = { paths: ["/abc"] };
      const secondPlotConfig = { paths: ["/def"] };
      const configsSaved = getSaveConfigsPayloadForAddedPanel({
        id: "Tab!abc",
        config: { tabs: [tabConfig] },
        relatedConfigs: { "Plot!1": firstPlotConfig, "Plot!2": secondPlotConfig },
      }).configs;
      const newIdForFirstPlot = configsSaved[0].id;
      expect(configsSaved[0].config).toEqual(firstPlotConfig);
      expect(getPanelTypeFromId(newIdForFirstPlot)).not.toEqual("Plot!1");
      expect(getPanelTypeFromId(newIdForFirstPlot)).toEqual("Plot");

      const newIdForSecondPlot = configsSaved[1].id;
      expect(configsSaved[1].config).toEqual(secondPlotConfig);
      expect(getPanelTypeFromId(newIdForFirstPlot)).not.toEqual("Plot!2");
      expect(getPanelTypeFromId(newIdForSecondPlot)).toEqual("Plot");

      expect(configsSaved[2].config).toEqual({
        tabs: [{ ...tabConfig, layout: { first: newIdForFirstPlot, second: newIdForSecondPlot } }],
      });
      expect(configsSaved[2].id).toEqual("Tab!abc");
    });
    it("works with single panel tab layouts", () => {
      const inputConfig = {
        id: "Tab!7arq0e",
        config: {
          activeTabIdx: 0,
          tabs: [{ title: "1", layout: "DiagnosticSummary!3fktxti" }, { title: "2", layout: null }],
        },
        relatedConfigs: {},
      };
      const { configs } = getSaveConfigsPayloadForAddedPanel(inputConfig);
      expect(inputConfig.config.tabs.length).toEqual(configs[0].config.tabs.length);

      const inputLayout = inputConfig.config.tabs[0].layout;
      const outputLayout = configs[0].config.tabs[0].layout;

      expect(getPanelTypeFromId(inputLayout)).toEqual(getPanelTypeFromId(outputLayout));
      expect(inputLayout).not.toEqual(outputLayout);
    });
    it("works with null tab layouts", () => {
      const originalConfig = {
        id: "Tab!abc",
        config: { tabs: [{ title: "First tab", layout: null }] },
      };
      const { configs } = getSaveConfigsPayloadForAddedPanel({ ...originalConfig, relatedConfigs: {} });
      expect(originalConfig).toEqual(configs[0]);
    });
    it("returns config when there are no related configs", () => {
      const originalConfig = {
        id: "Tab!abc",
        config: { tabs: [{ title: "First tab", layout: null }] },
      };
      const { configs } = getSaveConfigsPayloadForAddedPanel({ ...originalConfig, relatedConfigs: undefined });
      expect(configs.length).toEqual(1);
      expect(originalConfig).toEqual(configs[0]);
    });
  });

  describe("removePanelFromTabPanel", () => {
    it("single panel layout", () => {
      expect(
        removePanelFromTabPanel(
          [],
          {
            activeTabIdx: 0,
            tabs: [{ title: "1", layout: "DiagnosticSummary!3v8mswd" }, { title: "2", layout: null }],
          },
          "Tab!3u9ypnk"
        )
      ).toEqual({
        configs: [
          {
            id: "Tab!3u9ypnk",
            config: { activeTabIdx: 0, tabs: [{ title: "1", layout: null }, { title: "2", layout: null }] },
          },
        ],
      });
    });
    it("multiple panel layout", () => {
      expect(
        removePanelFromTabPanel(
          ["second"],
          {
            activeTabIdx: 0,
            tabs: [
              {
                title: "1",
                layout: {
                  first: "DiagnosticSummary!1x1vwgf",
                  second: "DiagnosticSummary!3v8mswd",
                  direction: "column",
                  splitPercentage: 100,
                },
              },
              { title: "2", layout: null },
            ],
          },
          "Tab!3u9ypnk"
        )
      ).toEqual({
        configs: [
          {
            id: "Tab!3u9ypnk",
            config: {
              activeTabIdx: 0,
              tabs: [{ title: "1", layout: "DiagnosticSummary!1x1vwgf" }, { title: "2", layout: null }],
            },
          },
        ],
      });
    });
  });

  describe("getPanelIdsInsideTabPanels", () => {
    it("gets nothing when no tab panels are specified", () => {
      expect(
        getPanelIdsInsideTabPanels([], {
          "Tab!a": { tabs: [{ layout: "Image!a" }, { layout: { first: "Image!b", second: "RosOut!a" } }] },
          "Image!a": { foo: "bar" },
          "Image!b": { foo: "baz" },
        })
      ).toEqual([]);
    });
    it("gets nested panels in specified tab panels' tabs", () => {
      expect(
        getPanelIdsInsideTabPanels(["Tab!a"], {
          "Tab!a": {
            tabs: [{ layout: "Image!a" }, { layout: { direction: "row", first: "Image!b", second: "RosOut!a" } }],
          },
          "Image!a": { foo: "bar" },
          "Image!b": { foo: "baz" },
        })
      ).toEqual(["Image!a", "Image!b", "RosOut!a"]);
    });
    it("gets nested panels in multiple specified tab panels' tabs", () => {
      expect(
        getPanelIdsInsideTabPanels(["Tab!a", "Tab!b"], {
          "Tab!a": {
            tabs: [{ layout: "Image!a" }, { layout: { direction: "row", first: "Image!b", second: "RosOut!a" } }],
          },
          "Tab!b": { tabs: [{ layout: "Image!c" }, { layout: "Image!d" }] },
          "Image!a": { foo: "bar" },
          "Image!b": { foo: "baz" },
          "Image!c": { foo: "bar" },
          "Image!d": { foo: "baz" },
        })
      ).toEqual(["Image!a", "Image!b", "RosOut!a", "Image!c", "Image!d"]);
    });
  });

  describe("createAddUpdates", () => {
    it("no tabs", () => {
      const layout = "Audio!a";
      expect(updateTree(layout, createAddUpdates(layout, "Global!a", [], "bottom"))).toEqual({
        first: layout,
        second: "Global!a",
        direction: "column",
      });
    });
    it("with Tab panels", () => {
      const layout = { first: "Tab!a", second: "Global!a", direction: "row" };
      expect(updateTree(layout, createAddUpdates(layout, "Audio!a", ["second"], "left"))).toEqual({
        ...layout,
        second: { first: "Audio!a", second: layout.second, direction: "row" },
      });
    });
    it("nested paths", () => {
      const layout = {
        first: "Tab!a",
        second: { first: "Audio!a", second: "Global!a", direction: "column" },
        direction: "row",
      };
      expect(updateTree(layout, createAddUpdates(layout, "Plot!a", ["second", "first"], "left"))).toEqual({
        ...layout,
        second: { ...layout.second, first: { first: "Plot!a", second: layout.second.first, direction: "row" } },
      });
    });
  });

  describe("addPanelToTab", () => {
    it("can add a new panel into a tab config", () => {
      expect(
        addPanelToTab(
          "DiagnosticSummary!30vin8",
          [],
          "bottom",
          {
            activeTabIdx: 0,
            tabs: [{ title: "1", layout: "DiagnosticSummary!3v8mswd" }, { title: "2", layout: null }],
          },
          "Tab!3u9ypnk"
        )
      ).toEqual({
        configs: [
          {
            id: "Tab!3u9ypnk",
            config: {
              activeTabIdx: 0,
              tabs: [
                {
                  title: "1",
                  layout: {
                    first: "DiagnosticSummary!3v8mswd",
                    second: "DiagnosticSummary!30vin8",
                    direction: "column",
                  },
                },
                { title: "2", layout: null },
              ],
            },
          },
        ],
      });
    });
    it("empty tab layout", () => {
      expect(
        addPanelToTab(
          "DiagnosticSummary!4dpz3hc",
          undefined,
          undefined,
          { activeTabIdx: 0, tabs: [{ title: "1", layout: null }] },
          "Tab!3u9ypnk"
        )
      ).toEqual({
        configs: [
          {
            id: "Tab!3u9ypnk",
            config: { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!4dpz3hc" }] },
          },
        ],
      });
    });
    it("no tabs", () => {
      expect(
        addPanelToTab("DiagnosticSummary!48lhb5y", undefined, undefined, { activeTabIdx: -1, tabs: [] }, "Tab!1pyr7sm")
      ).toEqual({
        configs: [
          {
            id: "Tab!1pyr7sm",
            config: { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!48lhb5y" }] },
          },
        ],
      });
    });
    it("no tab layout", () => {
      expect(addPanelToTab("DiagnosticSummary!48lhb5y", undefined, undefined, {}, "Tab!1pyr7sm")).toEqual({
        configs: [
          {
            id: "Tab!1pyr7sm",
            config: { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!48lhb5y" }] },
          },
        ],
      });
    });
  });

  describe("replaceAndRemovePanels", () => {
    it("will replace multiple panel ids with new panel id", () => {
      expect(
        replaceAndRemovePanels(
          { originalId: "OldId!y", newId: "NewId!z", idsToRemove: ["RemoveMe!a", "RemoveMe!b"] },
          {
            direction: "row",
            first: { direction: "row", first: "Dummy!abc", second: "RemoveMe!b" },
            second: {
              direction: "row",
              first: "Dummy!ghi",
              second: { direction: "row", first: "OldId!y", second: "RemoveMe!a" },
            },
          }
        )
      ).toEqual({
        direction: "row",
        first: "Dummy!abc",
        second: { direction: "row", first: "Dummy!ghi", second: "NewId!z" },
      });
    });

    it("will replace whole layout with new panel id if all panels are removed", () => {
      expect(
        replaceAndRemovePanels(
          { originalId: "OldId!y", newId: "NewId!z", idsToRemove: ["RemoveMe!a", "RemoveMe!b"] },
          {
            direction: "row",
            first: "RemoveMe!b",
            second: {
              direction: "row",
              first: "RemoveMe!a",
              second: "OldId!y",
            },
          }
        )
      ).toEqual("NewId!z");
    });
    it("will just remove specified panels if no panel is specified to be replaced", () => {
      expect(
        replaceAndRemovePanels(
          { originalId: "OldId!y", idsToRemove: ["RemoveMe!a", "RemoveMe!b"] },
          {
            direction: "row",
            first: "RemoveMe!b",
            second: {
              direction: "row",
              first: "RemoveMe!a",
              second: "OldId!y",
            },
          }
        )
      ).toEqual(null);
    });

    it("will just remove specified panels if no panel is specified as replacement", () => {
      expect(
        replaceAndRemovePanels(
          { newId: "NewId!z", idsToRemove: ["RemoveMe!a", "RemoveMe!b"] },
          {
            direction: "row",
            first: "RemoveMe!b",
            second: {
              direction: "row",
              first: "RemoveMe!a",
              second: "OldId!y",
            },
          }
        )
      ).toEqual("OldId!y");
    });

    it("will remove whole layout if all panels are removed (without any replacement)", () => {
      expect(
        replaceAndRemovePanels(
          { idsToRemove: ["OldId!y", "RemoveMe!a", "RemoveMe!b"] },
          {
            direction: "row",
            first: "RemoveMe!b",
            second: {
              direction: "row",
              first: "RemoveMe!a",
              second: "OldId!y",
            },
          }
        )
      ).toEqual(null);
    });
    it("will not modify layouts that don't contain panelIdsToRemove", () => {
      const originalLayout = {
        direction: "row",
        first: "RemoveMe!b",
        second: {
          direction: "row",
          first: "RemoveMe!a",
          second: "OldId!y",
        },
      };
      expect(replaceAndRemovePanels({ idsToRemove: ["Missing!a", "Missing!b"] }, originalLayout)).toEqual(
        originalLayout
      );
    });
    it("will return null if all panels are replaced", () => {
      expect(
        replaceAndRemovePanels(
          { originalId: "OldId!y", idsToRemove: ["Remove!a", "Remove!b"] },
          {
            direction: "row",
            first: "Remove!a",
            second: "Remove!b",
          }
        )
      ).toEqual(null);
    });
  });

  describe("updateTabPanelLayout", () => {
    it("correctly updates active tab's layout with single panel", () => {
      expect(updateTabPanelLayout("RosOut!abc", { tabs: [{ title: "A", layout: null }], activeTabIdx: 0 })).toEqual({
        activeTabIdx: 0,
        tabs: [{ layout: "RosOut!abc", title: "A" }],
      });
      expect(
        updateTabPanelLayout("RosOut!abc", {
          tabs: [{ title: "A", layout: null }, { title: "B", layout: "RosOut!def" }],
          activeTabIdx: 1,
        })
      ).toEqual({ activeTabIdx: 1, tabs: [{ title: "A", layout: null }, { layout: "RosOut!abc", title: "B" }] });
    });
    it("correctly updates active tab's layout with multiple panels", () => {
      const newLayout = { first: "RosOut!abc", second: "Audio!abc", direction: "row" };
      expect(updateTabPanelLayout(newLayout, { tabs: [{ title: "A", layout: null }], activeTabIdx: 0 })).toEqual({
        activeTabIdx: 0,
        tabs: [{ layout: newLayout, title: "A" }],
      });
      expect(
        updateTabPanelLayout(newLayout, {
          tabs: [{ title: "A", layout: null }, { title: "B", layout: "RosOut!def" }],
          activeTabIdx: 1,
        })
      ).toEqual({ activeTabIdx: 1, tabs: [{ title: "A", layout: null }, { layout: newLayout, title: "B" }] });
    });
    it("creates a new tab if there isn't one active", () => {
      expect(updateTabPanelLayout("RosOut!abc", { tabs: [], activeTabIdx: -1 })).toEqual({
        activeTabIdx: 0,
        tabs: [{ layout: "RosOut!abc", title: "1" }],
      });
    });
  });

  describe("reorderTabWithinTabPanel", () => {
    it("moves tab before and after other tabs", () => {
      const source = { panelId: "Tab!a", tabIndex: 1 };
      const target = { panelId: "Tab!a", tabIndex: 2 };
      const savedProps = {
        "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "B" }, { title: "C" }] },
      };
      const resultConfig = { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "C" }, { title: "B" }] };
      const moveAfterConfigs = reorderTabWithinTabPanel({ source, target, savedProps }).configs;
      expect(moveAfterConfigs.length).toEqual(1);
      expect(moveAfterConfigs[0]).toEqual({ config: resultConfig, id: "Tab!a" });

      const moveBeforeConfigs = reorderTabWithinTabPanel({ source: target, target: source, savedProps }).configs;
      expect(moveBeforeConfigs.length).toEqual(1);
      expect(moveBeforeConfigs[0]).toEqual({ config: resultConfig, id: "Tab!a" });
    });
  });

  describe("moveTabBetweenTabPanels", () => {
    it("moves tab to another Tab panel", () => {
      const source = { panelId: "Tab!a", tabIndex: 1 };
      const target = { panelId: "Tab!b", tabIndex: 1 };
      const savedProps = {
        "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "B" }, { title: "C" }] },
        "Tab!b": { activeTabIdx: 0, tabs: [{ title: "D" }, { title: "E" }, { title: "F" }] },
      };
      const resultConfigs = moveTabBetweenTabPanels({ source, target, savedProps }).configs;
      expect(resultConfigs.length).toEqual(2);
      expect(resultConfigs[0]).toEqual({
        config: { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "C" }] },
        id: "Tab!a",
      });
      expect(resultConfigs[1]).toEqual({
        config: { activeTabIdx: 0, tabs: [{ title: "D" }, { title: "B" }, { title: "E" }, { title: "F" }] },
        id: "Tab!b",
      });
    });
  });

  describe("validateTabPanelConfig", () => {
    it("verifies whether a tab panel config is valid", () => {
      const tabs = [{ title: "First Tab", layout: "RawMessages!a" }];
      expect(validateTabPanelConfig({ tabs })).toEqual(false);
      expect(validateTabPanelConfig({ tabs, activeTabIdx: 1 })).toEqual(false);
      expect(validateTabPanelConfig({ activeTabIdx: 1 })).toEqual(false);
      expect(validateTabPanelConfig({ tabs, activeTabIdx: 0 })).toEqual(true);
    });
  });

  describe("getLayoutPatch", () => {
    it("gets the diff between 2 panel states", () => {
      expect(
        getLayoutPatch(
          {
            layout: "abc",
            globalVariables: { globalVar1: 1, globalVar2: 2 },
            linkedGlobalVariables: [],
            playbackConfig: { speed: 0.2, messageOrder: "receiveTime" },
            userNodes: {},
            savedProps: {},
          },
          {
            layout: "def",
            globalVariables: { globalVar1: 1, globalVar3: 3 },
            linkedGlobalVariables: [],
            playbackConfig: { speed: 0.5, messageOrder: "receiveTime" },
            userNodes: {},
            savedProps: {},
          }
        )
      ).toEqual(
        '{"layout":["abc","def"],"globalVariables":{"globalVar2":[2,0,0],"globalVar3":[3]},"playbackConfig":{"speed":[0.2,0.5]}}'
      );
    });
  });

  describe("getUpdatedURLWithDecodedLayout", () => {
    const layoutParams = "?layout=foo%401500000000&randomKey=randomValue";
    const layoutParamsDecoded = "?layout=foo@1500000000&randomKey=randomValue";
    expect(getUpdatedURLWithDecodedLayout(new URLSearchParams(layoutParams))).toMatch(layoutParamsDecoded);
    expect(getUpdatedURLWithDecodedLayout(new URLSearchParams(layoutParamsDecoded))).toMatch(layoutParamsDecoded);

    const layoutUrlParams = "?layout-url=https%3A%2F%2Ffoo%40bar.com&randomKey=randomValue";
    const layoutUrlParamsDecoded = "?layout-url=https://foo@bar.com&randomKey=randomValue";
    expect(getUpdatedURLWithDecodedLayout(new URLSearchParams(layoutUrlParams))).toMatch(layoutUrlParamsDecoded);
    expect(getUpdatedURLWithDecodedLayout(new URLSearchParams(layoutUrlParamsDecoded))).toMatch(layoutUrlParamsDecoded);
  });

  describe("getUpdatedURLWithPatch", () => {
    it("returns a new URL with the patch attached", () => {
      const compressedPatch = LZString.compressToEncodedURIComponent("somePatch");
      expect(getUpdatedURLWithPatch("?layout=foo&someKey=someVal", "somePatch")).toMatch(
        `?layout=foo&someKey=someVal&patch=${compressedPatch}`
      );
    });
  });

  describe("getUpdatedURLWithNewVersion", () => {
    it("returns a new URL with the version attached", () => {
      const timestampAndPatchHash =
        "1596745459_9c4a1b372d257004f40918022d87d3ae0fa3bf871116516ec0cbc010bd67ce83&patch=N4IgNghgng9grgFxALgNogMwBEAEAFCAOwFMwBCAcwzgEYAzADxABpQATASwCdiBjBDjEIoQXGAHcWIOtwDOSZCAAq4mFg4BbYoVmDCEMHjAwEZDAAYAblzYYMU2XyFsR2fEVKVq9JgF8Aur5AA";
      expect(getUpdatedURLWithNewVersion("?layout=foo&patch=somePatch", "bar", timestampAndPatchHash)).toMatch(
        `?layout=bar@${timestampAndPatchHash}`
      );
    });
  });
});
