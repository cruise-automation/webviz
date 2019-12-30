// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { PureComponent } from "react";
import { MosaicWithoutDragDropContext, MosaicWindow } from "react-mosaic-component";
import { connect } from "react-redux";
import "react-mosaic-component/react-mosaic-component.css";

import ErrorBoundary from "./ErrorBoundary";
import { type SET_MOSAIC_ID, setMosaicId } from "webviz-core/src/actions/mosaic";
import { changePanelLayout, savePanelConfig } from "webviz-core/src/actions/panels";
import type { CHANGE_PANEL_LAYOUT, Dispatcher, SAVE_PANEL_CONFIG } from "webviz-core/src/actions/panels";
import Flex from "webviz-core/src/components/Flex";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import PanelList from "webviz-core/src/panels/PanelList";
import type { State } from "webviz-core/src/reducers";
import type { SaveConfigPayload } from "webviz-core/src/types/panels";
import { getPanelIdForType, getPanelTypeFromId } from "webviz-core/src/util";
import "./PanelLayout.scss";

type Props = {
  layout: any,
  changePanelLayout: (panels: any) => Dispatcher<CHANGE_PANEL_LAYOUT>,
  setMosaicId: (mosaicId: string) => SET_MOSAIC_ID,
  savePanelConfig: (SaveConfigPayload) => Dispatcher<SAVE_PANEL_CONFIG>,
};

// we subclass the mosiac layout without dragdropcontext
// dragdropcontext is initialized in the App container
// so components outside the mosiac component can participate
class MosaicRoot extends MosaicWithoutDragDropContext {
  componentDidMount() {
    // set the mosiac id in redux so elements outside the container
    // can use the id to register their drag intents with mosaic drop targets
    this.props.setMosaicId(this.state.mosaicId);
  }
}

class PanelLayout extends PureComponent<Props> {
  createTile = (config: any) => {
    const defaultPanelType = "RosOut";
    const type = config ? config.type || defaultPanelType : defaultPanelType;
    const id = getPanelIdForType(type);
    if (config.panelConfig) {
      this.props.savePanelConfig({ id, config: config.panelConfig, defaultConfig: {} });
    }
    return id;
  };

  renderTile = (id: string | {}, path: any) => {
    // `id` is usually a string. But when `layout` is empty, `id` will be an empty object, in which case we don't need to render Tile
    if (!id || typeof id !== "string") {
      return;
    }
    const type = getPanelTypeFromId(id);
    const PanelComponent = PanelList.getComponentForType(type);
    // if we haven't found a panel of the given type, render the panel selector
    if (!PanelComponent) {
      return (
        <MosaicWindow path={path} createNode={this.createTile}>
          <Flex col center>
            <PanelToolbar floating />
            Unknown panel type: {type}.
          </Flex>
        </MosaicWindow>
      );
    }
    return (
      <MosaicWindow path={path} createNode={this.createTile}>
        <PanelComponent childId={id} />
      </MosaicWindow>
    );
  };

  render() {
    return (
      <ErrorBoundary>
        <MosaicRoot
          renderTile={this.renderTile}
          className="none"
          resize={{ minimumPaneSizePercentage: 2 }}
          value={this.props.layout}
          onChange={this.props.changePanelLayout}
          setMosaicId={this.props.setMosaicId}
        />
      </ErrorBoundary>
    );
  }
}

export default connect<Props, {}, _, _, _, _>(
  (state: State) => ({ layout: state.panels.layout }),
  { changePanelLayout, savePanelConfig, setMosaicId },
  undefined,
  { forwardRef: true }
)(PanelLayout);
