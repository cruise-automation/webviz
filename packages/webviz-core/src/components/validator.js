// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

type Rules = {
  [name: string]: Function[],
};

function isEmpty(value: any) {
  return value == null;
}

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

export type ValidationResult = {
  [fieldName: string]: string,
};

export const validationErrorToString = (validationResult: ValidationResult): string =>
  Object.keys(validationResult)
    .map((key) => `${key}: ${validationResult[key]}`)
    .join(", ");
