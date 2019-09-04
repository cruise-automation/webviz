// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

let nodeCallback: (message: {}) => void | {} = () => {};

if (process.env.NODE_ENV === "test") {
  // When in tests, clear out the callback between tests.
  beforeEach(() => {
    nodeCallback = () => {};
  });
}

export const registerNode = ({ nodeCode }: { nodeCode: string }) => {
  // TODO: TYPESCRIPT - allow for importing helper functions
  // TODO: Blacklist global methods.

  // Using new Function in order to execute user-input text in Node Playground as code
  // $FlowFixMe
  nodeCallback = new Function(`const exports = {};\n${nodeCode}\nreturn exports.default`)(); // eslint-disable-line no-new-func
};

export const processMessage = ({ message }: { message: {} }) => {
  return nodeCallback(message);
};
