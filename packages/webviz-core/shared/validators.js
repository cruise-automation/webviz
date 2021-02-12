// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { isEqual } from "lodash";

type Rule = (value: any) => ?string;
type Rules = {
  [name: string]: ((value: any) => ?string)[],
};

const layoutNameRegex = /[@%]/; // Don't allow these characters in layoutName.

function isEmpty(value: any) {
  return value == null;
}

export const isEmail = (value: any): boolean => {
  const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return !isEmpty(value) && regex.test(value);
};

export const isRequired = (value: any): ?string => (value == null ? "is required" : undefined);

export const isNumber = (value: any): ?string =>
  !isEmpty(value) && typeof value !== "number" ? "must be a number" : undefined;

export const isBoolean = (value: any): ?string =>
  !isEmpty(value) && typeof value !== "boolean" ? `must be "true" or "false"` : undefined;

export const isNumberArray = (expectArrLen: number = 0) => (value: any): ?string => {
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

export const isOrientation = (value: any): ?string => {
  const isNumberArrayErr = isNumberArray(4)(value);
  if (isNumberArrayErr) {
    return isNumberArrayErr;
  }
  if (value) {
    const quaternionSum = value.reduce((memo, item) => memo + item * item, 0);
    // Very rough validation to make sure the quaternion numbers are not too far off
    if (Math.abs(quaternionSum - 1) > 0.1) {
      return "must be valid quaternion";
    }
  }
};

export const isString = (value: any): ?string => (typeof value !== "string" ? "must be string" : undefined);

export const minLen = (minLength: number = 0) => (value: any): ?string => {
  if (Array.isArray(value)) {
    return value.length < minLength
      ? `must contain at least ${minLength} array ${minLength === 1 ? "item" : "items"}`
      : undefined;
  } else if (typeof value === "string") {
    return value.length < minLength
      ? `must contain at least ${minLength} ${minLength === 1 ? "character" : "characters"}`
      : undefined;
  }
};

export const maxLen = (maxLength: number = 0) => (value: any): ?string => {
  if (Array.isArray(value)) {
    return value.length > maxLength ? `must contain at most ${maxLength} array items` : undefined;
  } else if (typeof value === "string") {
    return value.length > maxLength ? `must contain at most ${maxLength} characters` : undefined;
  }
};

export const hasLen = (len: number = 0) => (value: string | any[]): ?string => {
  if (Array.isArray(value)) {
    return value.length !== len
      ? `must contain exact ${len} array items (current item count: ${value.length})`
      : undefined;
  } else if (typeof value === "string") {
    return value.length !== len ? `must contain ${len} characters (current count: ${value.length})` : undefined;
  }
};

export const isNotPrivate = (value: any): ?string =>
  typeof value !== "string" && value.startsWith("_") ? "must not start with _" : undefined;

// return the first error
const join = (rules) => (value) => rules.map((rule) => rule(value)).filter((error) => !!error)[0];

export const getWebsocketUrlError = (websocketUrl: string) => {
  return `"${websocketUrl}" is an invalid WebSocket URL`;
};
export const isWebsocketUrl = (value: string): ?string => {
  const pattern = new RegExp(`wss?://[a-z.-_\\d]+(:(d+))?`, "gi");
  if (!pattern.test(value)) {
    return getWebsocketUrlError(value);
  }
};

export const createValidator = (rules: Rules) => {
  return (data: any = {}): { [field: string]: string } => {
    const errors = {};
    Object.keys(rules).forEach((key) => {
      // concat enables both functions and arrays of functions
      const rule = join([].concat(rules[key]));
      const error = rule(data[key]);
      if (error) {
        errors[key] = error;
      }
    });
    return errors;
  };
};

export const createPrimitiveValidator = (rules: Rule[]) => {
  return (data: any): ?string => {
    for (let i = 0; i < rules.length; i++) {
      const error = rules[i](data);
      if (error) {
        return error;
      }
    }
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

const isXYPointArray = (value: any): ?string => {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || item.x == null || item.y == null) {
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

const isPolygons = (value: any): ?string => {
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

export const getLayoutNameError = (layoutName: string) => {
  return `"${layoutName}" is an invalid layout name. Layout name cannot contain @, %, or spaces`;
};
const isLayoutName = (value: string): ?string => {
  const pattern = new RegExp(layoutNameRegex);
  if (pattern.test(value)) {
    return getLayoutNameError(value);
  }
};

export const layoutNameValidator = createPrimitiveValidator([minLen(1), maxLen(120), isLayoutName]);
