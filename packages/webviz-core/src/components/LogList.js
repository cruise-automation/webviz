// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from "react-virtualized";
import uuid from "uuid";

import Button from "webviz-core/src/components/Button";

// TODO(Audrey): import types from react-virtualized once they are available
// RowRendererParams, CellMeasureCache
type RowRendererParams = {|
  className: string,
  columns: any[],
  index: number,
  isScrolling: boolean,
  onRowClick: ?() => void,
  onRowDoubleClick: ?() => void,
  onRowMouseOver: ?() => void,
  onRowMouseOut: ?() => void,
  rowData: any,
  style: StyleObj,
  parent?: any,
  key: number | string,
|};

type RenderRowInput<Item> = {| ...RowRendererParams, item: Item |};

export type RenderRow<Item> = (RenderRowInput<Item>) => React.Node;

// List for showing large number of items, which are expected to be appended to the end regularly.
// Automatically scrolls to the bottom unless you explicitly scroll up.
function LogList<Item>({ items, renderRow }: {| items: $ReadOnlyArray<Item>, renderRow: RenderRow<Item> |}) {
  // Automatically scrolling to the bottom by default.
  const [autoScroll, setAutoScroll] = React.useState(true);

  // For keeping a reference to the container <div>. Unfortunately there don't seem to be other
  // convenient ways to do this; e.g. `ref` doesn't work.
  const listId = React.useRef<string>(uuid.v4());

  // Cache for item heights.
  const cache = React.useRef<CellMeasurerCache>(new CellMeasurerCache({ fixedWidth: true }));

  // Keep track of the last width to see if we need to clear the cache.
  const lastWidth = React.useRef<number>(-1);

  // Keep track of the last items that we rendered to see if we need to clear the cache.
  const lastItems = React.useRef<$ReadOnlyArray<Item>>([]);

  // Last time we rendered; used in `onScroll`.
  const lastRenderTime = React.useRef<number>(0);
  lastRenderTime.current = Date.now();

  // If we have fewer items now, or if any of the old items don't match any more, we have to clear
  // the cache of heights.
  if (items.length < lastItems.current.length || !lastItems.current.every((item, index) => item === items[index])) {
    cache.current.clearAll();
  }
  lastItems.current = items;

  // `onWheel` is only called when the user explicitly scrolls using the scroll wheel or track pad.
  // This is reliable, so we don't need any buffers or checks. However, this doesn't cover all cases
  // of users scrolling (e.g. keyboard or dragging the scroll bar) so we also need `onScroll` below.
  const onWheel = React.useCallback(() => {
    const containerEl = document.getElementById(listId.current);
    if (!containerEl) {
      return;
    }
    const newAutoScroll = containerEl.scrollHeight - containerEl.scrollTop <= containerEl.clientHeight;
    if (newAutoScroll !== autoScroll) {
      setAutoScroll(newAutoScroll);
    }
  }, [autoScroll]);

  // As said above, we need `onScroll` to catch some of the user scroll events. However, it's also
  // triggered when a scroll happens for a different reason, e.g. by the browser or initiated from
  // our own code. There's unfortunately no easy way to differentiate between them, and often during
  // rendering the `onScroll` events can't quite keep up with the actual rendering, so we require
  // rendering to not have happened for a second, and we have a bit of a buffer for how much
  // scrolling we require to have been done. In practice this seems to be working reasonably well.
  const onScroll = React.useCallback(() => {
    if (Date.now() - lastRenderTime.current < 1000) {
      return;
    }
    const containerEl = document.getElementById(listId.current);
    if (!containerEl) {
      return;
    }
    const newAutoScroll = containerEl.scrollHeight - containerEl.scrollTop <= containerEl.clientHeight + 5;
    if (newAutoScroll !== autoScroll) {
      setAutoScroll(newAutoScroll);
    }
  }, [autoScroll]);

  const onResetView = React.useCallback(() => {
    setAutoScroll(true);
  }, []);

  return (
    <AutoSizer>
      {({ width, height }) => {
        // If the width changed, row heights might have changed, so we need to clear the cache.
        if (lastWidth.current !== width) {
          cache.current.clearAll();
        }
        lastWidth.current = width;

        return (
          <div style={{ position: "relative", width, height }}>
            <List
              width={width}
              height={height}
              style={{ outline: "none" }}
              deferredMeasurementCache={cache.current}
              rowHeight={cache.current.rowHeight}
              rowRenderer={(rowProps) => (
                <CellMeasurer
                  key={rowProps.key}
                  cache={cache.current}
                  parent={rowProps.parent}
                  columnIndex={0}
                  rowIndex={rowProps.index}>
                  {renderRow({ ...rowProps, item: items[rowProps.index] })}
                </CellMeasurer>
              )}
              rowCount={items.length}
              overscanRowCount={10}
              onScroll={onScroll}
              id={listId.current}
              containerProps={{ onWheel }}
              {...(autoScroll ? { scrollToIndex: items.length - 1 } : undefined)}
            />
            {!autoScroll && (
              <div style={{ position: "absolute", bottom: 5, right: 10 }}>
                <Button tooltip="(shortcut: scroll down)" onClick={onResetView}>
                  reset view
                </Button>
              </div>
            )}
          </div>
        );
      }}
    </AutoSizer>
  );
}

export default LogList;
