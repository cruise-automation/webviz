// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { flatten } from "lodash";
import path from "path";

import { type GlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import type { Message } from "webviz-core/src/players/types";
import type {
  ProcessMessageOutput,
  ProcessMessagesOutput,
  RegistrationOutput,
} from "webviz-core/src/players/UserNodePlayer/types";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { BobWriter, getSerializeFunctions } from "webviz-core/src/util/binaryObjects/binaryMessageWriter";
import { DEFAULT_WEBVIZ_NODE_PREFIX } from "webviz-core/src/util/globalConstants";
import { getEventInfos, logEventError } from "webviz-core/src/util/logEvent";

// Each node runtime worker runs one node at a time, hence why we have one
// global declaration of 'nodeCallback'.
let nodeCallback: (message: {}, globalVariables: GlobalVariables) => void | {} = () => {};
const writer = new BobWriter();
let serializeMessage: ?(any) => number;

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

// Exported for tests.
export const requireImplementation = (id: string, projectCode: Map<string, string>) => {
  const requestedFile = `${path.join(DEFAULT_WEBVIZ_NODE_PREFIX, id)}.js`;
  for (const [file, source] of projectCode.entries()) {
    if (requestedFile.endsWith(file)) {
      const sourceExports = {};
      const require = (reqId: string) => requireImplementation(reqId, projectCode);
      // $FlowFixMe
      new Function("exports", "require", source)(sourceExports, require); /* eslint-disable-line no-new-func */
      return sourceExports;
    }
  }
  throw new Error(`User node required unknown module: '${id}'`);
};

export const registerNode = ({
  nodeCode,
  projectCode,
  datatypes,
  datatype,
}: {
  nodeCode: string,
  projectCode: Map<string, string>,
  datatypes: RosDatatypes,
  datatype: string,
}): RegistrationOutput => {
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
  // TODO: Blacklist global methods.
  try {
    const nodeExports = {};

    const require = (id: string) => requireImplementation(id, projectCode);

    // Using new Function in order to execute user-input text in Node Playground as code
    // $FlowFixMe
    new Function("exports", "require", nodeCode)(nodeExports, require); /* eslint-disable-line no-new-func */
    nodeCallback = nodeExports.default;

    try {
      serializeMessage = getSerializeFunctions(datatypes, writer)[datatype];
      writer.reset();
    } catch (e) {
      // A crash here is likely a webviz bug, and not fatal -- we have a fallback codepath. Log the
      // error, but don't notify the user.
      logEventError(getEventInfos().BOBJECT_SERIALIZER_COMPILATION_FAILED, { context: "node_playground" });
    }

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

export const processMessage = ({
  message,
  globalVariables,
  outputTopic,
}: {
  message: Message,
  globalVariables: GlobalVariables,
  outputTopic: string,
}): ProcessMessageOutput => {
  const userNodeLogs = [];
  self.log = function(...args) {
    // recursively check that args do not contain a function declaration
    if (containsFuncDeclaration(args)) {
      const argsToPrint = getArgsToPrint(args);
      throw new Error(`Cannot invoke log() with a function argument (processMessage) - log(${argsToPrint.join(", ")})`);
    }
    userNodeLogs.push(...args.map((value) => ({ source: "processMessage", value })));
  };
  try {
    const newMessage = nodeCallback(message, globalVariables);
    return {
      message: newMessage && { message: newMessage, receiveTime: message.receiveTime, topic: outputTopic },
      error: null,
      userNodeLogs,
    };
  } catch (e) {
    // TODO: Be able to map line numbers from errors.
    const error = e.toString();
    return {
      message: null,
      error: error.length ? error : "Unknown error encountered running this node.",
      userNodeLogs,
    };
  }
};

export const processMessages = ({
  messages,
  globalVariables,
  outputTopic,
}: {
  messages: Message[],
  globalVariables: GlobalVariables,
  outputTopic: string,
}): ProcessMessagesOutput => {
  const results = messages.map((message) => processMessage({ message, globalVariables, outputTopic }));
  const lastError = results
    .map(({ error }) => error)
    .filter(Boolean)
    .pop();
  const logs = flatten(results.map(({ userNodeLogs }) => userNodeLogs));
  const outputMessages = results.map(({ message }) => message).filter(Boolean);
  if (serializeMessage != null) {
    const localSerialize = serializeMessage; // For flow -- stays non-null.
    try {
      const serializedMessages = outputMessages.map(({ message, receiveTime, topic }) => ({
        receiveTime,
        topic,
        offset: localSerialize(message),
      }));
      const { buffer, bigString } = writer.write();
      return {
        error: lastError,
        userNodeLogs: logs,
        binaryData: {
          buffer,
          bigString,
          serializedMessages,
        },
        type: "binary",
      };
    } catch (e) {
      serializeMessage = null; // Do not try to serialize messages again.
      logEventError(getEventInfos().BOBJECT_SERIALIZATION_FAILED, { context: "node_playground" });
      return {
        // One-time error.
        error: "Node output serialization failed. Playback may be slow.",
        userNodeLogs: logs,
        messages: outputMessages,
        type: "parsed",
      };
    }
  }
  return { error: lastError, userNodeLogs: logs, messages: outputMessages, type: "parsed" };
};
