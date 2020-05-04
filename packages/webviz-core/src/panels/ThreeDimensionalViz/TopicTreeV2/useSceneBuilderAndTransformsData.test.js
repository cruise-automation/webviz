// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import * as React from "react";

import type { UseSceneBuilderAndTransformsDataInput } from "./types";
import useSceneBuilderAndTransformsData from "./useSceneBuilderAndTransformsData";
import type { Namespace } from "webviz-core/src/types/Messages";

class MockTransform {
  _values: { id: string }[];
  constructor({ tfs }: { tfs: { id: string }[] }) {
    this._values = tfs || [];
  }
  values() {
    return this._values;
  }
}

class MockSceneBuilder {
  allNamespaces: Namespace[] = [];
  constructor({ namespaces }: { namespaces?: Namespace[] }) {
    this.allNamespaces = namespaces || [];
  }
}

function getMockProps({
  showNamespaces,
  showTransforms,
}: {
  showNamespaces?: boolean,
  showTransforms?: boolean,
}): {|
  sceneBuilder: MockTransform,
  transforms: MockSceneBuilder,
|} {
  return {
    // $FlowFixMe mocked implementation
    sceneBuilder: new MockSceneBuilder({
      namespaces: showNamespaces ? [{ topic: "/foo", name: "ns1" }, { topic: "/foo", name: "ns2" }] : [],
    }),
    // $FlowFixMe mocked implementation
    transforms: new MockTransform({ tfs: showTransforms ? [{ id: "some_tf1" }, { id: "some_tf2" }] : [] }),
  };
}

describe("useSceneBuilderAndTransformsData", () => {
  // Create a helper component that exposes the results of the hook for mocking.
  function createTest() {
    function Test(props: UseSceneBuilderAndTransformsDataInput) {
      Test.result(useSceneBuilderAndTransformsData(props));
      return null;
    }
    Test.result = jest.fn();
    return Test;
  }

  describe("availableNamespacesByTopic", () => {
    it("collects namespaces from transforms and sceneBuilder namespaces ", () => {
      const Test = createTest();
      const staticallyAvailableNamespacesByTopic = { "/bar": ["ns3", "ns4"] };
      const root = mount(
        // $FlowFixMe mocked implementation
        <Test {...getMockProps({})} staticallyAvailableNamespacesByTopic={staticallyAvailableNamespacesByTopic} />
      );
      expect(Test.result.mock.calls[0][0]).toEqual({ availableNamespacesByTopic: { "/bar": ["ns3", "ns4"] } });
      root.setProps(getMockProps({ showNamespaces: true, showTransforms: true }));
      expect(Test.result.mock.calls[1][0]).toEqual({
        availableNamespacesByTopic: {
          "/foo": ["ns1", "ns2"],
          "/tf": ["some_tf1", "some_tf2"],
          ...staticallyAvailableNamespacesByTopic,
        },
      });
    });
  });
});
