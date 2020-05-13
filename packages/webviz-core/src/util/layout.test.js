// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  getPanelTypeFromId,
  getSaveConfigsPayloadForNewTab,
  removePanelFromTabPanel,
  getPanelIdsInsideTabPanels,
  getTreeFromMovePanel,
  addPanelToTab,
  replacePanelsWithNewPanel,
  updateTabPanelLayout,
  groupPanelsOutput,
  createTabsOutput,
  selectPanelOutput,
  onNewPanelDrop,
  validateTabPanelConfig,
} from "./layout";
import { TAB_PANEL_TYPE } from "webviz-core/src/util/globalConstants";

describe("layout", () => {
  describe("getSaveConfigsPayloadForNewTab", () => {
    it("properly map template panel IDs to new IDs when adding a Tab panel", () => {
      const tabConfig = { title: "First tab", layout: { first: "Plot!1", second: "Plot!2" } };
      const firstPlotConfig = { paths: ["/abc"] };
      const secondPlotConfig = { paths: ["/def"] };
      const configsSaved = getSaveConfigsPayloadForNewTab({
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
      const { configs } = getSaveConfigsPayloadForNewTab(inputConfig);
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
      const { configs } = getSaveConfigsPayloadForNewTab({ ...originalConfig, relatedConfigs: {} });
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

  describe("getTreeFromMovePanel", () => {
    it("no tabs", () => {
      expect(getTreeFromMovePanel("DiagnosticSummary!30vin8", [], "bottom", "DiagnosticSummary!3v8mswd")).toEqual({
        first: "DiagnosticSummary!3v8mswd",
        second: "DiagnosticSummary!30vin8",
        direction: "column",
      });
    });
    it("with tab panels", () => {
      expect(
        getTreeFromMovePanel("DiagnosticSummary!3v8mswd", ["second"], "left", {
          first: "Tab!3u9ypnk",
          second: "DiagnosticSummary!1c6n55t",
          direction: "row",
        })
      ).toEqual({
        first: "Tab!3u9ypnk",
        second: { first: "DiagnosticSummary!3v8mswd", second: "DiagnosticSummary!1c6n55t", direction: "row" },
        direction: "row",
      });
    });
    it("nested paths", () => {
      expect(
        getTreeFromMovePanel("DiagnosticSummary!3v8mswd", ["second", "first"], "left", {
          first: "Tab!3u9ypnk",
          second: { first: "DiagnosticSummary!g24eyn", second: "DiagnosticSummary!1c6n55t", direction: "column" },
          direction: "row",
        })
      ).toEqual({
        first: "Tab!3u9ypnk",
        second: {
          first: { first: "DiagnosticSummary!3v8mswd", second: "DiagnosticSummary!g24eyn", direction: "row" },
          second: "DiagnosticSummary!1c6n55t",
          direction: "column",
        },
        direction: "row",
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

  describe("replacePanelsWithNewPanel", () => {
    it("will replace multiple panel ids with new panel id", () => {
      expect(
        replacePanelsWithNewPanel("OldId!y", "NewId!z", ["OldId!y", "RemoveMe!a", "RemoveMe!b"], {
          direction: "row",
          first: { direction: "row", first: "Dummy!abc", second: "RemoveMe!b" },
          second: {
            direction: "row",
            first: "Dummy!ghi",
            second: { direction: "row", first: "OldId!y", second: "RemoveMe!a" },
          },
        })
      ).toEqual({
        direction: "row",
        first: "Dummy!abc",
        second: { direction: "row", first: "Dummy!ghi", second: "NewId!z" },
      });
    });

    it("will replace whole layout with new panel id if all panels are removed", () => {
      expect(
        replacePanelsWithNewPanel("OldId!y", "NewId!z", ["OldId!y", "RemoveMe!a", "RemoveMe!b"], {
          direction: "row",
          first: "RemoveMe!b",
          second: {
            direction: "row",
            first: "RemoveMe!a",
            second: "OldId!y",
          },
        })
      ).toEqual("NewId!z");
    });
    it("will just remove specified panels if no panel is specified to be replaced", () => {
      expect(
        replacePanelsWithNewPanel("OldId!y", null, ["RemoveMe!a", "RemoveMe!b"], {
          direction: "row",
          first: "RemoveMe!b",
          second: {
            direction: "row",
            first: "RemoveMe!a",
            second: "OldId!y",
          },
        })
      ).toEqual("OldId!y");
    });

    it("will just remove specified panels if no panel is specified as replacement", () => {
      expect(
        replacePanelsWithNewPanel(null, "NewId!z", ["RemoveMe!a", "RemoveMe!b"], {
          direction: "row",
          first: "RemoveMe!b",
          second: {
            direction: "row",
            first: "RemoveMe!a",
            second: "OldId!y",
          },
        })
      ).toEqual("OldId!y");
    });

    it("will remove whole layout if all panels are removed (without any replacement)", () => {
      expect(
        replacePanelsWithNewPanel(null, null, ["OldId!y", "RemoveMe!a", "RemoveMe!b"], {
          direction: "row",
          first: "RemoveMe!b",
          second: {
            direction: "row",
            first: "RemoveMe!a",
            second: "OldId!y",
          },
        })
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
  });

  describe("groupPanelsOutput", () => {
    it("groups all panels in layout", () => {
      const { tabPanelId, changePanelPayload, saveConfigsPayload } = groupPanelsOutput(
        "ImageViewPanel!1nlmn1h",
        { direction: "row", first: "ImageViewPanel!1nlmn1h", second: "3D Panel!2s67wfv" },
        ["ImageViewPanel!1nlmn1h", "3D Panel!2s67wfv"]
      );

      expect(getPanelTypeFromId(tabPanelId)).toEqual(TAB_PANEL_TYPE);
      expect(
        getPanelTypeFromId(typeof changePanelPayload.layout === "string" ? changePanelPayload.layout : "")
      ).toEqual(TAB_PANEL_TYPE);
      expect(saveConfigsPayload.configs.length).toEqual(1);
      expect(getPanelTypeFromId(saveConfigsPayload.configs[0].id)).toEqual(TAB_PANEL_TYPE);
      expect(saveConfigsPayload.configs[0].config).toEqual({
        tabs: [
          {
            title: "1",
            layout: { direction: "row", first: "ImageViewPanel!1nlmn1h", second: "3D Panel!2s67wfv" },
          },
        ],
        activeTabIdx: 0,
      });
    });
    it("groups some panels in layout", () => {
      const { tabPanelId, changePanelPayload, saveConfigsPayload } = groupPanelsOutput(
        "ImageViewPanel!1nlmn1h",
        {
          direction: "row",
          first: "ImageViewPanel!1nlmn1h",
          second: { direction: "column", first: "RosOut!abc", second: "3D Panel!2s67wfv" },
        },
        ["ImageViewPanel!1nlmn1h", "3D Panel!2s67wfv"]
      );

      expect(tabPanelId.startsWith(TAB_PANEL_TYPE)).toEqual(true);
      expect(
        getPanelTypeFromId(
          changePanelPayload.layout && typeof changePanelPayload.layout.first === "string"
            ? changePanelPayload.layout.first
            : ""
        )
      ).toEqual(TAB_PANEL_TYPE);
      expect(
        changePanelPayload.layout && typeof changePanelPayload.layout.second === "string"
          ? changePanelPayload.layout.second
          : ""
      ).toEqual("RosOut!abc");
      expect(saveConfigsPayload.configs.length).toEqual(1);
      expect(getPanelTypeFromId(saveConfigsPayload.configs[0].id)).toEqual(TAB_PANEL_TYPE);
      expect(saveConfigsPayload.configs[0].config).toEqual({
        tabs: [
          {
            title: "1",
            layout: { direction: "row", first: "ImageViewPanel!1nlmn1h", second: "3D Panel!2s67wfv" },
          },
        ],
        activeTabIdx: 0,
      });
    });
  });

  describe("createTabsOutput", () => {
    it("creates tabs for all panels in layout", () => {
      const output = createTabsOutput(
        "ImageViewPanel!1nlmn1h",
        { direction: "row", first: "ImageViewPanel!1nlmn1h", second: "3D Panel!2s67wfv" },
        ["ImageViewPanel!1nlmn1h", "3D Panel!2s67wfv"]
      );
      expect(getPanelTypeFromId(output.tabPanelId)).toEqual(TAB_PANEL_TYPE);
      expect(
        getPanelTypeFromId(typeof output.changePanelPayload.layout === "string" ? output.changePanelPayload.layout : "")
      ).toEqual(TAB_PANEL_TYPE);
      expect(output.saveConfigsPayload.configs.length).toEqual(1);
      expect(getPanelTypeFromId(output.saveConfigsPayload.configs[0].id)).toEqual(TAB_PANEL_TYPE);
      expect(output.saveConfigsPayload.configs[0].config).toEqual({
        tabs: [
          { title: "ImageViewPanel", layout: "ImageViewPanel!1nlmn1h" },
          { title: "3D Panel", layout: "3D Panel!2s67wfv" },
        ],
        activeTabIdx: 0,
      });
    });
    it("creates tabs for some panels in layout", () => {
      const { tabPanelId, changePanelPayload, saveConfigsPayload } = createTabsOutput(
        "ImageViewPanel!1nlmn1h",
        {
          direction: "row",
          first: "ImageViewPanel!1nlmn1h",
          second: { direction: "column", first: "RosOut!abc", second: "3D Panel!2s67wfv" },
        },
        ["ImageViewPanel!1nlmn1h", "3D Panel!2s67wfv"]
      );

      expect(tabPanelId.startsWith(TAB_PANEL_TYPE)).toEqual(true);
      expect(
        getPanelTypeFromId(
          changePanelPayload.layout && typeof changePanelPayload.layout.first === "string"
            ? changePanelPayload.layout.first
            : ""
        )
      ).toEqual(TAB_PANEL_TYPE);
      expect(
        changePanelPayload.layout && typeof changePanelPayload.layout.second === "string"
          ? changePanelPayload.layout.second
          : ""
      ).toEqual("RosOut!abc");
      expect(saveConfigsPayload.configs.length).toEqual(1);
      expect(getPanelTypeFromId(saveConfigsPayload.configs[0].id)).toEqual(TAB_PANEL_TYPE);
      expect(saveConfigsPayload.configs[0].config).toEqual({
        tabs: [
          { title: "ImageViewPanel", layout: "ImageViewPanel!1nlmn1h" },
          { title: "3D Panel", layout: "3D Panel!2s67wfv" },
        ],
        activeTabIdx: 0,
      });
    });
  });

  describe("selectPanelOutput", () => {
    it("with only config", () => {
      const appLayout = "RosOut!xyz";
      const config = { topicPath: "/abc" };
      const panelToAdd = "RawMessages";
      const { saveConfigsPayload, changePanelPayload } = selectPanelOutput(panelToAdd, appLayout, { config });

      // Verify saveConfigsPayload
      const { configs } = saveConfigsPayload;
      expect(configs.length).toEqual(1);
      const { id, config: firstConfig } = configs[0];

      expect(getPanelTypeFromId(id)).toEqual(panelToAdd);
      expect(firstConfig).toEqual(config);

      // Verify changePanelPayload
      const { layout } = changePanelPayload;
      expect(getPanelTypeFromId(typeof layout.first === "string" ? layout.first : "")).toEqual(panelToAdd);
      expect(typeof layout === "object" ? layout.second : "").toEqual(appLayout);
    });

    it("with both config & related configs", () => {
      const appLayout = "RosOut!xyz";
      const panelInsideTabPanel = "RawMessages";
      const config = { tabs: [{ title: "A", layout: `${panelInsideTabPanel}!abc` }] };
      const panelToAdd = TAB_PANEL_TYPE;
      const { saveConfigsPayload, changePanelPayload } = selectPanelOutput(panelToAdd, appLayout, {
        config,
        relatedConfigs: { [`${panelInsideTabPanel}!abc`]: { topicPath: "/abc" } },
      });

      // Verify saveConfigsPayload
      const { configs } = saveConfigsPayload;
      expect(configs.length).toEqual(2);
      const { id: firstId, config: firstConfig } = configs[0];
      const { id: secondId, config: secondConfig } = configs[1];

      expect(getPanelTypeFromId(firstId)).toEqual(panelInsideTabPanel);
      expect(firstId).not.toEqual(`${panelInsideTabPanel}!abc`);
      expect(firstConfig).toEqual({ topicPath: "/abc" });

      expect(getPanelTypeFromId(secondId)).toEqual(panelToAdd);
      expect(secondConfig?.tabs.length).toEqual(1);
      expect(secondConfig?.tabs[0].title).toEqual("A");
      expect(getPanelTypeFromId(secondConfig?.tabs[0].layout || "")).toEqual(panelInsideTabPanel);
      expect(secondConfig?.tabs[0].layout).not.toEqual(`${panelInsideTabPanel}!abc`);

      // Verify changePanelPayload
      const { layout } = changePanelPayload;
      expect(getPanelTypeFromId(typeof layout.first === "string" ? layout.first : "")).toEqual(panelToAdd);
      expect(typeof layout === "object" ? layout.second : "").toEqual(appLayout);
    });
  });
  describe("onNewPanelDrop", () => {
    it("adds panel to main layout via drop", () => {
      expect(
        onNewPanelDrop({
          layout: "DiagnosticSummary!1nifzfo",
          newPanelType: "DummyPanel",
          destinationPath: [],
          position: "left",
          savedProps: { "DiagnosticSummary!1nifzfo": {} },
          config: undefined,
          relatedConfigs: undefined,
          tabId: undefined,
        })
      ).toEqual({
        saveConfigsPayload: { configs: [] },
        layout: {
          first: expect.stringContaining("DummyPanel!"),
          second: "DiagnosticSummary!1nifzfo",
          direction: "row",
        },
      });
    });
    it("adds a tab panel preset into main layout", () => {
      expect(
        onNewPanelDrop({
          layout: "DiagnosticSummary!1l1ar10",
          newPanelType: "Tab",
          destinationPath: [],
          position: "left",
          savedProps: {},
          tabId: undefined,

          config: {
            tabs: [
              {
                title: "Preset",
                layout: "Plot!1",
              },
            ],
          },
          relatedConfigs: {
            "Plot!1": {},
          },
        })
      ).toEqual({
        saveConfigsPayload: {
          configs: [
            {
              id: expect.stringContaining("Plot!"),
              config: {},
            },
            {
              id: expect.stringContaining("Tab!"),
              config: {
                tabs: [
                  {
                    title: "Preset",
                    layout: expect.stringContaining("Plot!"),
                  },
                ],
              },
            },
          ],
        },
        layout: { first: expect.stringContaining("Tab!"), second: "DiagnosticSummary!1l1ar10", direction: "row" },
      });
    });
    it("adds a panel to an empty tab panel", () => {
      expect(
        onNewPanelDrop({
          newPanelType: "DiagnosticSummary",
          layout: "Tab!10j2f46",
          savedProps: { "Tab!10j2f46": {} },
          tabId: "Tab!10j2f46",
          config: undefined,
          relatedConfigs: undefined,
          destinationPath: undefined,
          position: undefined,
        })
      ).toEqual({
        saveConfigsPayload: {
          configs: [
            {
              id: "Tab!10j2f46",
              config: {
                activeTabIdx: 0,
                tabs: [{ title: "1", layout: expect.stringContaining("DiagnosticSummary!") }],
              },
            },
          ],
        },
        layout: "Tab!10j2f46",
      });
    });
    it("to empty tab panel that has no savedProps", () => {
      expect(
        onNewPanelDrop({
          newPanelType: "DiagnosticSummary",
          layout: "Tab!10j2f46",
          savedProps: {},
          tabId: "Tab!10j2f46",
          config: undefined,
          relatedConfigs: undefined,
          destinationPath: undefined,
          position: undefined,
        })
      ).toEqual({
        saveConfigsPayload: {
          configs: [
            {
              id: "Tab!10j2f46",
              config: {
                activeTabIdx: 0,
                tabs: [{ title: "1", layout: expect.stringContaining("DiagnosticSummary!") }],
              },
            },
          ],
        },
        layout: "Tab!10j2f46",
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
});
