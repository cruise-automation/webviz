// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MemoryDataProvider from "webviz-core/src/dataProviders/MemoryDataProvider";
import NodePlaygroundDataProvider from "webviz-core/src/dataProviders/NodePlaygroundDataProvider";
import ParseMessagesDataProvider from "webviz-core/src/dataProviders/ParseMessagesDataProvider";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import exampleDatatypes from "webviz-core/src/players/UserNodePlayer/nodeTransformerWorker/fixtures/example-datatypes.json";
import { Sources, DiagnosticSeverity, ErrorCodes } from "webviz-core/src/players/UserNodePlayer/types";
import MockUserNodePlayerWorker from "webviz-core/src/players/UserNodePlayer/worker.mock";
import { wrapMessages } from "webviz-core/src/test/datatypes";
import { getSourceData } from "webviz-core/src/util/binaryObjects/messageDefinitionUtils";
import {
  $WEBVIZ_SOURCE_2,
  DEFAULT_WEBVIZ_NODE_PREFIX,
  FUTURE_VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY,
} from "webviz-core/src/util/globalConstants";
import invariant from "webviz-core/src/util/invariant";

const nodeId = "nodeId";

const nodeUserCode = `
  export const inputs = ["/np_input"];
  export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
  let lastStamp, lastReceiveTime;
  export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } => {
    return { custom_np_field: "abc", value: message.message.payload };
  };
`;

const nodeUserCodeWithPointClouds = `
  import { convertToRangeView } from "./pointClouds";
  import { RGBA } from "./types";
  export const inputs = ["/np_input"];
  export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
  export default (message: { message: { payload: string } }): RGBA => {
    const colors = convertToRangeView([{x:0.1, y:0.2, z:0.3}], 0.4, true);
    return colors[0];
  };
`;

const nodeUserCodeWithGlobalVars = `
  export const inputs = ["/np_input"];
  export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
  let lastStamp, lastReceiveTime;
  type GlobalVariables = { globalValue: string };
  export default (message: { message: { payload: string } }, globalVars: GlobalVariables): { custom_np_field: string, value: string } => {
    return { custom_np_field: globalVars.globalValue, value: globalVars.globalValue };
  };
`;

const nodeUserCodeWithLogAndError = `
  export const inputs = ["/np_input"];
  export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
  export default (message: { message: { payload: string } }): { success: boolean } => {
    if (message.message.payload === "bar") {
      log('Running. Will fail.');
      throw new Error("Error!");
    }
    log('Running. Will succeed.');
    return { success: true };
  };
`;

const upstreamMessages = [
  { topic: "/np_input", message: { payload: "bar" }, receiveTime: { sec: 1, nsec: 0 } },
  { topic: "/np_input", message: { payload: "baz" }, receiveTime: { sec: 2, nsec: 0 } },
];

const NP_INPUT_PARSED_MESSAGE_DEFINITIONS = [
  {
    name: "n/Input",
    definitions: [{ name: "payload", type: "string", isComplex: false, isArray: false }],
  },
];

const basicDatatypes = getGlobalHooks().getBasicDatatypes();

const getProvider = ({
  messages = upstreamMessages,
  userNodes = {},
  globalVariables = {},
  extraDatatypes = {},
  parsedMessageDefinitionsByTopic = { "/np_input": NP_INPUT_PARSED_MESSAGE_DEFINITIONS },
  topics = [{ name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" }],
  // ParseMessagesDataProvider filters provider output messages to just requested topics, but the
  // NodePlaygroundDataProvider returns messages from input topics too, so they can be cached.
  // Add a flag to disable this wrapping so that behavior can be tested.
  addParseMessagesDataProvider = true,
} = {}) => {
  const memoryProvider = new MemoryDataProvider({
    messages: { bobjects: wrapMessages(messages), rosBinaryMessages: undefined, parsedMessages: undefined },
    topics,
    datatypes: {
      "n/Input": { name: "n/Input", fields: [{ name: "payload", type: "string", isComplex: false, isArray: false }] },
      ...extraDatatypes,
    },
    parsedMessageDefinitionsByTopic,
  });
  const nodePlaygroundDataProvider = new NodePlaygroundDataProvider(
    { basicDatatypes, userNodes, globalVariables },
    [{ name: "noop", args: {}, children: [] }],
    () => memoryProvider
  );
  const provider = addParseMessagesDataProvider
    ? new ParseMessagesDataProvider({}, [{ name: "noop", args: {}, children: [] }], () => nodePlaygroundDataProvider)
    : nodePlaygroundDataProvider;
  return { provider, memoryProvider };
};

const getExtensionPoint = () => ({
  progressCallback: jest.fn(),
  reportMetadataCallback: jest.fn(),
  notifyPlayerManager: jest.fn(),
  nodePlaygroundActions: {
    setCompiledNodeData: jest.fn(),
    addUserNodeLogs: jest.fn(),
    setUserNodeRosLib: jest.fn(),
  },
});

describe("NodePlaygroundDataProvider", () => {
  describe("default provider behavior", () => {
    it("passes getMessages calls through to the underlying provider", async () => {
      const { provider } = getProvider();
      const initResult = await provider.initialize(getExtensionPoint());
      expect(initResult).toEqual({
        start: { sec: 1, nsec: 0 },
        end: { sec: 2, nsec: 0 },
        messageDefinitions: {
          type: "parsed",
          datatypes: {
            ...basicDatatypes,
            "n/Input": {
              name: "n/Input",
              fields: [{ name: "payload", type: "string", isComplex: false, isArray: false }],
            },
          },
          messageDefinitionsByTopic: {},
          parsedMessageDefinitionsByTopic: {
            "/np_input": [
              { name: "n/Input", definitions: [{ name: "payload", type: "string", isComplex: false, isArray: false }] },
            ],
          },
        },
        providesParsedMessages: true, // wrapped in ParseMessagesDataProvider
        topics: [{ name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" }],
      });
      const messages = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 2, nsec: 0 },
        { parsedMessages: ["/np_input"] }
      );
      invariant(messages.bobjects != null, "requested bobjects");
      expect(messages.parsedMessages).toEqual([
        { topic: "/np_input", message: { payload: "bar" }, receiveTime: { sec: 1, nsec: 0 } },
        { topic: "/np_input", message: { payload: "baz" }, receiveTime: { sec: 2, nsec: 0 } },
      ]);
    });

    it("prefers input datatype definitions to basicDatatypes", async () => {
      const { provider } = getProvider({
        userNodes: { nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } },
        extraDatatypes: { "std_msgs/Header": { name: "std_msgs/Header", fields: [] } },
      });
      const { messageDefinitions } = await provider.initialize(getExtensionPoint());
      invariant(messageDefinitions.type === "parsed", "NP proivder definitions are parsed");
      expect(messageDefinitions.datatypes["std_msgs/Header"]).toEqual({ name: "std_msgs/Header", fields: [] });
    });

    it("includes basicDatatypes in the messageDefinitions", async () => {
      const { provider } = getProvider({
        userNodes: { nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } },
      });
      const { messageDefinitions } = await provider.initialize(getExtensionPoint());
      invariant(messageDefinitions.type === "parsed", "NP proivder definitions are parsed");
      expect(messageDefinitions.datatypes[FUTURE_VISUALIZATION_MSGS$WEBVIZ_MARKER_ARRAY]).not.toEqual(undefined);
    });
  });

  describe("user node behavior", () => {
    it("exposes user node topics when available", async () => {
      const { provider } = getProvider({
        userNodes: { nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } },
      });
      const extensionPoint = getExtensionPoint();
      const initResult = await provider.initialize(extensionPoint);
      expect(initResult).toEqual({
        start: { sec: 1, nsec: 0 },
        end: { sec: 2, nsec: 0 },
        messageDefinitions: {
          type: "parsed",
          datatypes: {
            ...basicDatatypes,
            "n/Input": {
              name: "n/Input",
              fields: [{ name: "payload", type: "string", isComplex: false, isArray: false }],
            },
            "/webviz_node/1": {
              name: "/webviz_node/1",
              fields: [
                { isArray: false, isComplex: false, name: "custom_np_field", type: "string" },
                { isArray: false, isComplex: false, name: "value", type: "string" },
              ],
            },
          },
          messageDefinitionsByTopic: {},
          parsedMessageDefinitionsByTopic: {
            "/np_input": [
              { name: "n/Input", definitions: [{ name: "payload", type: "string", isComplex: false, isArray: false }] },
            ],
            "/webviz_node/1": [
              {
                name: "/webviz_node/1",
                definitions: [
                  { isArray: false, isComplex: false, name: "custom_np_field", type: "string" },
                  { isArray: false, isComplex: false, name: "value", type: "string" },
                ],
              },
            ],
          },
        },
        providesParsedMessages: true, // wrapped in ParseMessagesDataProvider
        topics: [
          { name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" },
          {
            name: "/webviz_node/1",
            datatypeName: "/webviz_node/1",
            datatypeId: "/webviz_node/1",
            inputTopics: ["/np_input"],
          },
        ],
      });
      expect(extensionPoint.nodePlaygroundActions.setCompiledNodeData).toHaveBeenCalledWith({
        nodeId: { diagnostics: [], metadata: { inputTopics: ["/np_input"], outputTopic: "/webviz_node/1" } },
      });
    });

    it("exposes topics when nodes are added after initial construction", async () => {
      const { provider } = getProvider();
      const initResult = await provider.initialize(getExtensionPoint());
      expect(initResult.topics).toEqual([{ name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" }]);
      const setNodesResult = await provider.setUserNodes({
        nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
      });
      expect(setNodesResult).toEqual({
        messageDefinitions: {
          type: "parsed",
          datatypes: {
            ...basicDatatypes,
            "n/Input": {
              name: "n/Input",
              fields: [{ name: "payload", type: "string", isComplex: false, isArray: false }],
            },
            "/webviz_node/1": {
              name: "/webviz_node/1",
              fields: [
                { isArray: false, isComplex: false, name: "custom_np_field", type: "string" },
                { isArray: false, isComplex: false, name: "value", type: "string" },
              ],
            },
          },
          messageDefinitionsByTopic: {},
          parsedMessageDefinitionsByTopic: {
            "/np_input": [
              { name: "n/Input", definitions: [{ name: "payload", type: "string", isComplex: false, isArray: false }] },
            ],
            "/webviz_node/1": [
              {
                name: "/webviz_node/1",
                definitions: [
                  { isArray: false, isComplex: false, name: "custom_np_field", type: "string" },
                  { isArray: false, isComplex: false, name: "value", type: "string" },
                ],
              },
            ],
          },
        },
        topics: [
          { name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" },
          {
            name: "/webviz_node/1",
            datatypeName: "/webviz_node/1",
            datatypeId: "/webviz_node/1",
            inputTopics: ["/np_input"],
          },
        ],
        topicsToInvalidate: new Set(["/webviz_node/1"]),
      });
    });

    it("does not produce messages from UserNodes if not subscribed to", async () => {
      const { provider } = getProvider({
        userNodes: { nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } },
      });
      await provider.initialize(getExtensionPoint());
      const messages = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 2, nsec: 0 },
        { parsedMessages: ["/np_input"] }
      );
      expect(messages).toEqual({
        parsedMessages: [
          { topic: "/np_input", message: { payload: "bar" }, receiveTime: { sec: 1, nsec: 0 } },
          { topic: "/np_input", message: { payload: "baz" }, receiveTime: { sec: 2, nsec: 0 } },
        ],
        bobjects: [],
      });
    });

    it("produces messages from user input node code with messages produced from underlying provider", async () => {
      const { provider } = getProvider({
        userNodes: { nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } },
      });
      const extensionPoint = getExtensionPoint();
      await provider.initialize(extensionPoint);
      const messages = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 2, nsec: 0 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      expect(messages).toEqual({
        parsedMessages: [
          {
            topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
            message: { value: "bar", custom_np_field: "abc" },
            receiveTime: { sec: 1, nsec: 0 },
          },
          {
            topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
            message: { value: "baz", custom_np_field: "abc" },
            receiveTime: { sec: 2, nsec: 0 },
          },
        ],
        bobjects: [],
      });
      // Should not have called `log`.
      expect(extensionPoint.nodePlaygroundActions.addUserNodeLogs).not.toHaveBeenCalled();
    });

    it("returns messages from node input topics so they can be stored in the memory cache", async () => {
      const { provider } = getProvider({
        userNodes: { nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } },
        addParseMessagesDataProvider: false,
      });
      const extensionPoint = getExtensionPoint();
      await provider.initialize(extensionPoint);
      const messages = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 2, nsec: 0 },
        { bobjects: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      const topics = new Set((messages.bobjects ?? []).map(({ topic }) => topic));
      expect([...topics].sort()).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);
    });

    it("produces bobjects backed by binary data", async () => {
      const { provider } = getProvider({
        userNodes: { nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } },
      });
      await provider.initialize(getExtensionPoint());
      const messages = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 1 },
        { bobjects: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      invariant(messages.bobjects != null, "requested bobjects");
      const { bobjects } = messages;
      expect(bobjects).toHaveLength(1);
      expect(getSourceData(Object.getPrototypeOf((bobjects[0].message: any)).constructor)).toHaveProperty("buffer");
    });

    it("adds to logs even when there is a runtime error", async () => {
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCodeWithLogAndError } },
      });
      const extensionPoint = getExtensionPoint();
      await provider.initialize(extensionPoint);

      await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      await provider.getMessages(
        { sec: 1, nsec: 5e8 + 1 },
        { sec: 2, nsec: 0 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );

      expect(extensionPoint.nodePlaygroundActions.addUserNodeLogs.mock.calls).toEqual([
        [{ [nodeId]: { logs: [{ source: "processMessage", value: "Running. Will fail." }] } }],
        [{ [nodeId]: { logs: [{ source: "processMessage", value: "Running. Will succeed." }] } }],
      ]);
      // Errors are not immediately cleared by successful calls -- they stick around for the user
      // to read.
      expect(extensionPoint.nodePlaygroundActions.setCompiledNodeData).toHaveBeenLastCalledWith({
        [nodeId]: {
          diagnostics: [
            {
              code: ErrorCodes.RUNTIME,
              message: "Error: Error!",
              severity: DiagnosticSeverity.Error,
              source: Sources.Runtime,
            },
          ],
        },
      });
    });

    it("provides access to './pointClouds' library for user input node code", async () => {
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCodeWithPointClouds } },
      });
      await provider.initialize(getExtensionPoint());
      const messages = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );

      expect(messages).toEqual({
        parsedMessages: [
          {
            topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
            receiveTime: { sec: 1, nsec: 0 },
            message: { a: 1, b: 0.7483314773547883, g: 0.7483314773547883, r: 1 },
          },
        ],
        bobjects: [],
      });
    });

    it("skips publishing messages if a node does not produce a message", async () => {
      const unionTypeReturn = `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        let lastStamp, lastReceiveTime;
        export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } | undefined => {
          if (message.message.payload === "bar") {
            return;
          }
          return { custom_np_field: "abc", value: message.message.payload };
        };
      `;

      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: unionTypeReturn } },
      });
      await provider.initialize(getExtensionPoint());
      const messages1 = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      expect(messages1).toEqual({
        bobjects: [],
        parsedMessages: [],
      });
      const messages2 = await provider.getMessages(
        { sec: 1, nsec: 5e8 + 1 },
        { sec: 2, nsec: 0 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      expect(messages2).toEqual({
        bobjects: [],
        parsedMessages: [
          {
            message: { custom_np_field: "abc", value: "baz" },
            topic: "/webviz_node/1",
            receiveTime: { sec: 2, nsec: 0 },
          },
        ],
      });
    });

    it("should error if multiple nodes output to the same topic", async () => {
      const { provider } = getProvider({
        userNodes: {
          [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
          [`${DEFAULT_WEBVIZ_NODE_PREFIX}2`]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}2`, sourceCode: nodeUserCode },
        },
      });
      const extensionPoint = getExtensionPoint();
      const initResult = await provider.initialize(extensionPoint);
      expect(initResult.topics).toEqual([
        { datatypeName: "n/Input", datatypeId: "n/Input", name: "/np_input" },
        {
          datatypeName: "/webviz_node/1",
          datatypeId: "/webviz_node/1",
          name: "/webviz_node/1",
          inputTopics: ["/np_input"],
        },
      ]);
      expect(extensionPoint.nodePlaygroundActions.setCompiledNodeData).toHaveBeenCalledWith({
        [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`]: {
          metadata: { inputTopics: ["/np_input"], outputTopic: "/webviz_node/1" },
          diagnostics: [],
        },
      });
      expect(extensionPoint.nodePlaygroundActions.setCompiledNodeData).toHaveBeenCalledWith({
        [`${DEFAULT_WEBVIZ_NODE_PREFIX}2`]: {
          metadata: { inputTopics: ["/np_input"], outputTopic: "/webviz_node/1" },
          diagnostics: [
            {
              source: Sources.OutputTopicChecker,
              severity: DiagnosticSeverity.Error,
              message: `Output "${DEFAULT_WEBVIZ_NODE_PREFIX}1" must be unique`,
              code: ErrorCodes.OutputTopicChecker.NOT_UNIQUE,
            },
          ],
        },
      });
    });

    it("should handle multiple user nodes", async () => {
      const nodeUserCode2 = nodeUserCode.replace(`${DEFAULT_WEBVIZ_NODE_PREFIX}1`, `${DEFAULT_WEBVIZ_NODE_PREFIX}2`);
      const { provider } = getProvider({
        userNodes: {
          [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode },
          [`${nodeId}2`]: {
            name: `${DEFAULT_WEBVIZ_NODE_PREFIX}2`,
            sourceCode: nodeUserCode2,
          },
        },
      });

      await provider.initialize(getExtensionPoint());
      const messages = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`, `${DEFAULT_WEBVIZ_NODE_PREFIX}2`] }
      );

      expect(messages).toEqual({
        bobjects: [],
        parsedMessages: [
          {
            topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
            receiveTime: { sec: 1, nsec: 0 },
            message: { custom_np_field: "abc", value: "bar" },
          },
          {
            topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}2`,
            receiveTime: { sec: 1, nsec: 0 },
            message: { custom_np_field: "abc", value: "bar" },
          },
        ],
      });
    });

    it("resets user node state on seek", async () => {
      const sourceCode = `
        let innerState = 0;
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        export default (): { innerState: number } => {
          innerState += 1;
          return { innerState };
        };
      `;
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode } },
      });
      await provider.initialize(getExtensionPoint());

      const messages1 = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      expect(messages1).toEqual({
        bobjects: [],
        parsedMessages: [
          { receiveTime: { sec: 1, nsec: 0 }, topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, message: { innerState: 1 } },
        ],
      });

      // Same start/end, should seek/reset
      const messages2 = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      expect(messages2).toEqual({
        bobjects: [],
        parsedMessages: [
          { receiveTime: { sec: 1, nsec: 0 }, topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, message: { innerState: 1 } },
        ],
      });
    });

    it.each([
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          export default (messages: any): { num: number } => {
            if (messages.message) {
              throw new Error("error path");
            }
            return { num: 42 };
          };`,
        error: "Error: error path",
      },
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          export default (messages: any): { num: number } => {
            if (messages.message) {
             const badPropertyAccess = messages.message.message.message;
            }
            return { num: 42 };
          };`,
        error: "TypeError: Cannot read properties of undefined (reading 'message')",
      },
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          const x: any = {};
          const y = x.bad.bad;
          export default (messages: any): { num: number } => {
            return { num: 42 };
          };`,
        error: "TypeError: Cannot read properties of undefined (reading 'bad')",
      },
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          throw "";
          export default (messages: any): { num: number } => {
            return { num: 42 };
          };`,
        error: "Unknown error encountered registering this node.",
      },
      {
        code: `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        export default (messages: any): { num: number } => {
          throw ""
          return { num: 42 };
        };`,
        error: "Unknown error encountered running this node.",
      },

      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
          export default (messages: any): { num: number } => {
          if (messages.message) {
            throw new Error("");
          }
            return { num: 42 };
          };`,
        error: "Error",
      },
      {
        code: `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        if (inputs.length) {
          throw new Error("");
        }
        export default (messages: any): { num: number } => {
          return { num: 42 };
        };`,
        error: "Error",
      },
    ])("records runtime errors in the diagnostics handler", async ({ code, error }) => {
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: code } },
      });
      const extensionPoint = getExtensionPoint();
      const initResult = await provider.initialize(extensionPoint);
      expect(initResult.topics.map(({ name }) => name)).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);

      const messages = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );

      expect(extensionPoint.nodePlaygroundActions.setCompiledNodeData).toHaveBeenCalledWith({
        nodeId: expect.objectContaining({
          diagnostics: [
            {
              source: Sources.Runtime,
              severity: DiagnosticSeverity.Error,
              message: error,
              code: ErrorCodes.RUNTIME,
            },
          ],
        }),
      });
      // Sanity check to ensure none of the user node messages made it through if there was an error.
      expect(messages).toEqual({ parsedMessages: [], bobjects: [] });
    });

    it("properly clears user node registrations", async () => {
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } },
      });
      const initResult = await provider.initialize(getExtensionPoint());

      expect(initResult.topics.map(({ name }) => name)).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);

      const reinitResult = await provider.setUserNodes({});
      expect((reinitResult?.topics ?? []).map(({ name }) => name)).toEqual(["/np_input"]);
    });

    it("properly sets diagnostics when there is an error", async () => {
      const code = `
        export const inputs = ["/np_input"];
        export const output = "/bad_prefix";
        export default (messages: any): any => {};
      `;
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: code } },
      });
      const extensionPoint = getExtensionPoint();
      await provider.initialize(extensionPoint);
      expect(extensionPoint.nodePlaygroundActions.setCompiledNodeData).toHaveBeenCalledWith({
        nodeId: {
          metadata: { inputTopics: [], outputTopic: "/bad_prefix" },
          diagnostics: [
            {
              severity: DiagnosticSeverity.Error,
              message: expect.any(String),
              source: Sources.OutputTopicChecker,
              code: ErrorCodes.OutputTopicChecker.BAD_PREFIX,
            },
          ],
        },
      });
    });
  });

  describe("user logging", () => {
    it("records logs in the logs handler", async () => {
      const code = `
        import { Time } from "ros";
        type InputTopicMsg = {header: {stamp: Time}};
        type Marker = {};
        type MarkerArray = { markers: Marker[] }

        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        const publisher = (message: { message: any }): MarkerArray => {
          log("inside publisher", message.message);
          return { markers: [] };
        };

        log(50, "ABC", null, undefined, 5 + 5);
        log({ "abc": 2, "def": false, });
        const add = (a: number, b: number): number => a + b;
        log("SUM: " + add(1, 2));

        export default publisher;
      `;

      const logs = [
        [
          { source: "registerNode", value: 50 },
          { source: "registerNode", value: "ABC" },
          { source: "registerNode", value: null },
          { source: "registerNode", value: undefined },
          { source: "registerNode", value: 10 },
          { source: "registerNode", value: { abc: 2, def: false } },
          { source: "registerNode", value: "SUM: 3" },
        ],
        [
          { source: "processMessage", value: "inside publisher" },
          { source: "processMessage", value: { payload: "bar" } },
        ],
      ];
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}nodeName`, sourceCode: code } },
      });

      const extensionPoint = getExtensionPoint();
      const initResult = await provider.initialize(extensionPoint);
      expect(initResult.topics.map(({ name }) => name)).toEqual(["/np_input", `${DEFAULT_WEBVIZ_NODE_PREFIX}1`]);

      await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      expect(extensionPoint.nodePlaygroundActions.addUserNodeLogs).toHaveBeenCalled();
      expect(extensionPoint.nodePlaygroundActions.addUserNodeLogs.mock.calls).toEqual(
        logs.map((log) => [{ nodeId: { logs: log } }])
      );
    });

    it("does not record logs if there is an error", async () => {
      const code = `
        import { Time, Message } from "ros";
        type InputTopicMsg = {header: {stamp: Time}};
        type Marker = {};
        type MarkerArray = { markers: Marker[] }

        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        const publisher = (message: Message<InputTopicMsg>): MarkerArray => {
          log("inside publisher", message.message);
          return { markers: [] };
        };

        print("HELLO");

        export default publisher;
      `;
      const { provider } = getProvider({
        userNodes: { nodeId: { name: "nodeName", sourceCode: code } },
      });
      const extensionPoint = getExtensionPoint();
      const initResult = await provider.initialize(extensionPoint);
      expect(initResult.topics.map(({ name }) => name)).toEqual(["/np_input"]);
      expect(extensionPoint.nodePlaygroundActions.addUserNodeLogs.mock.calls).toEqual([]);
    });
  });

  describe("datatypes", () => {
    it("updates the extracted datatype on a user code change", async () => {
      const sourceCode = `
        let innerState = 0;
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}innerState";
        export default (): { innerState: number } => {
          innerState += 1;
          return { innerState };
        };
      `;
      const firstName = `${DEFAULT_WEBVIZ_NODE_PREFIX}innerState`;
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: firstName, sourceCode } },
      });

      const initResult = await provider.initialize(getExtensionPoint());
      expect(initResult.topics).toEqual([
        { name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" },
        {
          name: firstName,
          datatypeName: "/webviz_node/innerState",
          datatypeId: "/webviz_node/innerState",
          inputTopics: ["/np_input"],
        },
      ]);

      // Update the name of the node.
      const secondName = `${DEFAULT_WEBVIZ_NODE_PREFIX}state`;
      const secondSourceCode = sourceCode.replace(/innerState/g, "state");
      const updateResult = await provider.setUserNodes({
        [nodeId]: { name: secondName, sourceCode: secondSourceCode },
      });

      expect(updateResult?.topics).toEqual([
        { name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" },
        {
          name: `${DEFAULT_WEBVIZ_NODE_PREFIX}state`,
          datatypeName: `${DEFAULT_WEBVIZ_NODE_PREFIX}state`,
          datatypeId: `${DEFAULT_WEBVIZ_NODE_PREFIX}state`,
          inputTopics: ["/np_input"],
        },
      ]);
    });

    it("uses dynamically generated type definitions", async () => {
      const sourceCode = `
          import { Input, Messages } from 'ros';
          let innerState = 0;
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}state";
          export default (message: Input<"/np_input">): Messages.std_msgs__Header => {
            return { stamp: { sec: 0, nsec: 0 }, seq: 0, frame_id: message.message.payload };
          };
        `;
      const firstName = `${DEFAULT_WEBVIZ_NODE_PREFIX}state`;
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: firstName, sourceCode } },
      });
      const initResult = await provider.initialize(getExtensionPoint());
      expect(initResult.topics).toEqual([
        { name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" },
        {
          name: `${DEFAULT_WEBVIZ_NODE_PREFIX}state`,
          datatypeName: "std_msgs/Header",
          datatypeId: "std_msgs/Header",
          inputTopics: ["/np_input"],
        },
      ]);
    });

    it("gracefully handles races around node changes", async () => {
      const { provider, memoryProvider } = getProvider({
        userNodes: { nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } },
      });
      jest.spyOn(memoryProvider, "getMessages");
      await provider.initialize(getExtensionPoint());

      // Make a few overlapping calls.
      const promise1 = provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      const promise2 = provider.setUserNodes({});
      const promise3 = provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      const [messages1, _, messages2] = await Promise.all([promise1, promise2, promise3]);
      // Node runs normally for the first call.
      expect(messages1.parsedMessages).toHaveLength(1);
      // Node doesn't run for the second call (topic has been removed), but the getMessages call
      // isn't forwarded on to the child provider.
      expect(messages2.parsedMessages).toHaveLength(0);
      expect(memoryProvider.getMessages.mock.calls).toHaveLength(1);
    });

    it("can nest bag datatypes inside object expressions", async () => {
      const sourceCode = `
        import { Input, Messages } from 'ros';
        type Output = { ref: Messages.sensor_msgs__TimeReference };
        let innerState = 0;
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        export default (message: Input<"/np_input">): Output => {
          const { payload } = message.message;
          return {
            ref: {
              header: { frame_id: payload, seq: ++innerState, stamp: message.receiveTime },
              time_ref: message.receiveTime,
              source: message.topic,
            },
          };
        };
      `;
      const { provider } = getProvider({
        userNodes: { nodeId: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode } },
        extraDatatypes: exampleDatatypes,
      });
      const { messageDefinitions } = await provider.initialize(getExtensionPoint());
      invariant(messageDefinitions.type === "parsed", "NP proivder definitions are parsed");
      expect(messageDefinitions.datatypes[`${DEFAULT_WEBVIZ_NODE_PREFIX}1`]).toEqual({
        name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
        fields: [{ name: "ref", type: "sensor_msgs/TimeReference", isComplex: true, isArray: false }],
      });
      expect(messageDefinitions.parsedMessageDefinitionsByTopic[`${DEFAULT_WEBVIZ_NODE_PREFIX}1`]).toEqual([
        {
          name: "/webviz_node/1",
          definitions: [{ name: "ref", type: "sensor_msgs/TimeReference", isComplex: true, isArray: false }],
        },
        {
          name: "sensor_msgs/TimeReference",
          definitions: [
            { name: "header", type: "std_msgs/Header", isComplex: true, isArray: false },
            { name: "time_ref", type: "time", isComplex: false, isArray: false },
            { name: "source", type: "string", isComplex: false, isArray: false },
          ],
        },
        {
          name: "std_msgs/Header",
          definitions: [
            { name: "seq", type: "uint32", isComplex: false, isArray: false },
            { name: "stamp", type: "time", isComplex: false, isArray: false },
            { name: "frame_id", type: "string", isComplex: false, isArray: false },
          ],
        },
      ]);
    });
  });

  describe("global variable behavior", () => {
    it("passes global variables to nodes", async () => {
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCodeWithGlobalVars } },
        globalVariables: { globalValue: "aaa" },
      });
      await provider.initialize(getExtensionPoint());

      const messages1 = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      expect(messages1).toEqual({
        parsedMessages: [
          {
            topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
            receiveTime: { sec: 1, nsec: 0 },
            message: { custom_np_field: "aaa", value: "aaa" },
          },
        ],
        bobjects: [],
      });

      const setGlobalVariablesResult = await provider.setGlobalVariables({ globalValue: "bbb" });
      expect(Array.from(setGlobalVariablesResult?.topicsToInvalidate ?? [])).toEqual([
        `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
      ]);
      const messages2 = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 1, nsec: 5e8 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      expect(messages2).toEqual({
        parsedMessages: [
          {
            topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
            receiveTime: { sec: 1, nsec: 0 },
            message: { custom_np_field: "bbb", value: "bbb" },
          },
        ],
        bobjects: [],
      });
    });
  });

  describe("source two support", () => {
    it("does not support source two if the node uses any source two topics", async () => {
      const nodeUserCodeWithSourceTwoInputs = `
        export const inputs = ["/np_input", "${$WEBVIZ_SOURCE_2}/np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        let lastStamp, lastReceiveTime;
        export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } => {
          return { custom_np_field: "abc", value: message.message.payload };
        };
      `;
      const { provider } = getProvider({
        userNodes: {
          [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCodeWithSourceTwoInputs },
        },
        topics: [
          { name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" },
          { name: `${$WEBVIZ_SOURCE_2}/np_input`, datatypeName: "n/Input", datatypeId: "n/Input" },
        ],
      });
      const { topics } = await provider.initialize(getExtensionPoint());
      expect(topics.map(({ name }) => name)).toEqual([
        "/np_input",
        `${$WEBVIZ_SOURCE_2}/np_input`,
        `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
      ]);
    });

    it("warns if there are topics from source_1 that don't exist in source_2", async () => {
      const sourceCode = `
        export const inputs = ["/np_input", "/another_np_input"];
        export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}1";
        export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } => {
          return { custom_np_field: "abc", value: message.message.payload };
        };
      `;
      const { provider } = getProvider({
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode } },
        topics: [
          { name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" },
          { name: `${$WEBVIZ_SOURCE_2}/np_input`, datatypeName: "n/Input", datatypeId: "n/Input" },
          { name: "/another_np_input", datatypeName: "n/Input", datatypeId: "n/Input" },
        ],
      });
      const extensionPoint = getExtensionPoint();
      const { topics } = await provider.initialize(extensionPoint);
      expect(topics.map(({ name }) => name)).toEqual([
        "/np_input",
        `${$WEBVIZ_SOURCE_2}/np_input`,
        "/another_np_input",
        `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
        `${$WEBVIZ_SOURCE_2}${DEFAULT_WEBVIZ_NODE_PREFIX}1`, // still available -- just a warning
      ]);
      expect(extensionPoint.nodePlaygroundActions.setCompiledNodeData).toHaveBeenCalledWith({
        nodeId: {
          metadata: {
            inputTopics: ["/np_input", "/another_np_input"],
            outputTopic: "/webviz_node/1",
          },
          diagnostics: [
            {
              severity: DiagnosticSeverity.Warning,
              message: `Input "${$WEBVIZ_SOURCE_2}/another_np_input" is not yet available.`,
              source: Sources.InputTopicsChecker,
              code: ErrorCodes.InputTopicsChecker.NO_TOPIC_AVAIL,
            },
          ],
        },
      });
    });

    it("produces messages for multiple sources", async () => {
      const { provider } = getProvider({
        messages: [
          { topic: "/np_input", message: { payload: "bar" }, receiveTime: { sec: 1, nsec: 0 } },
          { topic: `${$WEBVIZ_SOURCE_2}/np_input`, message: { payload: "baz" }, receiveTime: { sec: 2, nsec: 0 } },
        ],
        userNodes: { [nodeId]: { name: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`, sourceCode: nodeUserCode } },
        topics: [
          { name: "/np_input", datatypeName: "n/Input", datatypeId: "n/Input" },
          { name: `${$WEBVIZ_SOURCE_2}/np_input`, datatypeName: "n/Input", datatypeId: "n/Input" },
        ],
        parsedMessageDefinitionsByTopic: {
          "/np_input": NP_INPUT_PARSED_MESSAGE_DEFINITIONS,
          [`${$WEBVIZ_SOURCE_2}/np_input`]: NP_INPUT_PARSED_MESSAGE_DEFINITIONS,
        },
      });
      await provider.initialize(getExtensionPoint());
      const messages = await provider.getMessages(
        { sec: 1, nsec: 0 },
        { sec: 2, nsec: 0 },
        { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}1`, `${$WEBVIZ_SOURCE_2}${DEFAULT_WEBVIZ_NODE_PREFIX}1`] }
      );
      expect(messages).toEqual({
        parsedMessages: [
          {
            topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
            receiveTime: { sec: 1, nsec: 0 },
            message: { custom_np_field: "abc", value: "bar" },
          },
          {
            topic: `${$WEBVIZ_SOURCE_2}${DEFAULT_WEBVIZ_NODE_PREFIX}1`,
            receiveTime: { sec: 2, nsec: 0 },
            message: { custom_np_field: "abc", value: "baz" },
          },
        ],
        bobjects: [],
      });
    });
  });

  describe("node registration caching", () => {
    let provider, getMessages, expectFromSource;
    const callCount = (action) => {
      return MockUserNodePlayerWorker.prototype.messageSpy.mock.calls.filter(([a]) => a === action).length;
    };
    beforeEach(async () => {
      jest.spyOn(MockUserNodePlayerWorker.prototype, "messageSpy");

      provider = getProvider().provider;
      await provider.initialize(getExtensionPoint());

      getMessages = () => {
        return provider.getMessages(
          { sec: 1, nsec: 0 },
          { sec: 1, nsec: 1 },
          { parsedMessages: [`${DEFAULT_WEBVIZ_NODE_PREFIX}0`] }
        );
      };

      expectFromSource = (messages, sourceIndex: number) => {
        expect(messages).toEqual({
          parsedMessages: [
            {
              topic: `${DEFAULT_WEBVIZ_NODE_PREFIX}0`,
              receiveTime: { sec: 1, nsec: 0 },
              message: { key: sourceIndex },
            },
          ],
          bobjects: [],
        });
      };
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    const [userNode0, userNode1, userNode2] = new Array(3).fill().map((_, i) => {
      return {
        name: `${DEFAULT_WEBVIZ_NODE_PREFIX}0`,
        sourceCode: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_WEBVIZ_NODE_PREFIX}0";
          export default (): { key: number } => {
            return { key: ${i} };
          };
        `,
      };
    });

    it("creates node registrations when userNodes change", async () => {
      // New node 0, needs registration
      await provider.setUserNodes({ nodeId0: userNode0 });
      const messages0 = await getMessages();
      expectFromSource(messages0, 0);
      expect(callCount("transform")).toBe(1);

      // New node 1, needs registration
      await provider.setUserNodes({ nodeId1: userNode1 });
      const messages1 = await getMessages();
      expectFromSource(messages1, 1);
      expect(callCount("transform")).toBe(2);

      // Should use cached registration from 0
      await provider.setUserNodes({ nodeId0: userNode0 });
      const messages2 = await getMessages();
      expectFromSource(messages2, 0);
      expect(callCount("transform")).toBe(2); // Still 2

      // Should use cached registration from 1
      await provider.setUserNodes({ nodeId0: userNode0 });
      const messages3 = await getMessages();
      expectFromSource(messages3, 0);
      expect(callCount("transform")).toBe(2); // Still 2

      await provider.setUserNodes({ nodeId2: userNode2 });
      const messages4 = await getMessages();
      expectFromSource(messages4, 2);
      expect(callCount("transform")).toBe(3);

      // We'll still call registerNode and processMessage for every getMessages()
      expect(callCount("registerNode")).toBe(5);
      expect(callCount("addMessages")).toBe(5);
      expect(callCount("processMessages")).toBe(5);
    });
  });
});
