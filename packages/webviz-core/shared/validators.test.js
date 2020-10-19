// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  isEmail,
  layoutNameValidator,
  cameraStateValidator,
  polygonPointsValidator,
  point2DValidator,
  isWebsocketUrl,
  getLayoutNameError,
  getWebsocketUrlError,
} from "./validators";

describe("isLayoutName", () => {
  it("validates layoutName", () => {
    expect(layoutNameValidator("")).toBe("must contain at least 1 character");
    expect(
      layoutNameValidator(
        "Labore adipisicing ut eu velit irure voluptate id nulla sunt amet reprehenderit anim. Consequat reprehenderit magna id cillum aute ut Lorem qui duis sunt proident veniam in. Aliquip enim paria"
      )
    ).toBe("must contain at most 120 characters");
    expect(layoutNameValidator("abc@")).toBe(getLayoutNameError("abc@"));
    expect(layoutNameValidator("abc#")).toBe(undefined);
    expect(layoutNameValidator("abc_some-allowed*characters")).toBe(undefined);
  });
});

describe("isEmail", () => {
  it("validates email", () => {
    expect(isEmail()).toBe(false);
    expect(isEmail(1)).toBe(false);
    expect(isEmail("")).toBe(false);
    expect(isEmail("@")).toBe(false);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail("some.one@cruise.com")).toBe(true);
    expect(isEmail("cruise.com@cruise.com")).toBe(true);
    expect(isEmail("a@b.com")).toBe(true);
    expect(isEmail("some_one@cruise.com")).toBe(true);
  });
});

describe("cameraStateValidator", () => {
  it("returns undefined for empty object input", () => {
    const cameraState = {};
    expect(cameraStateValidator(cameraState)).toBe(undefined);
  });
  it("returns error if one field is invalid", () => {
    const cameraState = { distance: "abc" };
    expect(cameraStateValidator(cameraState)).toEqual({
      distance: "must be a number",
    });
  });
  it("returns the first error if one field has multiple errors", () => {
    const cameraState = { targetOrientation: [1, 1, 1] };
    expect(cameraStateValidator(cameraState)).toEqual({
      targetOrientation: "must contain 4 array items",
    });
  });
  it("returns error if the quaternion number sum for targetOrientation is not between 0.9 and 1.1", () => {
    let cameraState = { targetOrientation: [0, 0, 0, 0.94] };
    expect(cameraStateValidator(cameraState)).toEqual({
      targetOrientation: "must be valid quaternion",
    });
    cameraState = { targetOrientation: [0.32, 1, 0, 0] };
    expect(cameraStateValidator(cameraState)).toEqual({
      targetOrientation: "must be valid quaternion",
    });
    cameraState = { targetOrientation: [1.04, 0, 0, 0] };
    expect(cameraStateValidator(cameraState)).toEqual(undefined);
    cameraState = { targetOrientation: [0.95, 0, 0, 0] };
    expect(cameraStateValidator(cameraState)).toEqual(undefined);
  });

  it("returns error if the vec3/vec4 values are set but are invalid", () => {
    const cameraState = { targetOffset: ["invalid"] };
    expect(cameraStateValidator(cameraState)).toEqual({
      targetOffset: "must contain 3 array items",
    });

    const cameraState1 = { targetOffset: [1, 1, "abc"] };
    expect(cameraStateValidator(cameraState1)).toEqual({
      targetOffset: `must contain only numbers in the array. "abc" is not a number.`,
    });

    const cameraState2 = { targetOrientation: [1, 1, 1] };
    expect(cameraStateValidator(cameraState2)).toEqual({
      targetOrientation: "must contain 4 array items",
    });
  });

  it("combines errors from different fields", () => {
    const cameraState = { distance: "abc", targetOffset: [1, 12, "121"], targetOrientation: [1, 1, 1] };
    expect(cameraStateValidator(cameraState)).toEqual({
      distance: "must be a number",
      targetOffset: 'must contain only numbers in the array. "121" is not a number.',
      targetOrientation: "must contain 4 array items",
    });

    const cameraState1 = { distance: "abc", targetOffset: [1, 12, "121"], targetOrientation: [1, 1, 1, 1] };

    expect(cameraStateValidator(cameraState1)).toEqual({
      targetOrientation: "must be valid quaternion",
      distance: "must be a number",
      targetOffset: 'must contain only numbers in the array. "121" is not a number.',
    });
  });
});

describe("polygonPointsValidator", () => {
  it("returns undefined for valid input", () => {
    expect(polygonPointsValidator([[{ x: 1, y: 2 }]])).toEqual(undefined);
  });
  it("returns undefined for null or empty input", () => {
    expect(polygonPointsValidator([])).toEqual(undefined);
    expect(polygonPointsValidator()).toEqual(undefined);
    expect(polygonPointsValidator("")).toEqual(undefined);
    expect(polygonPointsValidator({})).toEqual(undefined);
  });
  it("returns error for non-array input", () => {
    expect(polygonPointsValidator(123)).toEqual("must be an array of nested x and y points");
    expect(polygonPointsValidator([{}])).toEqual("must be an array of x and y points");
  });
  it("returns error for non-number input", () => {
    expect(polygonPointsValidator([[{ x: "1", y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]])).toEqual(
      "x and y points must be numbers"
    );
  });
  it("returns error when missing input for x/y point", () => {
    expect(polygonPointsValidator([[{ y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]])).toEqual("must contain x and y points");
  });
  it("does not return error when the input points have 0 as coordinates", () => {
    expect(polygonPointsValidator([[{ x: 0.000001, y: 0.0 }, { x: 0, y: 0.0 }]])).toEqual(undefined);
  });
});

describe("point2DValidator", () => {
  it("returns undefined for valid input", () => {
    expect(point2DValidator({ x: 1, y: 2 })).toEqual(undefined);
  });
  it("returns error for non-array input", () => {
    expect(point2DValidator({})).toEqual({ x: "is required", y: "is required" });
    expect(point2DValidator()).toEqual({ x: "is required", y: "is required" });
    expect(point2DValidator("")).toEqual({ x: "is required", y: "is required" });
    expect(point2DValidator([])).toEqual({ x: "is required", y: "is required" });
    expect(point2DValidator(123)).toEqual({ x: "is required", y: "is required" });
  });

  it("returns error when x/y field validation fails", () => {
    expect(point2DValidator({ x: 1 })).toEqual({ y: "is required" });
    expect(point2DValidator({ x: "1" })).toEqual({ x: "must be a number", y: "is required" });
    expect(point2DValidator({ x: 1, y: "2" })).toEqual({ y: "must be a number" });
  });
});

describe("isWebsocketUrl", () => {
  it("validates if the input string is websocket url", () => {
    let val = " ";
    expect(isWebsocketUrl(val)).toEqual(getWebsocketUrlError(val));
    val = "ws:";
    expect(isWebsocketUrl(val)).toEqual(getWebsocketUrlError(val));
    expect(isWebsocketUrl("ws://example.com")).toEqual(undefined);
    expect(isWebsocketUrl("wss://example.me")).toEqual(undefined);
    expect(isWebsocketUrl("ws://localhost:3000")).toEqual(undefined);
    expect(isWebsocketUrl("ws://some-desktop:3000")).toEqual(undefined);
    expect(isWebsocketUrl("ws://some_desktop:80")).toEqual(undefined);
    expect(isWebsocketUrl("wss://localhost:3000")).toEqual(undefined);
  });
});
