// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { renderHook, act } from "@testing-library/react-hooks";
import { mount } from "enzyme";
import * as React from "react";
import { type CameraState } from "regl-worldview";

import {
  type GLTextMarker,
  useGLText,
  ORANGE,
  getHighlightedIndices,
  useSearchMatches,
} from "webviz-core/src/panels/ThreeDimensionalViz/SearchText";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { TextMarker } from "webviz-core/src/types/Messages";
import { MARKER_MSG_TYPES } from "webviz-core/src/util/globalConstants";

jest.mock("lodash", () => {
  // Require the original module to not be mocked...
  const originalModule = jest.requireActual("lodash");
  return {
    __esModule: true, // Use it when dealing with esModules
    ...originalModule,
    debounce: (fn) => fn,
  };
});

export const ROOT_FRAME_ID = "root_frame";
export const CHILD_FRAME_ID = "child_frame";

export const header = {
  frame_id: ROOT_FRAME_ID,
  stamp: { sec: 0, nsec: 0 },
};

const createMarker = (text: string): TextMarker | GLTextMarker => {
  return {
    header,
    ns: "base",
    action: 0,
    scale: { x: 1, y: 1, z: 1 },
    color: { r: 1, g: 1, b: 1, a: 1 },
    id: "id",
    pose: {
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 1, y: 1, z: 1 },
    },
    type: MARKER_MSG_TYPES.TEXT_VIEW_FACING,
    text,
  };
};

const runUseGLTextTest = async (
  text: TextMarker[],
  searchText: string,
  searchTextMatches: GLTextMarker[],
  setSearchTextMatches: (marker: GLTextMarker[]) => void = jest.fn(),
  selectedMatchIndex: number = 0
) => {
  const originalMarkers: TextMarker[] = text;
  let glTextMarkers = [];
  const Wrapper = () => {
    glTextMarkers = useGLText({
      text: originalMarkers,
      searchText,
      searchTextOpen: true,
      selectedMatchIndex,
      setSearchTextMatches,
      searchTextMatches,
    });
    return null;
  };
  const root = await mount(<Wrapper />);
  root.update();
  root.unmount();
  return glTextMarkers;
};

describe("<SearchText />", () => {
  describe("getHighlightedIndices", () => {
    expect(getHighlightedIndices("hello webviz", "e")).toEqual([1, 7]);
    expect(getHighlightedIndices("hello webviz", "hello ")).toEqual([0, 1, 2, 3, 4, 5]);
    it("is case insensitive", () => {
      expect(getHighlightedIndices("Car", "car")).toEqual([0, 1, 2]);
      expect(getHighlightedIndices("car", "Car")).toEqual([0, 1, 2]);
    });
  });
  describe("useGLText", () => {
    it("updates the text markers to include highlighted indices", async () => {
      const setSearchTextMatches = jest.fn();
      const glTextMarkers = await runUseGLTextTest([createMarker("hello")], "hello", [], setSearchTextMatches);
      expect(glTextMarkers.length).toEqual(1);
      expect(glTextMarkers[0].highlightedIndices).toEqual([0, 1, 2, 3, 4]);
      expect(setSearchTextMatches).toHaveBeenCalledWith(glTextMarkers);
    });
    it("works with empy text markers", async () => {
      const setSearchTextMatches = jest.fn();
      const glTextMarkers = await runUseGLTextTest([createMarker("")], "hello", [], setSearchTextMatches);
      expect(glTextMarkers.length).toEqual(1);
      expect(glTextMarkers[0].highlightedIndices).toEqual(undefined);
      expect(setSearchTextMatches).not.toHaveBeenCalled();
    });
    it("updates matches to empty", async () => {
      const setSearchTextMatches = jest.fn();
      const marker = createMarker("hello");
      const glTextMarkers = await runUseGLTextTest([marker], "bye", [(marker: any)], setSearchTextMatches);
      expect(glTextMarkers.length).toEqual(1);
      expect(glTextMarkers[0].highlightedIndices).toEqual(undefined);
      expect(setSearchTextMatches).toHaveBeenCalledWith([]);
    });
    it("sets a custom highlight color to the correct index", async () => {
      const setSearchTextMatches = jest.fn();
      const markers = [createMarker("hello webviz"), createMarker("hello cruies"), createMarker("hello future")];
      const glTextMarkers = await runUseGLTextTest(markers, "hello", [], setSearchTextMatches, 2);
      expect(glTextMarkers.length).toEqual(3);
      expect(glTextMarkers[2].highlightColor).toEqual(ORANGE);
    });
    it("does update the markers if search text has changed", async () => {
      const marker = createMarker("hello");
      const originalMarkers: TextMarker[] = [marker];
      let glTextMarkers = [];
      const Wrapper = ({ searchText }: { searchText: string }) => {
        glTextMarkers = useGLText({
          text: originalMarkers,
          searchText,
          searchTextOpen: true,
          selectedMatchIndex: 0,
          setSearchTextMatches: jest.fn(),
          searchTextMatches: [],
        });
        return <span>{searchText}</span>;
      };
      const root = await mount(<Wrapper searchText={"hello"} />);
      root.update();
      const originalGlText = glTextMarkers;
      root.setProps({ searchText: "bye" });
      expect(glTextMarkers).not.toEqual(originalGlText);
      root.unmount();
    });

    it("does not update the markers if nothing has changed", async () => {
      const marker = createMarker("hello");
      const originalMarkers: TextMarker[] = [marker];
      let glTextMarkers = [];
      const Wrapper = ({ randomNum }: { randomNum: number }) => {
        glTextMarkers = useGLText({
          text: originalMarkers,
          searchText: "hello",
          searchTextOpen: true,
          selectedMatchIndex: 0,
          setSearchTextMatches: jest.fn(),
          searchTextMatches: [],
        });
        return <span>{randomNum}</span>;
      };
      const root = await mount(<Wrapper randomNum={1} />);
      root.update();
      const originalGlText = glTextMarkers;
      root.setProps({ randomNum: 2 });
      expect(glTextMarkers).toEqual(originalGlText);
      root.unmount();
    });
  });
  describe("useCurrentMatchPosition", () => {
    const p = (x: number = 0, y = x, z = x) => ({ x, y, z });
    const q = (x = 0, y = 0, z = 0, w = 0) => ({ x, y, z, w });
    const getTf = () => {
      const tf = new Transforms();
      const message = {
        header,
        pose: {
          position: p(30, 60, 90),
          orientation: q(0, 0, 0, 1),
        },
      };
      const rootTf = tf.storage.get(CHILD_FRAME_ID);
      rootTf.set(message.pose.position, message.pose.orientation);
      rootTf.parent = tf.storage.get(ROOT_FRAME_ID);
      return tf;
    };

    const baseCameraState = {
      target: [0, 0, 0],
      targetOffset: [0, 0, 0],
      targetOrientation: [0, 0, 0, 1],
    };

    const useWrapper = (
      initialCameraState?: CameraState = baseCameraState,
      initialMatch?: GLTextMarker = createMarker("text")
    ) => {
      const transforms = getTf();
      const [cameraState, updateCameraState] = React.useState(initialCameraState);
      const [currentMatch, updateCurrentMatch] = React.useState<GLTextMarker>(initialMatch);
      const onCameraStateChange = React.useCallback(jest.fn(updateCameraState), []);

      useSearchMatches({
        cameraState,
        onCameraStateChange,
        currentMatch,
        rootTf: ROOT_FRAME_ID,
        searchTextOpen: true,
        transforms,
      });
      return { cameraState, updateCurrentMatch, onCameraStateChange };
    };

    it("updates camera state with a new target offset based on the root transform", () => {
      const { result } = renderHook(() => useWrapper(baseCameraState));
      expect(result.current.cameraState).toEqual({
        ...baseCameraState,
        targetOffset: [1, 1, 1],
      });
    });
    it("should take into account target heading in target offset", () => {
      const initialCameraState = {
        ...baseCameraState,
        targetOrientation: [0.0, 0.0, -0.8, 0.6],
      };
      const { result } = renderHook(() => useWrapper(initialCameraState));
      const [x, y, z] = result.current.cameraState.targetOffset;
      expect(x).toBeCloseTo(-1.24);
      expect(y).toBeCloseTo(0.68);
      expect(z).toEqual(1);
    });
    it("should update camera state if there are new matches", () => {
      const { result } = renderHook(() => useWrapper(baseCameraState));
      act(() => {
        result.current.updateCurrentMatch({
          ...createMarker("text"),
          pose: {
            position: p(2, 2, 2),
            orientation: q(0, 0, 0, 1),
          },
        });
      });
      expect(result.current.cameraState).toEqual({
        ...baseCameraState,
        targetOffset: [2, 2, 2],
      });
      act(() => {
        result.current.updateCurrentMatch({
          ...createMarker("text"),
          pose: {
            position: p(3, 3, 3),
            orientation: q(0, 0, 0, 1),
          },
        });
      });
      expect(result.current.cameraState).toEqual({
        ...baseCameraState,
        targetOffset: [3, 3, 3],
      });
    });
    it("should not fire onCameraStateChange if cameraState is updated independently", () => {
      const { result } = renderHook(() => useWrapper(baseCameraState));
      expect(result.current.onCameraStateChange).toHaveBeenCalledTimes(1);
      act(() => {
        result.current.onCameraStateChange({
          targetOffset: [5, 5, 5],
        });
      });
      expect(result.current.onCameraStateChange).toHaveBeenCalledTimes(2);
    });
  });
});
