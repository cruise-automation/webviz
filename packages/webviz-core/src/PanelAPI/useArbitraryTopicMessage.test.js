// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import * as React from "react";

import * as PanelAPI from ".";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import { wrapJsObject } from "webviz-core/src/util/binaryObjects";

describe("useArbitraryTopicMessage", () => {
  // Create a helper component that exposes the results of the hook for mocking.
  function createTest() {
    function Test({ topic }) {
      Test.result(PanelAPI.useArbitraryTopicMessage(topic));
      return null;
    }
    Test.result = jest.fn();
    return Test;
  }

  describe("when preloading from blocks", () => {
    const topics = [
      {
        name: "/foo",
        preloadable: true,
        datatype: "fake",
      },
    ];

    it("returns an empty structure when there are no blocks", async () => {
      const Test = createTest();

      const root = mount(
        <MockMessagePipelineProvider topics={topics}>
          <Test topic={"/foo"} />
        </MockMessagePipelineProvider>
      );

      expect(Test.result.mock.calls).toEqual([[undefined]]);

      root.unmount();
    });

    it("handles uninitialized block states", async () => {
      // Note: progress.blocks.map() does not iterate over the blocks.
      const progress = {
        messageCache: {
          blocks: new Array(2),
          startTime: { sec: 0, nsec: 0 },
        },
      };

      const Test = createTest();
      const root = mount(
        <MockMessagePipelineProvider progress={progress} topics={topics}>
          <Test topic={"/foo"} />
        </MockMessagePipelineProvider>
      );
      expect(Test.result.mock.calls).toEqual([[undefined]]);
      root.unmount();
    });

    it("handles empty blocks", async () => {
      const progress = {
        messageCache: {
          blocks: [{ messagesByTopic: {}, sizeInBytes: 0 }, { messagesByTopic: {}, sizeInBytes: 0 }],
          startTime: { sec: 0, nsec: 0 },
        },
      };

      const Test = createTest();
      const root = mount(
        <MockMessagePipelineProvider progress={progress} topics={topics}>
          <Test topic={"/foo"} />
        </MockMessagePipelineProvider>
      );
      expect(Test.result.mock.calls).toEqual([[undefined]]);
      root.unmount();
    });
    it("does not update when we haven't found a message yet", async () => {
      const progress = {
        messageCache: {
          blocks: [{ messagesByTopic: {}, sizeInBytes: 0 }, { messagesByTopic: {}, sizeInBytes: 0 }],
          startTime: { sec: 0, nsec: 0 },
        },
      };

      const Test = createTest();
      const root = mount(
        <MockMessagePipelineProvider progress={progress} topics={topics}>
          <Test topic={"/foo"} />
        </MockMessagePipelineProvider>
      );

      root.setProps({
        progress: {
          ...progress,
          messageCache: {
            blocks: [...progress.messageCache.blocks, { messagesByTopic: {}, sizeInBytes: 0 }],
          },
        },
      });

      expect(Test.result.mock.calls).toEqual([[undefined]]);
      root.unmount();
    });

    it("does not update when new blocks arrive", async () => {
      const progress = {
        messageCache: {
          blocks: [
            {
              messagesByTopic: {
                "/foo": [
                  {
                    message: wrapJsObject({}, "time", { sec: 1234, nsec: 5678 }),
                    topic: "/foo",
                    receiveTime: { sec: 1, nsec: 1 },
                  },
                ],
              },
              sizeInBytes: 0,
            },
          ],
          startTime: { sec: 0, nsec: 0 },
        },
      };

      const Test = createTest();
      const root = mount(
        <MockMessagePipelineProvider progress={progress} topics={topics}>
          <Test topic={"/foo"} />
        </MockMessagePipelineProvider>
      );

      root.setProps({
        progress: {
          ...progress,
          messageCache: {
            blocks: [
              ...progress.messageCache.blocks,
              {
                messagesByTopic: {
                  "/foo": [
                    {
                      message: wrapJsObject({}, "time", { sec: 1234, nsec: 5678 }),
                      topic: "/foo",
                      receiveTime: { sec: 1, nsec: 1 },
                    },
                  ],
                },
                sizeInBytes: 0,
              },
            ],
          },
        },
      });

      expect(Test.result.mock.calls).toEqual([[{ sec: 1234, nsec: 5678 }]]);
      root.unmount();
    });

    it("updates when new blocks arrive, as long a new playerId arrives too", async () => {
      const progress = {
        messageCache: {
          blocks: [
            {
              messagesByTopic: {
                "/foo": [
                  {
                    message: wrapJsObject({}, "time", { sec: 1234, nsec: 5678 }),
                    topic: "/foo",
                    receiveTime: { sec: 1, nsec: 1 },
                  },
                ],
              },
              sizeInBytes: 0,
            },
          ],
          startTime: { sec: 0, nsec: 0 },
        },
      };

      const Test = createTest();
      const root = mount(
        <MockMessagePipelineProvider progress={progress} topics={topics}>
          <Test topic={"/foo"} />
        </MockMessagePipelineProvider>
      );

      root.setProps({
        playerId: 123,
        progress: {
          ...progress,
          messageCache: {
            blocks: [
              {
                messagesByTopic: { "/foo": [{ message: wrapJsObject({}, "time", { sec: 1, nsec: 2 }) }] },
                sizeInBytes: 0,
              },
            ],
          },
        },
      });

      expect(Test.result.mock.calls).toEqual([[{ sec: 1234, nsec: 5678 }], [{ sec: 1, nsec: 2 }]]);
      root.unmount();
    });
  });

  describe("when the topic cannot be preloaded", () => {
    const topics = [
      {
        name: "/foo",
        preloadable: false,
        datatype: "fake",
      },
    ];

    it("returns an empty structure when there are no messages", async () => {
      const Test = createTest();

      const root = mount(
        <MockMessagePipelineProvider topics={topics}>
          <Test topic={"/foo"} />
        </MockMessagePipelineProvider>
      );

      expect(Test.result.mock.calls).toEqual([[undefined]]);

      root.unmount();
    });

    it("does not update when we haven't found the message yet", async () => {
      const Test = createTest();

      const root = mount(
        <MockMessagePipelineProvider topics={topics}>
          <Test topic={"/foo"} />
        </MockMessagePipelineProvider>
      );
      root.setProps({
        bobjects: [
          { topic: "/bar", message: wrapJsObject({}, "time", { sec: 1, nsec: 2 }), receiveTime: { sec: 1, nsec: 1 } },
        ],
      });

      expect(Test.result.mock.calls).toEqual([[undefined]]);

      root.unmount();
    });

    it("does not update when new messages arrive", async () => {
      const bobjects = [
        {
          topic: "/foo",
          message: wrapJsObject({}, "time", { sec: 1234, nsec: 5678 }),
          receiveTime: { sec: 1, nsec: 1 },
        },
      ];

      const Test = createTest();
      const root = mount(
        <MockMessagePipelineProvider bobjects={bobjects} topics={topics}>
          <Test topic={"/foo"} />
        </MockMessagePipelineProvider>
      );

      root.setProps({
        bobjects: [
          { topic: "/foo", message: wrapJsObject({}, "time", { sec: 1, nsec: 2 }), receiveTime: { sec: 1, nsec: 1 } },
          ...bobjects,
        ],
      });

      expect(Test.result.mock.calls).toEqual([[{ sec: 1234, nsec: 5678 }]]);
      root.unmount();
    });

    it("updates when new messages arrive, as long a new playerId arrives too", async () => {
      const bobjects = [
        {
          topic: "/foo",
          message: wrapJsObject({}, "time", { sec: 1234, nsec: 5678 }),
          receiveTime: { sec: 1, nsec: 1 },
        },
      ];

      const Test = createTest();
      const root = mount(
        <MockMessagePipelineProvider bobjects={bobjects} topics={topics}>
          <Test topic={"/foo"} />
        </MockMessagePipelineProvider>
      );

      root.setProps({
        playerId: 123,
        bobjects: [
          { topic: "/foo", message: wrapJsObject({}, "time", { sec: 1, nsec: 2 }), receiveTime: { sec: 1, nsec: 1 } },
          ...bobjects,
        ],
      });

      expect(Test.result.mock.calls).toEqual([[{ sec: 1234, nsec: 5678 }], [{ sec: 1, nsec: 2 }]]);
      root.unmount();
    });
  });
});
