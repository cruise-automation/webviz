// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { ConditionalFormat } from "webviz-core/src/panels/Table/types";
import { updateConditionalFormat, evaluateCondition, getLastAccessor } from "webviz-core/src/panels/Table/utils";

describe("utils", () => {
  const basicConditionalFormat: ConditionalFormat = {
    comparator: ">",
    primitive: 10,
    color: "red",
  };

  describe("evaluateCondition", () => {
    it("Returns a boolean", () => {
      expect(evaluateCondition(0, "<", 1)).toEqual(true);
      expect(evaluateCondition(0, ">", 1)).toEqual(false);
    });
    it("Works with substring matching", () => {
      expect(evaluateCondition("cruise", "~", "cr")).toEqual(true);
      expect(evaluateCondition("webviz", "~", "cr")).toEqual(false);
    });
  });
  describe("updateConditionalFormat", () => {
    it("Adds a new blank config", () => {
      expect(updateConditionalFormat("", "x", basicConditionalFormat, undefined)).toEqual({
        "": {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      });
      expect(updateConditionalFormat("", "x", basicConditionalFormat, {})).toEqual({
        "": {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      });
    });

    it("Updates the current column's conditional properties", () => {
      const newConditionalFormat = { ...basicConditionalFormat, color: "green" };
      const result = updateConditionalFormat("accessorPath", "x", newConditionalFormat, {
        accessorPath: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      });
      expect(result).toEqual({
        accessorPath: {
          conditionalFormats: {
            x: newConditionalFormat,
          },
        },
      });
    });
    it("Moves the conditional properties to another key", () => {
      const result = updateConditionalFormat("newAccessorPath", "x", basicConditionalFormat, {
        accessorPath: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      });
      expect(result).toEqual({
        newAccessorPath: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      });
    });
    it("Moves the conditional properties to another key and doesn't delete any additional settings", () => {
      const yConditionalFormat = { ...basicConditionalFormat, id: "y" };
      const columnConfigs = {
        accessorPath: {
          conditionalFormats: {
            x: basicConditionalFormat,
            y: yConditionalFormat,
          },
        },
      };
      const result = updateConditionalFormat("newAccessorPath", "x", basicConditionalFormat, columnConfigs);
      expect(result).toEqual({
        newAccessorPath: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
        accessorPath: {
          conditionalFormats: {
            y: yConditionalFormat,
          },
        },
      });
    });
    it("Adds conditional properties to another key", () => {
      const yConditionalFormat = { ...basicConditionalFormat, id: "y" };
      const columnConfigs = {
        accessorPath: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
        accessorPath2: {
          conditionalFormats: {
            y: yConditionalFormat,
          },
        },
      };
      const result = updateConditionalFormat("accessorPath2", "x", basicConditionalFormat, columnConfigs);
      expect(result).toEqual({
        accessorPath2: {
          conditionalFormats: {
            y: yConditionalFormat,
            x: basicConditionalFormat,
          },
        },
      });
    });

    it("Works with bad settings", () => {
      const newConditionalFormat = { ...basicConditionalFormat, color: "green" };
      const result = updateConditionalFormat("accessorPath", "x", newConditionalFormat, {
        accessorPath: {}, // Doesn't include 'conditionalFormats'
      });
      expect(result).toEqual({
        accessorPath: {
          conditionalFormats: {
            x: newConditionalFormat,
          },
        },
      });
    });
    it("Works with non-present column settings", () => {
      const result = updateConditionalFormat("", "x", basicConditionalFormat, undefined);
      expect(result).toEqual({
        [""]: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      });
    });

    it("Works for empty initial settings", () => {
      const result = updateConditionalFormat("", "x", basicConditionalFormat, {});
      expect(result).toEqual({
        [""]: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      });
    });
    it("Updates empty initial settings", () => {
      const result = updateConditionalFormat("accessorPath", "x", basicConditionalFormat, {
        [""]: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      });
      expect(result).toEqual({
        ["accessorPath"]: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      });
    });
    it("Removes the full column config with empty ids", () => {
      const columnConfigs = {
        [""]: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      };
      expect(updateConditionalFormat("", "x", undefined, columnConfigs)).toEqual({});
    });

    it("Removes the full column config", () => {
      const columnConfigs = {
        accessorPath: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      };
      expect(updateConditionalFormat("accessorPath", "x", undefined, columnConfigs)).toEqual({});
    });

    it("Changes the identity on a column config", () => {
      const columnConfigs = {
        accessorPath: {
          conditionalFormats: {
            x: basicConditionalFormat,
          },
        },
      };
      const result = updateConditionalFormat("accessorPath", "x", undefined, columnConfigs);
      expect(result).toEqual({});
      expect(result === columnConfigs).toBeFalsy();
    });

    it("Removes a single property on a column config", () => {
      const columnConfigs = {
        accessorPath: {
          conditionalFormats: {
            x: basicConditionalFormat,
            y: basicConditionalFormat,
          },
        },
      };
      expect(updateConditionalFormat("accessorPath", "x", undefined, columnConfigs)).toEqual({
        accessorPath: {
          conditionalFormats: {
            y: basicConditionalFormat,
          },
        },
      });
    });
  });
  describe("getLastAccessor", () => {
    it("works for dot separated accessor paths", () => {
      expect(getLastAccessor("a")).toEqual("a");
      expect(getLastAccessor("col.a")).toEqual("a");
      expect(getLastAccessor("col.col.a")).toEqual("a");
    });
    it("works for array indices", () => {
      expect(getLastAccessor("a[0]")).toEqual("[0]");
      expect(getLastAccessor("col[0]")).toEqual("[0]");
      expect(getLastAccessor("col[0].col[0]")).toEqual("[0]");
    });
  });
});
