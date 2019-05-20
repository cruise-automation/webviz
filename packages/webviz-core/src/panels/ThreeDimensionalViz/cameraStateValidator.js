// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  createValidator,
  isNumber,
  isBoolean,
  isNumberArray,
  isOrientation,
  type ValidationResult,
} from "webviz-core/src/components/validator";

const cameraStateValidator = (jsonData: Object = {}): ?ValidationResult => {
  const rules = {
    distance: [isNumber],
    perspective: [isBoolean],
    phi: [isNumber],
    thetaOffset: [isNumber],
    target: [isNumberArray(3)],
    targetOffset: [isNumberArray(3)],
    targetOrientation: [isOrientation],
  };
  const validator = createValidator(rules);
  const result = validator(jsonData);

  return Object.keys(result).length === 0 ? undefined : result;
};

export default cameraStateValidator;
