// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { encodeURLQueryParamValue, getPanelTypeFromId, positiveModulo, getSaveConfigsPayloadForTab } from ".";

describe("util", () => {
  describe("encodeURLQueryParamValue()", () => {
    const test = (input, expected) => {
      const output = encodeURLQueryParamValue(input);
      expect(output).toBe(expected);

      // encoded output should be decoded by URLSearchParams as the original value
      const params = new URLSearchParams(`x=${output}`);
      expect(params.get("x")).toBe(input);
    };
    it("escapes disallowed characters", () => {
      test("&#[]%+\\", "%26%23%5B%5D%25%2B%5C");
    });
    it("doesn't escape allowed characters", () => {
      test(":/?@", ":/?@");
      test("-._~!$'()*,;=", "-._~!$'()*,;="); // sub-delims minus & and +
    });
    it("handles giant unicode code points", () => {
      test(String.fromCodePoint(0x10000), "%F0%90%80%80");
    });
  });
  describe("positiveModulo", () => {
    it("returns a positive value between 0 (inclusive) and modulus (exclusive)", () => {
      expect(positiveModulo(0, 10)).toEqual(0);
      expect(positiveModulo(10, 10)).toEqual(0);
      expect(positiveModulo(11, 10)).toEqual(1);
      expect(positiveModulo(21, 10)).toEqual(1);
      expect(positiveModulo(-1, 10)).toEqual(9);
      expect(positiveModulo(-11, 10)).toEqual(9);
    });
  });
  describe("getSaveConfigsPayloadForTab", () => {
    it("properly map template panel IDs to new IDs when adding a Tab panel", () => {
      const tabConfig = { title: "First tab", layout: { first: "Plot!1", second: "Plot!2" } };
      const firstPlotConfig = { paths: ["/abc"] };
      const secondPlotConfig = { paths: ["/def"] };
      const configsSaved = getSaveConfigsPayloadForTab({
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
  });
});
