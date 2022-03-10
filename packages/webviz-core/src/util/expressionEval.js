// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import exprEval from "expr-eval";
import microMemoize from "micro-memoize";

function createExpressionEvaluator(expressionStr: string) {
  try {
    const parser = new exprEval.Parser();
    // Replace the expression's OR (||) and (&&) AND operators with the keywords
    // "or" and "and" so expr-eval evaluates them properly
    const expressionClean = expressionStr.replace(/\|\|/g, " or ").replace(/&&/g, " and ");
    const expression = parser.parse(expressionClean);
    return (contextObj) => expression.evaluate(contextObj);
  } catch (e) {
    // Expression parsing errors are ignored
  }
}

export default microMemoize(createExpressionEvaluator, { maxSize: 100 });
