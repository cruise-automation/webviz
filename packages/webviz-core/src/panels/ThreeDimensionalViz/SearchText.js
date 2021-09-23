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
import { isEqual, range } from "lodash";
import memoizeOne from "memoize-one";
import React, { useState, useRef, useCallback } from "react";
import { type CameraState, cameraStateSelectors } from "regl-worldview";

import Button from "webviz-core/src/components/Button";
import Icon from "webviz-core/src/components/Icon";
import { useStringWithInlinedGlobalVariables } from "webviz-core/src/hooks/useGlobalVariables";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import { type WorldSearchTextProps } from "webviz-core/src/panels/ThreeDimensionalViz/utils/searchTextUtils";
import type { TextMarker, Color } from "webviz-core/src/types/Messages";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

// $FlowFixMe - Can't figure this one out.
export type GLTextMarker = TextMarker & {
  highlightedIndices?: number[],
  highlightColor?: Color,
};

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

export const useSearchText = ({
  initialSearchText,
  onSearchTextChanged,
}: {
  initialSearchText?: string,
  onSearchTextChanged?: (string) => void,
}): SearchTextProps => {
  const initialSearchTextRef = useRef(initialSearchText || "");
  const [searchTextOpen, setSearchTextOpen] = useState<boolean>(!!initialSearchTextRef.current);
  const [searchText, setSearchText] = useState<string>(initialSearchTextRef.current);
  const [searchTextMatches, setSearchTextMatches] = useState<GLTextMarker[]>([]);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);
  const searchInputRef = useRef<?HTMLInputElement>(null);

  // Perform string interpolation on any global variables in the searchText
  const searchTextWithInlinedVariables = useStringWithInlinedGlobalVariables(searchText);

  const updateSearchText = useCallback((text) => {
    if (onSearchTextChanged) {
      onSearchTextChanged(text);
    }
    setSearchText(text);
  }, [onSearchTextChanged]);

  const toggleSearchTextOpen = useCallback((open) => {
    setSearchTextOpen(open);
    if (!open) {
      updateSearchText("");
    }
  }, [updateSearchText]);

  return {
    searchTextOpen,
    toggleSearchTextOpen,
    searchTextWithInlinedVariables,
    setSearchText: updateSearchText,
    searchText,
    setSearchTextMatches,
    searchTextMatches,
    selectedMatchIndex,
    setSelectedMatchIndex,
    searchInputRef,
  };
};

// Exported for tests.
export class SearchCameraHandler {
  _previousMatch: ?GLTextMarker = undefined;

  focusOnSearch = memoizeOne(
    (
      cameraState: CameraState,
      onCameraStateChange: (CameraState) => void,
      rootTf: ?string,
      transforms: Transforms,
      searchTextOpen: boolean,
      currentMatch: ?GLTextMarker
    ) => {
      const hasCurrentMatchChanged = !isEqual(currentMatch, this._previousMatch);
      this._previousMatch = currentMatch;
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
    }
  );
}

const SearchText = React.memo<SearchTextProps>(
  ({
    searchTextOpen,
    toggleSearchTextOpen,
    searchText,
    setSearchText,
    searchInputRef,
    setSelectedMatchIndex,
    selectedMatchIndex,
    searchTextMatches,
  }: SearchTextProps) => {
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

    if (!searchTextOpen) {
      return (
        <Button onClick={() => toggleSearchTextOpen(!searchTextOpen)}>
          <Icon style={{ color: colors.LIGHT }} tooltip="search text markers">
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
          <Icon medium style={{ color: colors.LIGHT }}>
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
        <Icon medium onClick={() => iterateCurrentIndex(-1)} style={{ color: colors.LIGHT }}>
          <ArrowUpIcon />
        </Icon>
        <Icon medium onClick={() => iterateCurrentIndex(1)} style={{ color: colors.LIGHT }}>
          <ArrowDownIcon />
        </Icon>
        <Icon onClick={() => toggleSearchTextOpen(false)} tooltip="[esc]" medium style={{ color: colors.LIGHT }}>
          <CloseIcon />
        </Icon>
      </div>
    );
  }
);

export default SearchText;
