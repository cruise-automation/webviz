// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import fuzzySort from "fuzzysort";
import { flatten, isEqual } from "lodash";
import * as React from "react";
import { useDrag } from "react-dnd";
import { MosaicDragType, getNodeAtPath, updateTree } from "react-mosaic-component";
import { connect } from "react-redux";
import styled from "styled-components";

import styles from "./index.module.scss";
import { changePanelLayout, savePanelConfigs } from "webviz-core/src/actions/panels";
import { Item } from "webviz-core/src/components/Menu";
import Tooltip from "webviz-core/src/components/Tooltip";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import TextHighlight from "webviz-core/src/panels/ThreeDimensionalViz/TopicGroups/TextHighlight";
import type { State } from "webviz-core/src/reducers";
import type { PanelConfig, SaveConfigsPayload } from "webviz-core/src/types/panels";
import { getPanelIdForType, getSaveConfigsPayloadForTab } from "webviz-core/src/util";
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
  presetSettings?: {| config: PanelConfig, relatedConfigs: { [panelId: string]: PanelConfig } |},
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
      const nonPresetPanels = panelsByCategory[category].filter((panel) => panel && !panel.presetSettings);
      for (const item of nonPresetPanels) {
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
  type: string,
  config: ?PanelConfig,
  relatedConfigs?: { [panelId: string]: PanelConfig },
  position: string,
  path: string,
};
type PanelItemProps = {
  panel: {| type: string, title: string, config?: PanelConfig, relatedConfigs?: { [panelId: string]: PanelConfig } |},
  searchQuery: string,
  checked?: boolean,
  onClick: () => void,
  // the props here are actually used in the dragSource
  // beginDrag and endDrag callbacks - the props are passed via react-dnd
  // so keep the flow defs here so those functions can have access to some type info
  mosaicId: string, //eslint-disable-line react/no-unused-prop-types
  onDrop: (DropDescription) => void, //eslint-disable-line react/no-unused-prop-types
};

function DraggablePanelItem(props: PanelItemProps) {
  const { searchQuery, panel, onClick, onDrop, checked } = props;
  const [__, drag] = useDrag({
    item: { type: MosaicDragType.WINDOW },
    begin: (monitor) => {
      return { mosaicId: props.mosaicId };
    },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult() || {};
      const { position, path } = dropResult;
      // dropping outside mosaic does nothing
      if (!position || !path) {
        return;
      }
      onDrop({
        type: panel.type,
        config: panel.config,
        relatedConfigs: panel.relatedConfigs,
        position,
        path,
      });
    },
  });
  return (
    <div ref={drag}>
      <Item onClick={onClick} checked={checked} className={styles.item}>
        <TextHighlight targetStr={panel.title} searchText={searchQuery} />
      </Item>
    </div>
  );
}

export type PanelSelection = {
  type: string,
  config?: PanelConfig,
  relatedConfigs?: { [panelId: string]: PanelConfig },
};
type OwnProps = {|
  onPanelSelect: (PanelSelection) => void,
  selectedPanelTitle?: string,
|};
type Props = {|
  ...OwnProps,
  mosaicId: string,
  mosaicLayout: any, // this is the opaque mosiac layout config object
  changePanelLayout: (payload: any) => void,
  savePanelConfigs: (SaveConfigsPayload) => void,
|};

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
  onPanelMenuItemDrop = (dropDescription: DropDescription) => {
    const { mosaicLayout } = this.props;
    const { config, relatedConfigs, type, position, path } = dropDescription;
    const id = getPanelIdForType(type);
    const node = getNodeAtPath(mosaicLayout, path);
    const before = position === "left" || position === "top";
    const [first, second] = before ? [id, node] : [node, id];
    const direction = position === "left" || position === "right" ? "row" : "column";
    const updates = [{ path, spec: { $set: { first, second, direction } } }];

    if (config && relatedConfigs) {
      const payload = getSaveConfigsPayloadForTab({ id, config, relatedConfigs });
      this.props.savePanelConfigs(payload);
    } else if (config) {
      this.props.savePanelConfigs({ configs: [{ id, config }] });
    }
    const newLayout = updateTree(mosaicLayout, updates);
    this.props.changePanelLayout({ layout: newLayout });
  };

  // sanity checks to help panel authors debug issues
  _verifyPanels() {
    const panelTypes: Map<
      string,
      {
        component: React.ComponentType<any>,
        presetSettings?: { config: PanelConfig, relatedConfigs: { [panelId: string]: PanelConfig } },
      }
    > = new Map();
    const panelsByCategory = getPanelsByCategory();
    for (const category in panelsByCategory) {
      for (const { component, presetSettings } of panelsByCategory[category]) {
        // $FlowFixMe - bug prevents requiring panelType: https://stackoverflow.com/q/52508434/23649
        const { name, displayName, panelType } = component;
        if (!panelType) {
          throw new Error(
            `Panel component ${displayName || name || "<unnamed>"} must declare a unique \`static panelType\``
          );
        }
        const existingPanel = panelTypes.get(panelType);
        if (existingPanel && isEqual(existingPanel.presetSettings, presetSettings)) {
          throw new Error(
            `Two components have the same panelType ('${panelType}') and same presetSettings: ${existingPanel.component
              .displayName ||
              existingPanel.component.name ||
              "<unnamed>"} and ${displayName || name || "<unnamed>"}`
          );
        }
        panelTypes.set(panelType, { component, presetSettings });
      }
    }
  }

  _handleSearchChange = (e: SyntheticInputEvent<HTMLInputElement>) => {
    // TODO(Audrey): press enter to select the first item, allow using arrow key to go up and down
    this.setState({ searchQuery: e.target.value });
  };

  render() {
    this._verifyPanels();
    const { mosaicId, onPanelSelect, selectedPanelTitle } = this.props;
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
            ({ presetSettings, title, component: { panelType } }, panelIdx) => (
              <div key={`${panelType}-${panelIdx}`}>
                {panelIdx === 0 && <Item isHeader>{label}</Item>}
                <DraggablePanelItem
                  mosaicId={mosaicId}
                  panel={{
                    type: panelType,
                    title,
                    config: presetSettings?.config,
                    relatedConfigs: presetSettings?.relatedConfigs,
                  }}
                  onDrop={this.onPanelMenuItemDrop}
                  onClick={() =>
                    onPanelSelect({
                      type: panelType,
                      config: presetSettings?.config || {},
                      relatedConfigs: presetSettings?.relatedConfigs,
                    })
                  }
                  checked={title === selectedPanelTitle}
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
export default connect<Props, OwnProps, _, _, _, _>(
  mapStateToProps,
  { changePanelLayout, savePanelConfigs }
)(PanelList);
