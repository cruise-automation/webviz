// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useCallback, type Node } from "react";

import useDimensions from "webviz-core/src/hooks/useDimensions";

type DimensionsParams = {| height: number, width: number |};
type Props = {|
  children: (DimensionsParams) => Node,
|};

// Calculates the dimensions of the parent of the element the returned ref is attached to.
export function useParentDimensions() {
  const { ref, dimensions } = useDimensions();

  const setParentRef = useCallback((el: ?HTMLElement) => {
    const parent = el?.parentElement;
    if (parent) {
      ref(parent);
    }
  }, [ref]);

  return { ref: setParentRef, dimensions };
}

// Calculates the dimensions of the parent element and passes them along to the child function.
// Works by rendering an empty div, getting the parent element, and then once we know the dimensions of the parent
// element, rendering the children. After the initial render it just observes the parent element.
// We expect the parent element to never change.
function Dimensions({ children }: Props) {
  const { ref, dimensions } = useParentDimensions();

  // This only happens during the first render - we use it to grab the parentElement of this div.
  if (dimensions == null) {
    return <div ref={ref} />;
  }
  return children(dimensions);
}

export default Dimensions;
