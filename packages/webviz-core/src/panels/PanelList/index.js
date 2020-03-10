// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import fuzzySort from "fuzzysort";
import { flatten } from "lodash";
import * as React from "react";
import { DragSource } from "react-dnd";
import { MosaicDragType, getNodeAtPath, updateTree } from "react-mosaic-component";
import { connect } from "react-redux";
import styled from "styled-components";

import styles from "./index.module.scss";
import { changePanelLayout, savePanelConfig } from "webviz-core/src/actions/panels";
import { Item } from "webviz-core/src/components/Menu";
import SubMenu from "webviz-core/src/components/Menu/SubMenu";
import Tooltip from "webviz-core/src/components/Tooltip";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import TextHighlight from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/TextHighlight";
import type { State } from "webviz-core/src/reducers";
import type { PanelConfig, SaveConfigPayload } from "webviz-core/src/types/panels";
import { getPanelIdForType } from "webviz-core/src/util";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const SearchInput = styled.input`
  width: 100%;
  min-width: 200px;
  background-color: ${colors.DARK2} !important;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 2;
`;

type PanelListItem = {|
  title: string,
  component: React.ComponentType<any>,
  presets?: {| title: string, panelConfig?: PanelConfig |}[],
|};

// getPanelsByCategory() and getPanelsByType() are functions rather than top-level constants
// in order to avoid issues with circular imports, such as
// FooPanel -> PanelToolbar -> PanelList -> getGlobalHooks().panelsByCategory() -> FooPanel.
let gPanelsByCategory;
function getPanelsByCategory(): { [string]: PanelListItem[] } {
  if (!gPanelsByCategory) {
    gPanelsByCategory = getGlobalHooks().panelsByCategory();

    for (const category in gPanelsByCategory) {
      gPanelsByCategory[category] = gPanelsByCategory[category].filter(Boolean);
    }
  }
  return gPanelsByCategory;
}

let gPanelsByType;
export function getPanelsByType(): { [type: string]: PanelListItem } {
  if (!gPanelsByType) {
    gPanelsByType = {};
    const panelsByCategory = getPanelsByCategory();
    for (const category in panelsByCategory) {
      for (const item of panelsByCategory[category]) {
        // $FlowFixMe - bug prevents requiring panelType: https://stackoverflow.com/q/52508434/23649
        const panelType = item.component.panelType;
        console.assert(panelType && !(panelType in gPanelsByType));
        gPanelsByType[panelType] = item;
      }
    }
  }
  return gPanelsByType;
}

type DropDescription = {
  panelType: string,
  panelConfig: ?PanelConfig,
  position: string,
  path: string,
};
type PanelItemProps = {
  panel: {|
    type: string,
    title: string,
    panelConfig?: PanelConfig,
  |},
  searchQuery: string,
  checked?: boolean,
  // this comes from react-dnd
  connectDragSource: (any) => React.Node,
  onClick: () => void,
  // the props here are actually used in the dragSource
  // beginDrag and endDrag callbacks - the props are passed via react-dnd
  // so keep the flow defs here so those functions can have access to some type info
  mosaicId: string, //eslint-disable-line react/no-unused-prop-types
  onDrop: (DropDescription) => void, //eslint-disable-line react/no-unused-prop-types
};

class PanelItem extends React.Component<PanelItemProps> {
  render() {
    const { connectDragSource, searchQuery, panel, onClick, checked } = this.props;
    return connectDragSource(
      <div>
        <Item onClick={onClick} checked={checked} className={styles.item}>
          <TextHighlight targetStr={panel.title} searchText={searchQuery} />
        </Item>
      </div>
    );
  }
}
// react-dnd based config for what to do on drag events
const dragConfig = {
  beginDrag: (props: PanelItemProps, monitor, component) => {
    return {
      mosaicId: props.mosaicId,
    };
  },
  endDrag: (props: PanelItemProps, monitor, component) => {
    const dropResult = monitor.getDropResult() || {};
    const { position, path } = dropResult;

    // dropping outside mosiac does nothing
    if (!position || !path) {
      return;
    }
    props.onDrop({
      panelType: props.panel.type,
      panelConfig: props.panel.panelConfig,
      position,
      path,
    });
  },
};
// boilerplate required by react-dnd
const DraggablePanelItem = DragSource(MosaicDragType.WINDOW, dragConfig, (connectArg, monitor) => {
  return {
    connectDragSource: connectArg.dragSource(),
  };
})(PanelItem);

type OwnProps = {|
  onPanelSelect: (panelType: string, panelConfig?: PanelConfig) => void,
  selectedPanelType?: string,
|};
type Props = {
  ...OwnProps,
  mosaicId: string,
  mosaicLayout: any, // this is the opaque mosiac layout config object
  changePanelLayout: (panelLayout: any) => void,
  savePanelConfig: (SaveConfigPayload) => void,
};
class PanelList extends React.Component<Props, { searchQuery: string }> {
  state = { searchQuery: "" };
  static getComponentForType(type: string): any | void {
    const panelsByCategory = getPanelsByCategory();
    const allPanels = flatten(Object.keys(panelsByCategory).map((category) => panelsByCategory[category]));
    // $FlowFixMe - bug prevents requiring panelType: https://stackoverflow.com/q/52508434/23649
    const panel = allPanels.find((item) => item.component.panelType === type);
    return panel && panel.component;
  }

  // when a panel menu item is dropped
  // we need to update the panel layout in redux
  // the actual operations to change the layout
  // are supplied by react-mosaic-component
  onPanelMenuItemDrop = (config: DropDescription) => {
    const { mosaicLayout } = this.props;
    const { panelType, position, path } = config;
    const newNode = getPanelIdForType(panelType);
    const node = getNodeAtPath(mosaicLayout, path);
    const before = position === "left" || position === "top";
    const [first, second] = before ? [newNode, node] : [node, newNode];
    const direction = position === "left" || position === "right" ? "row" : "column";
    const updates = [
      {
        path,
        spec: {
          $set: { first, second, direction },
        },
      },
    ];
    if (config.panelConfig) {
      this.props.savePanelConfig({ id: newNode, config: config.panelConfig, defaultConfig: {} });
    }
    const newLayout = updateTree(mosaicLayout, updates);
    this.props.changePanelLayout(newLayout);
  };

  // sanity checks to help panel authors debug issues
  _verifyPanels() {
    const panelTypes: Map<string, React.ComponentType<any>> = new Map();
    const panelsByCategory = getPanelsByCategory();
    for (const category in panelsByCategory) {
      for (const { component } of panelsByCategory[category]) {
        // $FlowFixMe - bug prevents requiring panelType: https://stackoverflow.com/q/52508434/23649
        const { name, displayName, panelType } = component;
        if (!panelType) {
          throw new Error(
            `Panel component ${displayName || name || "<unnamed>"} must declare a unique \`static panelType\``
          );
        }
        const existingPanel = panelTypes.get(panelType);
        if (existingPanel) {
          throw new Error(
            `Two components have the same panelType ('${panelType}'): ${existingPanel.displayName ||
              existingPanel.name ||
              "<unnamed>"} and ${displayName || name || "<unnamed>"}`
          );
        }
        panelTypes.set(panelType, component);
      }
    }
  }

  _handleSearchChange = (e: SyntheticInputEvent<HTMLInputElement>) => {
    // TODO(Audrey): press enter to select the first item, allow using arrow key to go up and down
    this.setState({ searchQuery: e.target.value });
  };

  render() {
    this._verifyPanels();
    const { mosaicId, onPanelSelect, selectedPanelType } = this.props;
    const { searchQuery } = this.state;
    const panelCategories = getGlobalHooks().panelCategories();
    const panelsByCategory = getPanelsByCategory();

    return (
      <div data-test-panel-category>
        <div style={{ position: "sticky", top: 0 }}>
          <Tooltip contents="click or drag panels" placement="left" defaultShown>
            <div style={{ position: "relative", pointerEvents: "none", top: 45 }} />
          </Tooltip>
        </div>
        <SearchInput
          type="search"
          placeholder="Filter panels"
          value={searchQuery}
          onChange={this._handleSearchChange}
          autoFocus
        />
        {panelCategories.map(({ label, key }, categoryIdx) => {
          let items = panelsByCategory[key];
          if (searchQuery) {
            items = fuzzySort.go(searchQuery, items, { key: "title" }).map((searchResult) => searchResult.obj);
          }

          return items.map(
            // $FlowFixMe - bug prevents requiring panelType: https://stackoverflow.com/q/52508434/23649
            ({ presets, title, component: { panelType } }, panelIdx) =>
              presets ? (
                <SubMenu
                  text={<TextHighlight targetStr={title} searchText={searchQuery} />}
                  key={panelType}
                  style={{ zIndex: 1 }}
                  checked={panelType === selectedPanelType}>
                  {presets.map((subPanelListItem) => (
                    <DraggablePanelItem
                      key={subPanelListItem.title}
                      mosaicId={mosaicId}
                      panel={{
                        type: panelType,
                        title: subPanelListItem.title,
                        panelConfig: subPanelListItem.panelConfig,
                      }}
                      onDrop={this.onPanelMenuItemDrop}
                      onClick={() => onPanelSelect(panelType, subPanelListItem.panelConfig)}
                      searchQuery=""
                    />
                  ))}
                </SubMenu>
              ) : (
                <div key={panelType}>
                  {panelIdx === 0 && <Item isHeader>{label}</Item>}
                  <DraggablePanelItem
                    mosaicId={mosaicId}
                    panel={{ type: panelType, title }}
                    onDrop={this.onPanelMenuItemDrop}
                    onClick={() => onPanelSelect(panelType)}
                    checked={panelType === selectedPanelType}
                    searchQuery={searchQuery}
                  />
                </div>
              )
          );
        })}
      </div>
    );
  }
}

const mapStateToProps = (state: State) => ({
  mosaicId: state.mosaic.mosaicId,
  mosaicLayout: state.panels.layout,
});
export default (connect<Props, OwnProps, _, _, _, _>(
  mapStateToProps,
  { changePanelLayout, savePanelConfig }
)(PanelList): typeof PanelList);
