// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { DiagnosticSeverity, Sources, ErrorCodes } from "webviz-core/src/players/UserNodePlayer/types";

export const noFuncError = {
  severity: DiagnosticSeverity.Error,
  message: "No 'default export' function found.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NO_DEFAULT_EXPORT,
};

export const nonFuncError = {
  severity: DiagnosticSeverity.Error,
  message: "The 'default export' must be assigned to a function.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NON_FUNC_DEFAULT_EXPORT,
};

export const badTypeReturnError = {
  severity: DiagnosticSeverity.Error,
  message: "The 'default export' function must return an object type with at least one property.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.BAD_TYPE_RETURN,
};

export const limitedUnionsError = {
  severity: DiagnosticSeverity.Error,
  message: "The 'default export' function can only return union types of the form: 'YourType | undefined'.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.LIMITED_UNIONS,
};

export const unionsError = {
  severity: DiagnosticSeverity.Error,
  message: "Unions are not allowed in return type.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NO_UNIONS,
};

export const functionError = {
  severity: DiagnosticSeverity.Error,
  message: "Functions are not allowed as or in the return type.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NO_FUNCTIONS,
};

export const noTypeLiteralsError = {
  severity: DiagnosticSeverity.Error,
  message: "Type literals are not allowed as or in the return type.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NO_TYPE_LITERALS,
};

export const noIntersectionTypesError = {
  severity: DiagnosticSeverity.Error,
  message: "Type intersections are not allowed as or in the return type.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NO_INTERSECTION_TYPES,
};

export const preferArrayLiteral = {
  severity: DiagnosticSeverity.Error,
  message: "Please use array literal syntax (e.g. 'number[]') instead of the 'Array<number>'.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.PREFER_ARRAY_LITERALS,
};

export const classError = {
  severity: DiagnosticSeverity.Error,
  message: "Classes are not allowed as or in the return type.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NO_CLASSES,
};

export const noTypeOfError = {
  severity: DiagnosticSeverity.Error,
  message: "'typeof' cannot be used as or in the return type",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NO_TYPEOF,
};

export const noTuples = {
  severity: DiagnosticSeverity.Error,
  message: "Tuples are not allowed as types.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NO_TUPLES,
};

export const noNestedAny = {
  severity: DiagnosticSeverity.Error,
  message: "Cannot nest 'any' in the return type.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NO_NESTED_ANY,
};

export const noMappedTypes = {
  severity: DiagnosticSeverity.Error,
  message: "MappedTypes such as Record<Keys,Type> are not supported.",
  source: Sources.DatatypeExtraction,
  code: ErrorCodes.DatatypeExtraction.NO_MAPPED_TYPES,
};
