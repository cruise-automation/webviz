// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { dragHandler } from "webviz-core/src/components/PanelToolbar/MosaicDragHandle";

describe("<MosaicDragHandle />", () => {
  describe("dragHandler", () => {
    describe("main layout", () => {
      it("single panel layotu", () => {
        expect(
          dragHandler({
            mainLayout: "DiagnosticSummary!xl7arp",
            panelId: "DiagnosticSummary!xl7arp",
            savedProps: { "DiagnosticSummary!xl7arp": {} },
            position: "right",
            destinationPath: [],
            ownPath: [],
            sourceTabId: undefined,
            targetTabId: undefined,
          })
        ).toEqual({ layout: "DiagnosticSummary!xl7arp", panelConfigs: { configs: [] } });
      });
      it("within main", () => {
        expect(
          dragHandler({
            mainLayout: {
              direction: "column",
              first: {
                direction: "row",
                first: "DiagnosticSummary!ewrg6v",
                second: "DiagnosticSummary!4ksl8nx",
                splitPercentage: 100,
              },
              second: { direction: "row", first: "DiagnosticSummary!7rr27m", second: "DiagnosticSummary!2gtnqz8" },
            },
            panelId: "DiagnosticSummary!4ksl8nx",
            savedProps: {
              "DiagnosticSummary!ewrg6v": {},
              "DiagnosticSummary!4ksl8nx": {},
              "DiagnosticSummary!7rr27m": {},
              "DiagnosticSummary!2gtnqz8": {},
            },
            position: "left",
            destinationPath: ["first"],
            ownPath: ["first", "second"],
            sourceTabId: undefined,
            targetTabId: undefined,
          })
        ).toEqual({
          panelConfigs: { configs: [] },
          layout: {
            direction: "column",
            first: { first: "DiagnosticSummary!4ksl8nx", second: "DiagnosticSummary!ewrg6v", direction: "row" },
            second: { direction: "row", first: "DiagnosticSummary!7rr27m", second: "DiagnosticSummary!2gtnqz8" },
          },
        });
      });
      it("within main and paths are the same", () => {
        expect(
          dragHandler({
            mainLayout: {
              first: "DiagnosticSummary!7rr27m",
              second: { direction: "column", first: "DiagnosticSummary!ewrg6v", second: "DiagnosticSummary!pm6uyr" },
              direction: "row",
              splitPercentage: 0,
            },
            panelId: "DiagnosticSummary!7rr27m",
            savedProps: {
              "DiagnosticSummary!7rr27m": {},
              "DiagnosticSummary!ewrg6v": {},
              "DiagnosticSummary!pm6uyr": {},
            },
            ownPath: ["first"],
            sourceTabId: undefined,
            targetTabId: undefined,
            destinationPath: undefined,
            position: undefined,
          })
        ).toEqual({
          panelConfigs: { configs: [] },
          layout: {
            first: "DiagnosticSummary!7rr27m",
            second: { direction: "column", first: "DiagnosticSummary!ewrg6v", second: "DiagnosticSummary!pm6uyr" },
            direction: "row",
            splitPercentage: null,
          },
        });
      });
    });
    describe("withinSameTab", () => {
      it("multiple panels", () => {
        expect(
          dragHandler({
            mainLayout: {
              first: "Tab!3u9ypnk",
              second: { first: "DiagnosticSummary!g24eyn", second: "DiagnosticSummary!1c6n55t", direction: "column" },
              direction: "row",
            },
            panelId: "DiagnosticSummary!1x1vwgf",
            savedProps: {
              "DiagnosticSummary!3v8mswd": {},
              "Tab!3u9ypnk": {
                activeTabIdx: 0,
                tabs: [
                  {
                    title: "1",
                    layout: {
                      first: {
                        first: "DiagnosticSummary!grx0wz",
                        second: "DiagnosticSummary!1x1vwgf",
                        direction: "row",
                        splitPercentage: 100,
                      },
                      second: "DiagnosticSummary!3v8mswd",
                      direction: "column",
                    },
                  },
                  { title: "2", layout: null },
                ],
              },
              "DiagnosticSummary!1c6n55t": {},
            },
            sourceTabId: "Tab!3u9ypnk",
            targetTabId: "Tab!3u9ypnk",
            position: "bottom",
            destinationPath: ["second"],
            ownPath: ["first", "second"],
          })
        ).toEqual({
          panelConfigs: {
            configs: [
              {
                id: "Tab!3u9ypnk",
                config: {
                  activeTabIdx: 0,
                  tabs: [
                    {
                      title: "1",
                      layout: {
                        first: "DiagnosticSummary!grx0wz",
                        second: {
                          first: "DiagnosticSummary!3v8mswd",
                          second: "DiagnosticSummary!1x1vwgf",
                          direction: "column",
                        },
                        direction: "column",
                      },
                    },
                    { title: "2", layout: null },
                  ],
                },
              },
            ],
          },
          layout: {
            first: "Tab!3u9ypnk",
            second: { first: "DiagnosticSummary!g24eyn", second: "DiagnosticSummary!1c6n55t", direction: "column" },
            direction: "row",
          },
        });
      });
      it("single panel tab - 'deferredHide' invoked", () => {
        expect(
          dragHandler({
            mainLayout: { direction: "row", first: "Tab!3ku9cen", second: "DiagnosticSummary!46zj5f" },
            panelId: "DiagnosticSummary!1f3nydu",
            savedProps: {
              "Tab!3ku9cen": { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!1f3nydu" }] },
              "DiagnosticSummary!46zj5f": {},
            },
            sourceTabId: "Tab!3ku9cen",
            targetTabId: "Tab!3ku9cen",
            ownPath: [],
            destinationPath: undefined,
            position: undefined,
          })
        ).toEqual({
          layout: { direction: "row", first: "Tab!3ku9cen", second: "DiagnosticSummary!46zj5f" },
          panelConfigs: {
            configs: [
              {
                id: "Tab!3ku9cen",
                config: { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!1f3nydu" }] },
              },
            ],
          },
        });
      });
      it("single tab panel in single panel layout", () => {
        expect(
          dragHandler({
            mainLayout: "Tab!3u9ypnk",
            panelId: "DiagnosticSummary!1x1vwgf",
            savedProps: {
              "Tab!3u9ypnk": {
                activeTabIdx: 0,
                tabs: [{ title: "1", layout: "DiagnosticSummary!1x1vwgf" }, { title: "2", layout: {} }],
              },
            },
            sourceTabId: "Tab!3u9ypnk",
            targetTabId: "Tab!3u9ypnk",
            ownPath: [],
            position: undefined,
            destinationPath: undefined,
          })
        ).toEqual({
          layout: "Tab!3u9ypnk",
          panelConfigs: {
            configs: [
              {
                id: "Tab!3u9ypnk",
                config: {
                  activeTabIdx: 0,
                  tabs: [{ title: "1", layout: "DiagnosticSummary!1x1vwgf" }, { title: "2", layout: {} }],
                },
              },
            ],
          },
        });
      });
      it("single panel tab - 'deferredHide' not invoked", () => {
        expect(
          dragHandler({
            mainLayout: { direction: "row", first: "Tab!3ku9cen", second: "DiagnosticSummary!46zj5f" },
            panelId: "DiagnosticSummary!1f3nydu",
            savedProps: {
              "Tab!3ku9cen": { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!1f3nydu" }] },
              "DiagnosticSummary!46zj5f": {},
            },
            sourceTabId: "Tab!3ku9cen",
            targetTabId: "Tab!3ku9cen",
            position: "right",
            destinationPath: [],
            ownPath: [],
          })
        ).toEqual({
          layout: { direction: "row", first: "Tab!3ku9cen", second: "DiagnosticSummary!46zj5f" },
          panelConfigs: {
            configs: [
              {
                id: "Tab!3ku9cen",
                config: { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!1f3nydu" }] },
              },
            ],
          },
        });
      });
    });
    describe("toMainFromTab", () => {
      it("complex tab layout", () => {
        expect(
          dragHandler({
            mainLayout: { first: "Tab!3u9ypnk", second: "DiagnosticSummary!1c6n55t", direction: "row" },
            panelId: "DiagnosticSummary!1x1vwgf",
            savedProps: {
              "DiagnosticSummary!3v8mswd": {},
              "Tab!3u9ypnk": {
                activeTabIdx: 0,
                tabs: [
                  {
                    title: "1",
                    layout: {
                      first: "DiagnosticSummary!1x1vwgf",
                      second: "DiagnosticSummary!3v8mswd",
                      direction: "column",
                      splitPercentage: 0,
                    },
                  },
                ],
              },
              "DiagnosticSummary!1c6n55t": {},
            },
            sourceTabId: "Tab!3u9ypnk",
            targetTabId: undefined,
            position: "right",
            destinationPath: ["second"],
            ownPath: ["first"],
          })
        ).toEqual({
          panelConfigs: {
            configs: [
              {
                id: "Tab!3u9ypnk",
                config: { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!3v8mswd" }] },
              },
            ],
          },
          layout: {
            first: "Tab!3u9ypnk",
            second: { first: "DiagnosticSummary!1c6n55t", second: "DiagnosticSummary!1x1vwgf", direction: "row" },
            direction: "row",
          },
        });
      });
      it("remove last panel from tab", () => {
        expect(
          dragHandler({
            mainLayout: { first: "Tab!3u9ypnk", second: "DiagnosticSummary!1c6n55t", direction: "row" },
            panelId: "DiagnosticSummary!1x1vwgf",
            savedProps: {
              "Tab!3u9ypnk": { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!1x1vwgf" }] },
              "DiagnosticSummary!1c6n55t": {},
            },
            sourceTabId: "Tab!3u9ypnk",
            targetTabId: undefined,
            position: "top",
            destinationPath: ["second"],
            ownPath: [],
          })
        ).toEqual({
          panelConfigs: {
            configs: [{ id: "Tab!3u9ypnk", config: { activeTabIdx: 0, tabs: [{ title: "1", layout: null }] } }],
          },
          layout: {
            first: "Tab!3u9ypnk",
            second: { first: "DiagnosticSummary!1x1vwgf", second: "DiagnosticSummary!1c6n55t", direction: "column" },
            direction: "row",
          },
        });
      });
    });
    describe("toTabFromMain", () => {
      it("to blank tab panel", () => {
        expect(
          dragHandler({
            mainLayout: {
              first: "Tab!3u9ypnk",
              second: "DiagnosticSummary!1c6n55t",
              direction: "row",
              splitPercentage: 100,
            },
            panelId: "DiagnosticSummary!1c6n55t",
            savedProps: {
              "Tab!3u9ypnk": { activeTabIdx: 0, tabs: [{ title: "1", layout: null }] },
              "DiagnosticSummary!1c6n55t": {},
            },
            targetTabId: "Tab!3u9ypnk",
            ownPath: ["second"],
            destinationPath: undefined,
            sourceTabId: undefined,
            position: undefined,
          })
        ).toEqual({
          panelConfigs: {
            configs: [
              {
                id: "Tab!3u9ypnk",
                config: { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!1c6n55t" }] },
              },
            ],
          },
          layout: "Tab!3u9ypnk",
        });
      });
      it("to existing tab layout", () => {
        expect(
          dragHandler({
            mainLayout: {
              first: "Tab!3u9ypnk",
              second: "DiagnosticSummary!1c6n55t",
              direction: "row",
              splitPercentage: 100,
            },
            panelId: "DiagnosticSummary!1c6n55t",
            savedProps: {
              "DiagnosticSummary!3v8mswd": {},
              "Tab!3u9ypnk": { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!3v8mswd" }] },
              "DiagnosticSummary!1c6n55t": {},
            },
            targetTabId: "Tab!3u9ypnk",
            sourceTabId: undefined,
            position: "left",
            destinationPath: [],
            ownPath: ["second"],
          })
        ).toEqual({
          panelConfigs: {
            configs: [
              {
                id: "Tab!3u9ypnk",
                config: {
                  activeTabIdx: 0,
                  tabs: [
                    {
                      title: "1",
                      layout: {
                        first: "DiagnosticSummary!1c6n55t",
                        second: "DiagnosticSummary!3v8mswd",
                        direction: "row",
                      },
                    },
                  ],
                },
              },
            ],
          },
          layout: "Tab!3u9ypnk",
        });
      });
    });
    describe("toTabFromTab", () => {
      it("single panel layouts", () => {
        expect(
          dragHandler({
            mainLayout: { first: "Tab!3u9ypnk", second: "Tab!1ua3yy", direction: "row" },
            panelId: "DiagnosticSummary!1x1vwgf",
            savedProps: {
              "Tab!3u9ypnk": { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!1x1vwgf" }] },
              "Tab!1ua3yy": { activeTabIdx: 0, tabs: [{ title: "1", layout: "DiagnosticSummary!s1km1j" }] },
              "DiagnosticSummary!s1km1j": {},
              "DiagnosticSummary!22ij09n": {},
            },
            sourceTabId: "Tab!3u9ypnk",
            targetTabId: "Tab!1ua3yy",
            position: "top",
            destinationPath: [],
            ownPath: [],
          })
        ).toEqual({
          panelConfigs: {
            configs: [
              { id: "Tab!3u9ypnk", config: { activeTabIdx: 0, tabs: [{ title: "1", layout: null }] } },
              {
                id: "Tab!1ua3yy",
                config: {
                  activeTabIdx: 0,
                  tabs: [
                    {
                      title: "1",
                      layout: {
                        first: "DiagnosticSummary!1x1vwgf",
                        second: "DiagnosticSummary!s1km1j",
                        direction: "column",
                      },
                    },
                  ],
                },
              },
            ],
          },
          layout: { first: "Tab!3u9ypnk", second: "Tab!1ua3yy", direction: "row" },
        });
      });
    });
  });
});
