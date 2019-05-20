// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cameraStateValidator from "./cameraStateValidator";

describe("cameraStateValidator", () => {
  it("returns no error for empty object input", () => {
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
