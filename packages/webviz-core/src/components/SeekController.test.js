// @flow
//
//  Copyright (c) 2019-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { mount } from "enzyme";
import React from "react";

import { MockMessagePipelineProvider } from "./MessagePipeline";
import SeekController from "./SeekController";

describe("<SeekController />", () => {
  it("calls seek on message pipeline context exactly once", () => {
    const activeData = {
      startTime: { sec: 1, nsec: 0 },
      endTime: { sec: 10, nsec: 0 },
      isPlaying: true,
    };
    const onSeek = jest.fn();
    const el = mount(
      <MockMessagePipelineProvider activeData={activeData} seekPlayback={onSeek}>
        <SeekController search="?seek-to=2100" />
      </MockMessagePipelineProvider>
    );
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith({ sec: 2, nsec: 1e8 });
    const newActiveData = {
      ...activeData,
      currentTime: { sec: 3, nsec: 0 },
      isPlaying: true,
    };
    el.setProps({ activeData: newActiveData });
    expect(onSeek).toHaveBeenCalledTimes(1);
    el.unmount();
    expect(onSeek).toHaveBeenCalledTimes(1);
  });

  it("does not call seek if seek-to is outside range of player", () => {
    const activeData = {
      startTime: { sec: 1, nsec: 0 },
      endTime: { sec: 10, nsec: 0 },
      isPlaying: true,
    };
    const onSeek = jest.fn();
    const el = mount(
      <MockMessagePipelineProvider activeData={activeData} seekPlayback={onSeek}>
        <SeekController search="?seek-to=2000100" />
      </MockMessagePipelineProvider>
    );
    expect(onSeek).toHaveBeenCalledTimes(0);
    el.unmount();
  });

  it("does not call seek if seek-to is not a number", () => {
    const activeData = {
      startTime: { sec: 1, nsec: 0 },
      endTime: { sec: 10, nsec: 0 },
      isPlaying: true,
    };
    const onSeek = jest.fn();
    const el = mount(
      <MockMessagePipelineProvider activeData={activeData} seekPlayback={onSeek}>
        <SeekController search="?seek-to=foo" />
      </MockMessagePipelineProvider>
    );
    expect(onSeek).toHaveBeenCalledTimes(0);
    el.unmount();
  });

  it("does not call seek until player starts playing", () => {
    const activeData = {
      startTime: { sec: 1, nsec: 0 },
      endTime: { sec: 10, nsec: 0 },
      isPlaying: false,
    };
    const onSeek = jest.fn();
    const el = mount(
      <MockMessagePipelineProvider activeData={activeData} seekPlayback={onSeek}>
        <SeekController search="?seek-to=3000" />
      </MockMessagePipelineProvider>
    );
    expect(onSeek).toHaveBeenCalledTimes(0);
    const newActiveData = {
      ...activeData,
      isPlaying: true,
    };
    el.setProps({
      activeData: newActiveData,
    });
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith({ sec: 3, nsec: 0 });
    el.unmount();
  });
});
