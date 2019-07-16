// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { isEqual } from "lodash";

type Rules = {
  [name: string]: Function[],
};

function isEmpty(value: any) {
  return value == null;
}
export const isRequired = (value: any) => (value == null ? "is required" : undefined);

export const isNumber = (value: any) => (!isEmpty(value) && typeof value !== "number" ? "must be a number" : undefined);
export const isBoolean = (value: any) =>
  !isEmpty(value) && typeof value !== "boolean" ? `must be "true" or "false"` : undefined;

export const isNumberArray = (expectArrLen: number = 0) => (value: any) => {
  if (Array.isArray(value)) {
    if (value.length !== expectArrLen) {
      return `must contain ${expectArrLen} array items`;
    }
    for (const item of value) {
      if (typeof item !== "number") {
        return `must contain only numbers in the array. "${item}" is not a number.`;
      }
    }
  }
};

export const isOrientation = (value: any) => {
  const isNumberArrayErr = isNumberArray(4)(value);
  if (isNumberArrayErr) {
    return isNumberArrayErr;
  }
  if (value) {
    const isValidQuaternion = value.reduce((memo, item) => memo + item * item, 0) === 1;
    if (!isValidQuaternion) {
      return "must be valid quaternion";
    }
  }
};

// return the first error
const join = (rules) => (value, data) => rules.map((rule) => rule(value, data)).filter((error) => !!error)[0];

export const createValidator = (rules: Rules) => {
  return (data: Object = {}) => {
    const errors = {};
    Object.keys(rules).forEach((key) => {
      // concat enables both functions and arrays of functions
      const rule = join([].concat(rules[key]));
      const error = rule(data[key], data);
      if (error) {
        errors[key] = error;
      }
    });
    return errors;
  };
};

export type ValidationResult =
  | string
  | {
      [fieldName: string]: string,
    };

export const validationErrorToString = (validationResult: ValidationResult): string =>
  typeof validationResult === "string"
    ? validationResult
    : Object.keys(validationResult)
        // $FlowFixMe
        .map((key) => `${key}: ${validationResult[key]}`)
        .join(", ");

export const cameraStateValidator = (jsonData: any): ?ValidationResult => {
  const data = typeof jsonData !== "object" ? {} : jsonData;
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
  const result = validator(data);

  return Object.keys(result).length === 0 ? undefined : result;
};

const isXYPointArray = (value: any) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || !item.x || !item.y) {
        return `must contain x and y points`;
      }
      if (typeof item.x !== "number" || typeof item.y !== "number") {
        return `x and y points must be numbers`;
      }
    }
  } else {
    return "must be an array of x and y points";
  }
};

const isPolygons = (value: any) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const error = isXYPointArray(item);
      if (error) {
        return error;
      }
    }
  } else {
    return "must be an array of nested x and y points";
  }
};

// validate the polygons must be a nested array of xy points
export const polygonPointsValidator = (jsonData: any): ?ValidationResult => {
  if (!jsonData || isEqual(jsonData, []) || isEqual(jsonData, {})) {
    return undefined;
  }
  const rules = { polygons: [isPolygons] };
  const validator = createValidator(rules);
  const result = validator({ polygons: jsonData });
  return Object.keys(result).length === 0 ? undefined : result.polygons;
};

export const point2DValidator = (jsonData: any): ?ValidationResult => {
  const data = typeof jsonData !== "object" ? {} : jsonData;
  const rules = { x: [isRequired, isNumber], y: [isRequired, isNumber] };
  const validator = createValidator(rules);
  const result = validator(data);
  return Object.keys(result).length === 0 ? undefined : result;
};
