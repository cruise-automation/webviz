// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { range, throttle } from "lodash";

import type { Interactive } from "webviz-core/src/panels/ThreeDimensionalViz/Interactions/types";
import type { TextMarker, Color } from "webviz-core/src/types/Messages";

export const YELLOW = { r: 1, b: 0, g: 1, a: 1 };
export const ORANGE = { r: 0.97, g: 0.58, b: 0.02, a: 1 };

// $FlowFixMe - Can't figure this one out.
export type GLTextMarker = TextMarker & {
  highlightedIndices?: number[],
  highlightColor?: Color,
};

export type SetSearchTextMatches = (((GLTextMarker[]) => GLTextMarker[]) | GLTextMarker[]) => void;

export type WorldSearchTextProps = {|
  searchTextOpen: boolean,
  searchText: string,
  searchTextWithInlinedVariables: string,
  setSearchTextMatches: SetSearchTextMatches,
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

export class TextHighlighter {
  _throttledSetSearchTextMatches: (markers: GLTextMarker[]) => void;
  constructor(setSearchTextMatches: (markers: GLTextMarker[]) => void) {
    this._throttledSetSearchTextMatches = throttle(setSearchTextMatches, 200, { trailing: true });
  }

  highlightText({
    text,
    searchText,
    searchTextOpen,
    selectedMatchIndex,
    searchTextMatches,
  }: {|
    searchTextOpen: boolean,
    searchText: string,
    searchTextMatches: GLTextMarker[],
    selectedMatchIndex: number,
    text: Interactive<TextMarker>[],
  |}): Interactive<GLTextMarker>[] {
    let numMatches = 0;
    const glText: Interactive<GLTextMarker>[] = text.map((marker) => {
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
    if (searchTextOpen || searchTextMatches.length) {
      const matches = glText.filter((marker) => marker.highlightedIndices && marker.highlightedIndices.length);
      if (matches.length) {
        this._throttledSetSearchTextMatches(matches);
      } else if (!matches.length && searchTextMatches.length) {
        this._throttledSetSearchTextMatches([]);
      }
    }
    return glText;
  }
}
