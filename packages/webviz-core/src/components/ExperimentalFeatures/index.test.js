// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mount } from "enzyme";
import * as React from "react";

import { EXPERIMENTAL_FEATURES_STORAGE_KEY, ExperimentalFeaturesModal, useExperimentalFeature } from ".";
import { dummyExperimentalFeaturesList, dummyExperimentalFeaturesStorage } from "./fixture";
import { resetHooksToDefault, setHooks } from "webviz-core/src/loadWebviz";
import Storage from "webviz-core/src/util/Storage";

describe("ExperimentalFeatures", () => {
  it("exposes experimental features using useExperimentalFeature", async () => {
    setHooks({
      experimentalFeaturesList() {
        return dummyExperimentalFeaturesList;
      },
    });
    new Storage().setItem(EXPERIMENTAL_FEATURES_STORAGE_KEY, dummyExperimentalFeaturesStorage);

    const renderedSettings = {};
    let renderCount = 0;
    function RenderExperimentalFeatures() {
      renderCount++;
      renderedSettings.topicTree = useExperimentalFeature("topicTree");
      renderedSettings.topicTree2 = useExperimentalFeature("topicTree2");
      renderedSettings.topicTree3 = useExperimentalFeature("topicTree3");
      renderedSettings.topicTree4 = useExperimentalFeature("topicTree4");
      return null;
    }

    mount(<RenderExperimentalFeatures />);
    expect(renderCount).toEqual(1);
    expect(renderedSettings).toEqual({ topicTree: true, topicTree2: true, topicTree3: true, topicTree4: false });

    // Clicking on an item in the modal should trigger a rerender of all components that use
    // `useExperimentalFeature`, and so the `renderedSettings` should be updated with the new value.
    const modal = mount(
      <div data-modalcontainer="true">
        <ExperimentalFeaturesModal />
      </div>
    );
    modal
      .find("[data-test='alwaysOff']")
      .first()
      .simulate("click");
    expect(renderCount).toEqual(2);
    expect(renderedSettings).toEqual({ topicTree: false, topicTree2: true, topicTree3: true, topicTree4: false });
    expect(new Storage().getItem(EXPERIMENTAL_FEATURES_STORAGE_KEY)).toEqual({
      ...dummyExperimentalFeaturesStorage,
      topicTree: "alwaysOff",
    });

    new Storage().removeItem(EXPERIMENTAL_FEATURES_STORAGE_KEY);
    resetHooksToDefault();
  });
});
