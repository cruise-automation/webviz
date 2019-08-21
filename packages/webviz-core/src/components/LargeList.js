// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ClipboardOutlineIcon from "@mdi/svg/svg/clipboard-outline.svg";
import _ from "lodash";
import * as React from "react";
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from "react-virtualized";
import styled from "styled-components";

import Icon from "webviz-core/src/components/Icon";
import clipboard from "webviz-core/src/util/clipboard";
import { toolsColorScheme } from "webviz-core/src/util/toolsColorScheme";

const RenderRowContainer = styled.div`
  display: flex;
  padding: 4px;
  z-index: 0;
`;
const LargeListContainer = styled.div`
  flex-grow: 1;
  position: relative;
`;
const LogMsg = styled.div`
  position: absolute;
  top: 32px;
  right: 12px;
  z-index: 1;
  display: flex;
  border-radius: 4px;
  background: ${toolsColorScheme.base.dark};
  color: rgba(255, 255, 255, 0.5);
  padding: 0px 8px;
`;

const DEFAULT_ROW_HEIGHT = 16;

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

type RenderRowInput<Item> = {| ...RowRendererParams, items: Item[], item: Item |};

export type RenderRow<Item> = (RenderRowInput<Item>) => React.Node;

type Props<Item> = {
  defaultRowHeight: number,
  items: Item[],
  renderRow: RenderRow<Item>,
  disableScrollToBottom: boolean,
  cleared?: boolean,
  enableCopying?: boolean,
  copyButtonTooltip?: string,
};

const defaultRenderRow: RenderRow<any> = ({ index, key, style, items }) => {
  return (
    <RenderRowContainer style={style}>
      <span style={{ marginRight: 4 }}>{index}</span>
      <span>{items[index].text}</span>
      <span>{items[index].msg}</span>
    </RenderRowContainer>
  );
};

function CopyIcon({ tooltip, getCopyText }: { tooltip: string, getCopyText: () => string }) {
  return (
    <Icon
      style={{ padding: "1px 0px 0px 6px", verticalAlign: "middle" }}
      onClick={() => clipboard.copy(getCopyText())}
      tooltip={tooltip}>
      <ClipboardOutlineIcon />
    </Icon>
  );
}

/**
 * <LargeList> is a reusable responsive component for displaying large amount of logs or similar data.
 * We can use renderRow to create custom UI for each data row.
 * There might be short lag if we resize the container when the data is already rendered.
 */
class LargeList<Item> extends React.Component<Props<Item>, {}> {
  _cache: CellMeasurerCache = {};

  static defaultProps = {
    // Set to true if we don't want the screen to auto scroll to the bottom.
    disableScrollToBottom: false,
    // All the data items.
    items: [],
    // Custom rendering function for each row.
    renderRow: defaultRenderRow,
    // Use defaultRowHeight to set the default row height to improve performance as
    // each row's height is dynamically calculated.
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
  };

  constructor(props: Props<Item>) {
    super(props);
    this._cache = new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: props.defaultRowHeight,
    });
  }

  componentDidUpdate(prevProps: Props<Item>) {
    // Clear the cache to prevent cells from using outdated measurements
    if (this.props.cleared) {
      this._cache.clearAll();
    }
  }

  render() {
    const { items, renderRow, disableScrollToBottom, enableCopying, copyButtonTooltip } = this.props;
    const addedProps = disableScrollToBottom ? {} : { scrollToIndex: items.length - 1 };
    const logCounts = items.length;

    return (
      <LargeListContainer>
        {logCounts > 0 && (
          <LogMsg>
            {logCounts} {logCounts > 1 ? "items" : "item"}
            {enableCopying && (
              <CopyIcon getCopyText={() => JSON.stringify(items, null, 2)} tooltip={copyButtonTooltip || "Copy"} />
            )}
          </LogMsg>
        )}
        <AutoSizer>
          {({ height, width }) => {
            return (
              <List
                width={width}
                height={height}
                style={{ outline: "none" }}
                deferredMeasurementCache={this._cache}
                rowHeight={this._cache.rowHeight}
                rowRenderer={(rowProps) => (
                  <CellMeasurer
                    key={rowProps.key}
                    cache={this._cache}
                    parent={rowProps.parent}
                    columnIndex={0}
                    rowIndex={rowProps.index}>
                    {renderRow({ ...rowProps, items, item: items[rowProps.index] })}
                  </CellMeasurer>
                )}
                rowCount={items.length}
                overscanRowCount={10}
                {...addedProps}
              />
            );
          }}
        </AutoSizer>
      </LargeListContainer>
    );
  }
}

export default LargeList;
