// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ArrowDownIcon from "@mdi/svg/svg/chevron-down.svg";
import ArrowUpIcon from "@mdi/svg/svg/chevron-up.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import SearchIcon from "@mdi/svg/svg/magnify.svg";
import { vec3 } from "gl-matrix";
import { range, throttle } from "lodash";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { type CameraState, cameraStateSelectors } from "regl-worldview";

import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { TextMarker, Color } from "webviz-core/src/types/Messages";
import { useDeepChangeDetector } from "webviz-core/src/util/hooks";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

export const YELLOW = { r: 1, b: 0, g: 1, a: 1 };
export const ORANGE = { r: 0.97, g: 0.58, b: 0.02, a: 1 };

// $FlowFixMe - Can't figure this one out.
export type GLTextMarker = TextMarker & {
  highlightedIndices?: number[],
  highlightColor?: Color,
};

export type WorldSearchTextProps = {|
  searchTextOpen: boolean,
  searchText: string,
  setSearchTextMatches: (markers: GLTextMarker[]) => void,
  searchTextMatches: GLTextMarker[],
  selectedMatchIndex: number,
|};

export type SearchTextProps = {|
  ...WorldSearchTextProps,
  toggleSearchTextOpen: (bool: boolean) => void,
  setSearchText: (searchText: string) => void,
  setSelectedMatchIndex: (index: number) => void,
  searchInputRef: {| current: ?HTMLInputElement |},
|};

export const getHighlightedIndices = (text?: string, searchText: string): number[] => {
  const highlightedIndicesSet = new Set();
  let match;
  let startingIndex = 0;
  const lowerCaseSearchText = searchText.toLowerCase();
  const lowerCaseText = text ? text.toLowerCase() : "";
  while ((match = lowerCaseText.indexOf(lowerCaseSearchText, startingIndex)) !== -1) {
    range(match, match + searchText.length).forEach((index) => {
      highlightedIndicesSet.add(index);
    });
    startingIndex = match + 1;
  }

  const highlightedIndices = Array.from(highlightedIndicesSet);
  return highlightedIndices;
};

export const useGLText = ({
  text,
  searchText,
  searchTextOpen,
  selectedMatchIndex,
  setSearchTextMatches,
  searchTextMatches,
}: {|
  ...WorldSearchTextProps,
  text: Interactive<TextMarker>[],
|}): Interactive<GLTextMarker>[] => {
  const glText: Interactive<GLTextMarker>[] = React.useMemo(() => {
    let numMatches = 0;
    return text.map((marker) => {
      const scale = {
        // RViz ignores scale.x/y for text and only uses z
        x: marker.scale.z,
        y: marker.scale.z,
        z: marker.scale.z,
      };

      if (!searchText || !searchTextOpen) {
        return { ...marker, scale };
      }

      const highlightedIndices = getHighlightedIndices(marker.text, searchText);

      if (highlightedIndices.length) {
        numMatches += 1;
        const highlightedMarker = {
          ...marker,
          scale,
          highlightColor: selectedMatchIndex + 1 === numMatches ? ORANGE : YELLOW,
          highlightedIndices,
        };
        return highlightedMarker;
      }

      return { ...marker, scale };
    });
  }, [searchText, searchTextOpen, selectedMatchIndex, text]);

  const throttledSetSearchTextMatches = useCallback(throttle(setSearchTextMatches, 200, { trailing: true }), [
    setSearchTextMatches,
  ]);

  useEffect(() => {
    if (!searchTextOpen && !searchTextMatches.length) {
      return;
    }
    const matches = glText.filter((marker) => marker.highlightedIndices && marker.highlightedIndices.length);
    if (matches.length) {
      throttledSetSearchTextMatches(matches);
    } else if (!matches.length && searchTextMatches.length) {
      throttledSetSearchTextMatches([]);
    }
  }, [throttledSetSearchTextMatches, glText, searchText, searchTextMatches.length, searchTextOpen]);

  return glText;
};

export const useSearchText = (): SearchTextProps => {
  const [searchTextOpen, toggleSearchTextOpen] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [searchTextMatches, setSearchTextMatches] = useState<GLTextMarker[]>([]);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);
  const searchInputRef = useRef<?HTMLInputElement>(null);

  return {
    searchTextOpen,
    toggleSearchTextOpen,
    searchText,
    setSearchText,
    setSearchTextMatches,
    searchTextMatches,
    selectedMatchIndex,
    setSelectedMatchIndex,
    searchInputRef,
  };
};
type SearchTextComponentProps = {
  onCameraStateChange: (CameraState) => void,
  onFollowChange: (newFollowTf?: string | false, newFollowOrientation?: boolean) => void,
  cameraState: CameraState,
  rootTf: ?string,
  transforms: Transforms,
  ...SearchTextProps,
};

// Exported for tests.
export const useSearchMatches = ({
  cameraState,
  currentMatch,
  onCameraStateChange,
  rootTf,
  searchTextOpen,
  transforms,
}: {
  cameraState: CameraState,
  currentMatch: GLTextMarker,
  onCameraStateChange: (CameraState) => void,
  rootTf: ?string,
  searchTextOpen: boolean,
  transforms: Transforms,
}) => {
  const hasCurrentMatchChanged = useDeepChangeDetector([currentMatch], true);
  React.useEffect(() => {
    if (!currentMatch || !searchTextOpen || !rootTf || !hasCurrentMatchChanged) {
      return;
    }

    const { header, pose } = currentMatch;

    const output = transforms.apply(
      { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 0 } },
      pose,
      header.frame_id,
      rootTf
    );
    if (!output) {
      return;
    }
    const {
      position: { x, y, z },
    } = output;

    const targetHeading = cameraStateSelectors.targetHeading(cameraState);
    const targetOffset = [0, 0, 0];
    vec3.rotateZ(targetOffset, vec3.subtract(targetOffset, [x, y, z], cameraState.target), [0, 0, 0], targetHeading);
    onCameraStateChange({ ...cameraState, targetOffset });
  }, [cameraState, currentMatch, hasCurrentMatchChanged, onCameraStateChange, rootTf, searchTextOpen, transforms]);
};

const SearchText = React.memo<SearchTextComponentProps>(
  ({
    searchTextOpen,
    toggleSearchTextOpen,
    searchText,
    setSearchText,
    searchInputRef,
    setSelectedMatchIndex,
    selectedMatchIndex,
    searchTextMatches,
    onCameraStateChange,
    cameraState,
    transforms,
    rootTf,
  }: SearchTextComponentProps) => {
    const currentMatch = searchTextMatches[selectedMatchIndex];
    const iterateCurrentIndex = useCallback((iterator: number) => {
      const newIndex = selectedMatchIndex + iterator;
      if (newIndex >= searchTextMatches.length) {
        setSelectedMatchIndex(0);
      } else if (newIndex < 0) {
        setSelectedMatchIndex(searchTextMatches.length - 1);
      } else {
        setSelectedMatchIndex(newIndex);
      }
    }, [searchTextMatches, selectedMatchIndex, setSelectedMatchIndex]);

    React.useEffect(() => {
      if (!searchTextMatches.length) {
        setSelectedMatchIndex(0);
      }
    }, [searchTextMatches.length, setSelectedMatchIndex]);

    useSearchMatches({
      cameraState,
      currentMatch,
      onCameraStateChange,
      rootTf,
      searchTextOpen,
      transforms,
    });

    if (!searchTextOpen) {
      return (
        <Button onClick={() => toggleSearchTextOpen(!searchTextOpen)}>
          <Icon tooltip="search text markers">
            <SearchIcon />
          </Icon>
        </Button>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "row",
          padding: "0 4px",
          height: "36px" /* Hack to match the heights of the other toolbar components */,
        }}>
        <div style={{ backgroundColor: "#1A191F", padding: "0px 4px 0px 8px", borderRadius: "4px" }}>
          <Icon medium>
            <SearchIcon />
          </Icon>
          <input
            autoFocus
            ref={searchInputRef}
            type="text"
            placeholder="Find in scene"
            spellCheck={false}
            value={searchText}
            style={{ backgroundColor: "transparent" }}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key !== "Enter") {
                return;
              }
              if (e.shiftKey) {
                iterateCurrentIndex(-1);
                return;
              }
              iterateCurrentIndex(1);
            }}
          />
          <span style={{ color: colors.TEXT_MUTED, width: "50px", display: "inline-block" }}>
            {searchTextMatches.length > 0 ? selectedMatchIndex + 1 : "0"} of {searchTextMatches.length}
          </span>
        </div>
        <Icon medium onClick={() => iterateCurrentIndex(-1)}>
          <ArrowUpIcon />
        </Icon>
        <Icon medium onClick={() => iterateCurrentIndex(1)}>
          <ArrowDownIcon />
        </Icon>
        <Icon onClick={() => toggleSearchTextOpen(false)} tooltip="[esc]" medium>
          <CloseIcon />
        </Icon>
      </div>
    );
  }
);

export default SearchText;
