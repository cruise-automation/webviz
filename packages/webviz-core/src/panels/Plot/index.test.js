// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import { flatten } from "lodash";
import React from "react";

import { fixture, exampleConfig } from "./index.stories.js";
import delay from "webviz-core/shared/delay";
import { MockMessagePipelineProvider } from "webviz-core/src/components/MessagePipeline";
import ReactChartjs from "webviz-core/src/components/ReactChartjs";
import Plot from "webviz-core/src/panels/Plot";
import { MosaicWrapper } from "webviz-core/src/stories/PanelSetup";
import { wrapMessages, wrapMessage } from "webviz-core/src/test/datatypes";

jest.mock("webviz-core/src/components/ReactChartjs");

const messages: any = flatten(Object.values(fixture.frame));
const wrappedMessages = wrapMessages(messages);
const dummyMessage = {
  topic: "/dummy_topic",
  receiveTime: { sec: 0, nsec: 0 },
  message: {},
};

describe("Plot panel", () => {
  it("Does not render the plot twice when currentTime changes", async () => {
    const onChartUpdate = jest.fn();
    // $FlowFixMe we are using the mocked version of ReactChartjs.
    ReactChartjs.onUpdate = onChartUpdate;

    const props = {
      messages: [],
      bobjects: wrappedMessages,
      topics: fixture.topics,
      datatypes: fixture.datatypes,
      activeData: fixture.activeData,
      pauseFrame: () => () => undefined,
      seekPlayback: () => undefined,
    };
    const mountedComponent = mount(
      <MockMessagePipelineProvider {...props}>
        <MosaicWrapper>
          <Plot config={exampleConfig} />
        </MosaicWrapper>
      </MockMessagePipelineProvider>
    );
    await delay(100);

    // Don't re-render the plot when the current time is updated.
    mountedComponent.setProps({
      ...props,
      activeData: { ...fixture.activeData, currentTime: { sec: 1, nsec: 750000000 } },
    });
    await delay(100);
    mountedComponent.setProps({
      ...props,
      activeData: { ...fixture.activeData, currentTime: { sec: 2, nsec: 750000000 } },
    });
    await delay(100);
    expect(onChartUpdate).not.toHaveBeenCalled();

    // Don't re-render the plot when there are no new plot messages, even if there are other new messages.
    // This simulates a plot that has all data preloaded, even while other panels are receiving new messages.
    mountedComponent.setProps({
      ...props,
      bobjects: [wrapMessage(dummyMessage)],
    });
    await delay(100);
    mountedComponent.setProps({
      ...props,
      bobjects: [wrapMessage(dummyMessage)],
    });
    await delay(100);
    expect(onChartUpdate).not.toHaveBeenCalled();

    // This update should re-render the chart because it contains new message data for the topics that the plot has
    // subscribed to.
    mountedComponent.setProps({
      ...props,
      bobjects: wrapMessages(messages),
    });
    await delay(100);
    expect(onChartUpdate).toHaveBeenCalledTimes(1);
  });
});
