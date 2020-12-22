// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useEffect, useState, useCallback, type Node } from "react";

type DimensionsParams = {| height: number, width: number, left: number, top: number |};
type Props = {|
  children: (DimensionsParams) => Node,
|};

// Jest does not include ResizeObserver.
class ResizeObserverMock {
  _callback: (ResizeObserverEntry[]) => void;
  constructor(callback) {
    this._callback = callback;
  }

  observe() {
    const entry: any = { contentRect: { width: 150, height: 150 } };
    this._callback([entry]);
  }
  unobserve() {}
}
const ResizeObserverImpl = process.env.NODE_ENV === "test" ? (ResizeObserverMock: any) : ResizeObserver;

// Calculates the dimensions of the parent element, and passes those dimensions to the child function.
// Uses resizeObserver, which is very performant.
// Works by rendering an empty div, getting the parent element, and then once we know the dimensions of the parent
// element, rendering the children. After the initial render it just observes the parent element.
// We expect the parent element to never change.
export default function Dimensions({ children }: Props) {
  const [parentElement, setParentElement] = useState(undefined);
  const [dimensions, setDimensions] = useState<?DimensionsParams>();
  // This resizeObserver should never change.
  const [resizeObserver] = useState<ResizeObserver>(
    () =>
      new ResizeObserverImpl((entries) => {
        if (!entries || !entries.length) {
          return;
        }

        // We only observe a single element, so just use the first entry.
        // We have to round because these could be sub-pixel values.
        const newWidth = Math.round(entries[0].contentRect.width);
        const newHeight = Math.round(entries[0].contentRect.height);
        const newLeft = Math.round(entries[0].contentRect.left);
        const newTop = Math.round(entries[0].contentRect.top);
        setDimensions({ width: newWidth, height: newHeight, top: newTop, left: newLeft });
      })
  );

  // This should only fire once, because `dimensions` should only be undefined at the beginning.
  const setParentElementRef = useCallback((element) => {
    if (element) {
      setParentElement(element.parentElement);
    }
  }, []);

  useEffect(() => {
    if (!parentElement) {
      return;
    }
    resizeObserver.observe(parentElement);
    // Make sure to unobserve when we unmount the component.
    return () => resizeObserver.unobserve(parentElement);
  }, [parentElement, resizeObserver]);

  // This only happens during the first render - we use it to grab the parentElement of this div.
  if (dimensions == null) {
    return <div ref={setParentElementRef} />;
  }
  return children(dimensions);
}
