// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { mount } from "enzyme";
import React from "react";
import { TimeUtil } from "rosbag";

import SeekControls from "webviz-core/src/components/PlaybackControls/SeekControls";
import { ARROW_SEEK_MS } from "webviz-core/src/components/PlaybackControls/sharedHelpers";
import { subtractTimes, fromMillis } from "webviz-core/src/util/time";

describe("<SeekControls />", () => {
  let seek;
  const currentTime = fromMillis(500);
  const timestamps = ["0.00", "0.20000000", "0.90000000"];

  beforeEach(() => {
    seek = jest.fn();
  });

  describe("Clicking on seek buttons", () => {
    it("calls seek with correct arguments when clicking forwards", () => {
      const wrapper = mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

      // there are two button components that come back because the Button passes all props down
      const button = wrapper.find(`[dataTestId="seek-forwards"]`).first();
      button.simulate("click");

      expect(seek).toHaveBeenCalledWith(TimeUtil.add(currentTime, fromMillis(ARROW_SEEK_MS.DEFAULT)));
    });

    it("calls seek with correct arguments when clicking backwards", () => {
      const wrapper = mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

      // there are two button components that come back because the Button passes all props down
      const button = wrapper.find(`[dataTestId="seek-backwards"]`).first();
      button.simulate("click");

      expect(seek).toHaveBeenCalledWith(subtractTimes(currentTime, fromMillis(ARROW_SEEK_MS.DEFAULT)));
    });

    it("calls seek with correct arguments when clicking forwards when timestamps are present", () => {
      const wrapper = mount(
        <SeekControls currentTime={currentTime} hasActiveData timestamps={timestamps} seek={seek} />
      );

      // there are two button components that come back because the Button passes all props down
      const button = wrapper.find(`[dataTestId="seek-forwards"]`).first();
      button.simulate("click");

      expect(seek).toHaveBeenCalledWith(fromMillis(900));
    });

    it("calls seek with correct arguments when clicking backwards when timestamps are present", () => {
      const wrapper = mount(
        <SeekControls currentTime={currentTime} hasActiveData timestamps={timestamps} seek={seek} />
      );

      // there are two button components that come back because the Button passes all props down
      const button = wrapper.find(`[dataTestId="seek-backwards"]`).first();
      button.simulate("click");

      // NOTE: we automatically select the closest previous tick, so seeking backwards will seem to skip a value, but this is intended
      expect(seek).toHaveBeenCalledWith(fromMillis(0));
    });

    // can't figure out how to simulate modifier keys by themselves with a button click
    // future test cases:
    // shiftKey: true
    // metaKey: true
    // ctrlKey: true
    // altKey: true
  });

  describe("Seeking with Arrow keys", () => {
    describe("Right arrow", () => {
      it("calls seek with correct arguments when arrow forwards", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

        document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", code: "ArrowRight", keyCode: 39 }));

        expect(seek).toHaveBeenCalledWith(TimeUtil.add(currentTime, fromMillis(ARROW_SEEK_MS.DEFAULT)));
      });

      it("calls seek with correct arguments when arrow forwards with Shift", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", code: "ArrowRight", keyCode: 39, shiftKey: true })
        );

        expect(seek).toHaveBeenCalledWith(TimeUtil.add(currentTime, fromMillis(ARROW_SEEK_MS.SMALL)));
      });

      it("calls seek with correct arguments when arrow forwards with Meta", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowRight",
            code: "ArrowRight",
            keyCode: 39,
            metaKey: true,
          })
        );

        expect(seek).toHaveBeenCalledWith(TimeUtil.add(currentTime, fromMillis(ARROW_SEEK_MS.TINY)));
      });

      it("calls seek with correct arguments when arrow forwards with Alt", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowRight",
            code: "ArrowRight",
            keyCode: 39,
            altKey: true,
          })
        );

        expect(seek).toHaveBeenCalledWith(TimeUtil.add(currentTime, fromMillis(ARROW_SEEK_MS.BIG)));
      });

      it("calls seek with correct arguments when arrow forwards with Ctrl", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowRight",
            code: "ArrowRight",
            keyCode: 39,
            ctrlKey: true,
          })
        );

        expect(seek).toHaveBeenCalledWith(TimeUtil.add(currentTime, fromMillis(ARROW_SEEK_MS.TINY)));
      });

      it("calls seek with correct arguments when arrow forwards while timestamps are present", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData timestamps={timestamps} seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowRight",
            code: "ArrowRight",
            keyCode: 39,
          })
        );

        expect(seek).toHaveBeenCalledWith(fromMillis(900));
      });

      it("calls seek with correct arguments when arrow forwards with Ctrl while timestamps are present", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData timestamps={timestamps} seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowRight",
            code: "ArrowRight",
            keyCode: 39,
            ctrlKey: true,
          })
        );

        expect(seek).toHaveBeenCalledWith(TimeUtil.add(currentTime, fromMillis(ARROW_SEEK_MS.TINY)));
      });
    });

    describe("Left arrow", () => {
      it("calls seek with correct arguments when arrow backwards", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

        document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 }));

        expect(seek).toHaveBeenCalledWith(subtractTimes(currentTime, fromMillis(ARROW_SEEK_MS.DEFAULT)));
      });

      it("calls seek with correct arguments when arrow backwards with Shift", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37, shiftKey: true })
        );

        expect(seek).toHaveBeenCalledWith(subtractTimes(currentTime, fromMillis(ARROW_SEEK_MS.SMALL)));
      });

      it("calls seek with correct arguments when arrow backwards with Meta", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowLeft",
            code: "ArrowLeft",
            keyCode: 37,
            metaKey: true,
          })
        );

        expect(seek).toHaveBeenCalledWith(subtractTimes(currentTime, fromMillis(ARROW_SEEK_MS.TINY)));
      });

      it("calls seek with correct arguments when arrow backwards with Alt", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowLeft",
            code: "ArrowLeft",
            keyCode: 37,
            altKey: true,
          })
        );

        expect(seek).toHaveBeenCalledWith(subtractTimes(currentTime, fromMillis(ARROW_SEEK_MS.BIG)));
      });

      it("calls seek with correct arguments when arrow backwards with Ctrl", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowLeft",
            code: "ArrowLeft",
            keyCode: 37,
            ctrlKey: true,
          })
        );

        expect(seek).toHaveBeenCalledWith(subtractTimes(currentTime, fromMillis(ARROW_SEEK_MS.TINY)));
      });

      it("calls seek with correct arguments when arrow backwards when timestamps are present", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData timestamps={timestamps} seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowLeft",
            code: "ArrowLeft",
            keyCode: 37,
          })
        );

        // NOTE: we automatically select the closest previous tick, so seeking backwards will seem to skip a value, but this is intended
        expect(seek).toHaveBeenCalledWith(fromMillis(0));
      });

      it("calls seek with correct arguments when arrow backwards with Ctrl when timestamps are present", () => {
        mount(<SeekControls currentTime={currentTime} hasActiveData timestamps={timestamps} seek={seek} />);

        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowLeft",
            code: "ArrowLeft",
            keyCode: 37,
            ctrlKey: true,
          })
        );

        expect(seek).toHaveBeenCalledWith(subtractTimes(currentTime, fromMillis(ARROW_SEEK_MS.TINY)));
      });
    });
  });
});
