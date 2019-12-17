// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import type { ProcessMessageOutput, RegistrationOutput } from "webviz-core/src/players/UserNodePlayer/types";
// Each node runtime worker runs one node at a time, hence why we have one
// global declaration of 'nodeCallback'.
let nodeCallback: (message: {}) => void | {} = () => {};

if (process.env.NODE_ENV === "test") {
  // When in tests, clear out the callback between tests.
  beforeEach(() => {
    nodeCallback = () => {};
  });
}

export const containsFuncDeclaration = (args: any[]) => {
  for (const arg of args) {
    if (typeof arg === "function") {
      return true;
    } else if (arg != null && typeof arg === "object") {
      for (const value of Object.values(arg)) {
        if (containsFuncDeclaration([value])) {
          return true;
        }
      }
    }
  }
  return false;
};

export const stringifyFuncsInObject = (arg: any) => {
  if (typeof arg === "function") {
    return `${arg}`;
  } else if (arg != null && typeof arg === "object") {
    const newArg = { ...arg };
    for (const [key, value] of Object.entries(arg)) {
      newArg[key] = stringifyFuncsInObject(value);
    }
    return newArg;
  }
  return arg;
};

const getArgsToPrint = (args: any[]) => {
  return args.map(stringifyFuncsInObject).map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg));
};

export const registerNode = ({ nodeCode }: { nodeCode: string }): RegistrationOutput => {
  const userNodeLogs = [];
  const userNodeDiagnostics = [];
  self.log = function(...args) {
    // recursively check that args do not contain a function declaration
    if (containsFuncDeclaration(args)) {
      const argsToPrint = getArgsToPrint(args);
      throw new Error(`Cannot invoke log() with a function argument (registerNode) - log(${argsToPrint.join(", ")})`);
    }
    userNodeLogs.push(...args.map((value) => ({ source: "registerNode", value })));
  };
  // TODO: TYPESCRIPT - allow for importing helper functions
  // TODO: Blacklist global methods.
  try {
    const nodeExports = {};

    // Using new Function in order to execute user-input text in Node Playground as code
    // $FlowFixMe
    new Function("exports", nodeCode)(nodeExports); /* eslint-disable-line no-new-func */
    nodeCallback = nodeExports.default;
    return {
      error: null,
      userNodeLogs,
      userNodeDiagnostics,
    };
  } catch (e) {
    const error = e.toString();
    return {
      error: error.length ? error : `Unknown error encountered registering this node.`,
      userNodeLogs,
      userNodeDiagnostics,
    };
  }
};

export const processMessage = ({ message }: { message: {} }): ProcessMessageOutput => {
  const userNodeLogs = [];
  const userNodeDiagnostics = [];
  self.log = function(...args) {
    // recursively check that args do not contain a function declaration
    if (containsFuncDeclaration(args)) {
      const argsToPrint = getArgsToPrint(args);
      throw new Error(`Cannot invoke log() with a function argument (processMessage) - log(${argsToPrint.join(", ")})`);
    }
    userNodeLogs.push(...args.map((value) => ({ source: "processMessage", value })));
  };
  try {
    const newMessage = nodeCallback(message);
    return { message: newMessage, error: null, userNodeLogs, userNodeDiagnostics };
  } catch (e) {
    // TODO: Be able to map line numbers from errors.
    const error = e.toString();
    return {
      message: null,
      error: error.length ? error : "Unknown error encountered running this node.",
      userNodeLogs,
      userNodeDiagnostics,
    };
  }
};
