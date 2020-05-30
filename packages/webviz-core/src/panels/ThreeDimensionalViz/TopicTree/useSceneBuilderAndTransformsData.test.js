// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { omit } from "lodash";
import * as React from "react";

import type { UseSceneBuilderAndTransformsDataInput } from "./types";
import useSceneBuilderAndTransformsData from "./useSceneBuilderAndTransformsData";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import type { Namespace } from "webviz-core/src/types/Messages";
import { TRANSFORM_TOPIC } from "webviz-core/src/util/globalConstants";

type ErrorsByTopic = { [topicName: string]: string[] };
class MockTransform {
  _values: { id: string }[];
  constructor({ tfs }: { tfs: { id: string }[] }) {
    this._values = tfs || [];
  }
  values() {
    return this._values;
  }
}

const DEFAULT_ERRORS = {
  "/topic_a": ["missing transforms to root transform: some_root_tf"],
};

class MockSceneBuilder {
  allNamespaces: Namespace[] = [];
  errorsByTopic: ErrorsByTopic = DEFAULT_ERRORS;
  constructor({ namespaces, errorsByTopic }: {| namespaces?: Namespace[], errorsByTopic?: ErrorsByTopic |}) {
    if (namespaces) {
      this.allNamespaces = namespaces;
    }
    if (errorsByTopic) {
      this.errorsByTopic = errorsByTopic;
    }
  }
}

function getMockProps({
  showNamespaces,
  showTransforms,
  showErrors,
  mockTfIds,
}: {
  showNamespaces?: boolean,
  showTransforms?: boolean,
  showErrors?: boolean,
  mockTfIds?: string[],
}): {|
  sceneBuilder: MockTransform,
  transforms: MockSceneBuilder,
|} {
  let tfIds = [];
  if (showTransforms) {
    tfIds = ["some_tf1", "some_tf2", ""];
  } else if (mockTfIds) {
    tfIds = mockTfIds;
  }

  return {
    // $FlowFixMe mocked implementation
    sceneBuilder: new MockSceneBuilder({
      namespaces: showNamespaces ? [{ topic: "/foo", name: "ns1" }, { topic: "/foo", name: "ns2" }] : [],
      errors: showErrors ? DEFAULT_ERRORS : undefined,
    }),
    // $FlowFixMe mocked implementation
    transforms: new MockTransform({ tfs: tfIds.map((id) => ({ id })) }),
  };
}

describe("useSceneBuilderAndTransformsData", () => {
  // Create a helper component that exposes the results of the hook for mocking.
  type Props = {
    ...UseSceneBuilderAndTransformsDataInput,
    messagePipelineProps?: any,
  };
  function createTest() {
    function Test(props: Props) {
      return (
        <MockMessagePipelineProvider {...props.messagePipelineProps}>
          <TestInner {...omit(props, "messagePipelineProps")} />
        </MockMessagePipelineProvider>
      );
    }
    function TestInner(props: UseSceneBuilderAndTransformsDataInput) {
      Test.result(useSceneBuilderAndTransformsData(props));
      return null;
    }
    Test.result = jest.fn();
    return Test;
  }

  describe("availableNamespacesByTopic", () => {
    it("collects namespaces from transforms and sceneBuilder namespaces", () => {
      const Test = createTest();
      const staticallyAvailableNamespacesByTopic = { "/bar": ["ns3", "ns4"] };
      const root = mount(
        // $FlowFixMe mocked implementation
        <Test {...getMockProps({})} staticallyAvailableNamespacesByTopic={staticallyAvailableNamespacesByTopic} />
      );
      expect(Test.result.mock.calls[0][0].availableNamespacesByTopic).toEqual(staticallyAvailableNamespacesByTopic);
      root.setProps(getMockProps({ showNamespaces: true, showTransforms: true }));

      expect(Test.result.mock.calls[1][0].availableNamespacesByTopic).toEqual({
        "/foo": ["ns1", "ns2"],
        [TRANSFORM_TOPIC]: ["some_tf1", "some_tf2"],
        ...staticallyAvailableNamespacesByTopic,
      });
    });

    it("shows all transform namespaces collected over time", () => {
      const Test = createTest();
      const root = mount(
        // $FlowFixMe mocked implementation
        <Test {...getMockProps({ showTransforms: true })} />
      );
      expect(Test.result.mock.calls[0][0].availableNamespacesByTopic).toEqual({
        [TRANSFORM_TOPIC]: ["some_tf1", "some_tf2"],
      });

      // TFs were removed, but we still report them in the available namespaces.
      root.setProps(getMockProps({}));
      expect(Test.result.mock.calls[1][0].availableNamespacesByTopic).toEqual({
        [TRANSFORM_TOPIC]: ["some_tf1", "some_tf2"],
      });

      root.setProps(getMockProps({ mockTfIds: ["some_tf3"] }));
      expect(Test.result.mock.calls[2][0].availableNamespacesByTopic).toEqual({
        [TRANSFORM_TOPIC]: ["some_tf1", "some_tf2", "some_tf3"],
      });
    });

    it("resets transforms collected when the player changes", () => {
      const Test = createTest();
      const root = mount(
        // $FlowFixMe mocked implementation
        <Test {...getMockProps({ showTransforms: true })} />
      );
      expect(Test.result.mock.calls[0][0].availableNamespacesByTopic).toEqual({
        [TRANSFORM_TOPIC]: ["some_tf1", "some_tf2"],
      });

      root.setProps({ ...getMockProps({}), messagePipelineProps: { playerId: "somePlayerId" } });
      expect(Test.result.mock.calls[1][0].availableNamespacesByTopic).toEqual({});
    });
  });

  describe("getSceneErrorsByKey", () => {
    it("collects scene builder errors and group them by key", () => {
      const Test = createTest();
      const mockSceneBuilder = new MockSceneBuilder({
        namespaces: [],
        errorsByTopic: {
          "/topic_a": ["error msg foo", "missing transforms to root transform: some_root_tf"],
          "/webviz_bag_2/topic_a": ["error msg bar", "missing frame id"],
        },
      });
      const root = mount(
        // $FlowFixMe mocked implementation
        <Test {...getMockProps({})} sceneBuilder={mockSceneBuilder} />
      );

      expect(Test.result.mock.calls[0][0].sceneErrorsByKey).toEqual({
        "t:/topic_a": ["error msg foo", "missing transforms to root transform: some_root_tf"],
        "t:/webviz_bag_2/topic_a": ["error msg bar", "missing frame id"],
      });

      // Update scene errors.
      root.setProps(getMockProps({ showErrors: true }));
      expect(Test.result.mock.calls[1][0].sceneErrorsByKey).toEqual({
        "t:/topic_a": ["missing transforms to root transform: some_root_tf"],
      });
    });
  });
});
