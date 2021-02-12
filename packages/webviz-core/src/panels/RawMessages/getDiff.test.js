// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import getDiff, { diffLabels, diffArrow } from "./getDiff";

const firstObj = { deletedKey: 1, changedKey: 2, unchangedKey: 1, someArray: [1] };
const secondObj = { addedKey: 1, changedKey: 3, unchangedKey: 1, someArray: [1, 2, { key: "value" }] };

const obj1 = { some_id: 1, name: "ONE" };
const obj2 = { some_id: 2, name: "TWO" };
const obj3 = { some_id: 3, name: "THREE" };

describe("getDiff", () => {
  it("diffs single-level objects with added, deleted, changed, and unchanged values", () => {
    expect(getDiff({}, {})).toEqual({});
    expect(getDiff(firstObj, secondObj)).toEqual({
      deletedKey: { [diffLabels.DELETED.labelText]: 1 },
      addedKey: { [diffLabels.ADDED.labelText]: 1 },
      changedKey: { [diffLabels.CHANGED.labelText]: `2 ${diffArrow} 3` },
      someArray: { "1": { [diffLabels.ADDED.labelText]: 2 }, "2": { [diffLabels.ADDED.labelText]: { key: "value" } } },
    });

    // with showFullMessageForDiff set to true
    expect(getDiff(firstObj, secondObj, null, true)).toEqual({
      deletedKey: { [diffLabels.DELETED.labelText]: 1 },
      addedKey: { [diffLabels.ADDED.labelText]: 1 },
      changedKey: { [diffLabels.CHANGED.labelText]: `2 ${diffArrow} 3` },
      unchangedKey: 1,
      someArray: {
        "0": 1,
        "1": { [diffLabels.ADDED.labelText]: 2 },
        "2": { [diffLabels.ADDED.labelText]: { key: "value" } },
      },
    });
  });

  it("diffs nested objects with added, deleted, changed, and unchanged values", () => {
    expect(getDiff({ a: firstObj, b: secondObj, c: secondObj }, { a: secondObj, b: firstObj, c: secondObj })).toEqual({
      a: {
        addedKey: { [diffLabels.ADDED.labelText]: 1 },
        changedKey: { [diffLabels.CHANGED.labelText]: "2 -> 3" },
        deletedKey: { [diffLabels.DELETED.labelText]: 1 },
        someArray: {
          "1": { [diffLabels.ADDED.labelText]: 2 },
          "2": { [diffLabels.ADDED.labelText]: { key: "value" } },
        },
      },
      b: {
        addedKey: { [diffLabels.DELETED.labelText]: 1 },
        changedKey: { [diffLabels.CHANGED.labelText]: "3 -> 2" },
        deletedKey: { [diffLabels.ADDED.labelText]: 1 },
        someArray: {
          "1": { [diffLabels.DELETED.labelText]: 2 },
          "2": { [diffLabels.DELETED.labelText]: { key: "value" } },
        },
      },
    });

    // with showFullMessageForDiff set to true
    expect(
      getDiff({ a: firstObj, b: secondObj, c: secondObj }, { a: secondObj, b: firstObj, c: secondObj }, null, true)
    ).toEqual({
      a: {
        addedKey: { [diffLabels.ADDED.labelText]: 1 },
        changedKey: { [diffLabels.CHANGED.labelText]: "2 -> 3" },
        unchangedKey: 1,
        deletedKey: { [diffLabels.DELETED.labelText]: 1 },
        someArray: {
          "0": 1,
          "1": { [diffLabels.ADDED.labelText]: 2 },
          "2": { [diffLabels.ADDED.labelText]: { key: "value" } },
        },
      },
      b: {
        addedKey: { [diffLabels.DELETED.labelText]: 1 },
        changedKey: { [diffLabels.CHANGED.labelText]: "3 -> 2" },
        unchangedKey: 1,
        deletedKey: { [diffLabels.ADDED.labelText]: 1 },
        someArray: {
          "0": 1,
          "1": { [diffLabels.DELETED.labelText]: 2 },
          "2": { [diffLabels.DELETED.labelText]: { key: "value" } },
        },
      },
      c: {
        addedKey: 1,
        changedKey: 3,
        someArray: {
          "0": 1,
          "1": 2,
          "2": {
            key: "value",
          },
        },
        unchangedKey: 1,
      },
    });
  });

  it("maps to available ID fields", () => {
    expect(getDiff([obj1, obj2], [obj2, obj1])).toEqual([]);
    expect(getDiff([obj1, obj2], [obj3, obj1, obj2])).toEqual([
      { [diffLabels.ADDED.labelText]: { [diffLabels.ID.labelText]: { some_id: 3 }, name: "THREE", some_id: 3 } },
    ]);
    expect(getDiff([obj1, obj2], [obj3, obj1, { ...obj2, name: "XYZ" }])).toEqual([
      {
        [diffLabels.ID.labelText]: { some_id: 2 },
        name: { [diffLabels.CHANGED.labelText]: `"TWO" -> "XYZ"` },
      },
      {
        [diffLabels.ADDED.labelText]: { [diffLabels.ID.labelText]: { some_id: 3 }, name: "THREE", some_id: 3 },
      },
    ]);
    expect(getDiff([obj1, obj2, obj3], [obj1, { ...obj2, name: "XYZ" }])).toEqual([
      {
        [diffLabels.ID.labelText]: { some_id: 2 },
        name: { [diffLabels.CHANGED.labelText]: `"TWO" -> "XYZ"` },
      },
      {
        [diffLabels.DELETED.labelText]: { [diffLabels.ID.labelText]: { some_id: 3 }, name: "THREE", some_id: 3 },
      },
    ]);
  });

  it("does not map ID fields if every object does not have that ID field", () => {
    const newObj2 = { ...obj2 };
    delete newObj2.some_id;
    expect(getDiff([obj1, obj2], [newObj2, obj1])).toEqual({
      "0": {
        name: { [diffLabels.CHANGED.labelText]: '"ONE" -> "TWO"' },
        some_id: { [diffLabels.DELETED.labelText]: 1 },
      },
      "1": {
        name: { [diffLabels.CHANGED.labelText]: '"TWO" -> "ONE"' },
        some_id: { [diffLabels.CHANGED.labelText]: "2 -> 1" },
      },
    });
    expect(getDiff([obj1, obj2], [obj3, obj1, newObj2])).toEqual({
      "0": {
        name: { [diffLabels.CHANGED.labelText]: '"ONE" -> "THREE"' },
        some_id: { [diffLabels.CHANGED.labelText]: "1 -> 3" },
      },
      "1": {
        name: { [diffLabels.CHANGED.labelText]: '"TWO" -> "ONE"' },
        some_id: { [diffLabels.CHANGED.labelText]: "2 -> 1" },
      },
      "2": { WEBVIZ_DIFF___ADDED: { name: "TWO" } },
    });

    expect(getDiff([obj1, obj2], [obj3, obj1, { ...newObj2, name: "XYZ" }])).toEqual({
      "0": {
        name: { [diffLabels.CHANGED.labelText]: '"ONE" -> "THREE"' },
        some_id: { [diffLabels.CHANGED.labelText]: "1 -> 3" },
      },
      "1": {
        name: { [diffLabels.CHANGED.labelText]: '"TWO" -> "ONE"' },
        some_id: { [diffLabels.CHANGED.labelText]: "2 -> 1" },
      },
      "2": { WEBVIZ_DIFF___ADDED: { name: "XYZ" } },
    });
  });

  it("prioritizes 'id' over any other possible ID field", () => {
    expect(getDiff([{ ...obj1, id: "A" }, { ...obj2, id: "B" }], [{ ...obj2, id: "A" }, { ...obj1, id: "B" }])).toEqual(
      [
        {
          [diffLabels.ID.labelText]: { id: "A" },
          name: { [diffLabels.CHANGED.labelText]: '"ONE" -> "TWO"' },
          some_id: { [diffLabels.CHANGED.labelText]: "1 -> 2" },
        },
        {
          [diffLabels.ID.labelText]: { id: "B" },
          name: { [diffLabels.CHANGED.labelText]: '"TWO" -> "ONE"' },
          some_id: { [diffLabels.CHANGED.labelText]: "2 -> 1" },
        },
      ]
    );
  });

  it("falls back to different ID if every object does not have 'id' field", () => {
    expect(getDiff([{ ...obj1, id: "A" }, { ...obj2, id: "B" }], [obj2, { ...obj1, id: "B" }])).toEqual([
      {
        [diffLabels.ID.labelText]: { some_id: 1 },
        id: { [diffLabels.CHANGED.labelText]: '"A" -> "B"' },
      },
      {
        [diffLabels.ID.labelText]: { some_id: 2 },
        id: { [diffLabels.DELETED.labelText]: "B" },
      },
    ]);
  });
});
