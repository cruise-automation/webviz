// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf, type Story } from "@storybook/react";
import { noop } from "lodash";
import * as React from "react";
import styled from "styled-components";

import { setExperimentalFeature, type FeatureValue } from "webviz-core/src/components/ExperimentalFeatures";

export const SCREENSHOT_VIEWPORT = {
  width: 1001,
  height: 745,
};

type StoryVariant = {
  name: string,
  beforeEach?: () => void,
  afterEach?: () => void,
};

//
// Provides a way to declare stories with several variants each with their own before/after callback
//
export const storiesWithVariantsOf = (baseName: string, module: NodeModule, variants: StoryVariant[]): Story => {
  // Create a Story for each of the variants
  const stories = variants.map(({ name, beforeEach = noop, afterEach = noop }) =>
    storiesOf(`${baseName} / ${name}`, module).addDecorator((childrenRenderFn) => {
      beforeEach();
      React.useEffect(() => () => afterEach());
      return <>{childrenRenderFn()}</>;
    })
  );

  // Return an interface that works just like storiesOf
  const fakeStoriesOf = {
    kind: "story",
    add: (...args) => {
      stories.forEach((s) => s.add(...args));
      return fakeStoriesOf;
    },
    addDecorator: (...args) => {
      stories.forEach((s) => s.addDecorator(...args));
      return fakeStoriesOf;
    },
    addParameters: (...args) => {
      stories.forEach((s) => s.addParameters(...args));
      return fakeStoriesOf;
    },
  };
  return fakeStoriesOf;
};

export const withExperimentalFeatureVariants = (
  experimentName: string,
  featureValues: FeatureValue[]
): StoryVariant[] =>
  featureValues.map((featureValue) => {
    return {
      name: `🧪 ${experimentName} ${featureValue || "default"}`,
      beforeEach: () => setExperimentalFeature(experimentName, featureValue || "default"),
    };
  });

export const ScreenshotSizedContainer = (props: { children: React.Node }) => (
  <div style={SCREENSHOT_VIEWPORT}>{props.children}</div>
);

export const SExpectedResult = styled.div`
  position: fixed;
  top: 25px;
  left: 0;
  color: lightgreen;
  margin: 16px;
  z-index: 1000;
`;
