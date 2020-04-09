// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback, useState, forwardRef, type ElementRef } from "react";
import { MosaicWithoutDragDropContext, MosaicWindow } from "react-mosaic-component";
import { useSelector, useDispatch } from "react-redux";
import "react-mosaic-component/react-mosaic-component.css";
import { bindActionCreators } from "redux";

import ErrorBoundary from "./ErrorBoundary";
import { setMosaicId } from "webviz-core/src/actions/mosaic";
import {
  changePanelLayout,
  savePanelConfigs,
  type Dispatcher,
  type SAVE_PANEL_CONFIGS,
} from "webviz-core/src/actions/panels";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import SpinningLoadingIcon from "webviz-core/src/components/SpinningLoadingIcon";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import PanelList from "webviz-core/src/panels/PanelList";
import type { State } from "webviz-core/src/reducers";
import type { SaveConfigsPayload } from "webviz-core/src/types/panels";
import { getPanelIdForType, getPanelTypeFromId } from "webviz-core/src/util";
import "./PanelLayout.scss";

type Props = {
  layout: any,
  onChange: (panels: any) => void,
  setMosaicId: (mosaicId: string) => void,
  savePanelConfigs: (SaveConfigsPayload) => Dispatcher<SAVE_PANEL_CONFIGS>,
  importHooks: boolean,
  forwardedRef?: ElementRef<any>,
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

export function UnconnectedPanelLayout(props: Props) {
  const { importHooks, layout, onChange, savePanelConfigs: saveConfigs } = props;
  const [hooksImported, setHooksImported] = useState(getGlobalHooks().areHooksImported());

  if (importHooks && !hooksImported) {
    const globalHooks = getGlobalHooks();
    globalHooks
      .importHooksAsync()
      .then(() => {
        globalHooks.perPanelHooks().installChartJs();
        setHooksImported({ hooksImported: true });
      })
      .catch((reason) => {
        console.error(`Import failed ${reason}`);
      });
  }

  const createTile = useCallback(
    (config: any) => {
      const defaultPanelType = "RosOut";
      const type = config ? config.type || defaultPanelType : defaultPanelType;
      const id = getPanelIdForType(type);
      if (config.panelConfig) {
        saveConfigs({ configs: [{ id, config: config.panelConfig }] });
      }
      return id;
    },
    [saveConfigs]
  );

  const renderTile = useCallback(
    (id: string | {}, path: any) => {
      // `id` is usually a string. But when `layout` is empty, `id` will be an empty object, in which case we don't need to render Tile
      if (!id || typeof id !== "string") {
        return;
      }
      const type = getPanelTypeFromId(id);
      const PanelComponent = PanelList.getComponentForType(type);
      // if we haven't found a panel of the given type, render the panel selector
      if (!PanelComponent) {
        return (
          <MosaicWindow path={path} createNode={createTile} renderPreview={() => null}>
            <Flex col center>
              <PanelToolbar floating />
              Unknown panel type: {type}.
            </Flex>
          </MosaicWindow>
        );
      }
      return (
        <MosaicWindow key={path} path={path} createNode={createTile} renderPreview={() => null}>
          <PanelComponent childId={id} />
        </MosaicWindow>
      );
    },
    [createTile]
  );

  return (
    <ErrorBoundary ref={props.forwardedRef}>
      {hooksImported ? (
        <MosaicRoot
          renderTile={renderTile}
          className="none"
          resize={{ minimumPaneSizePercentage: 2 }}
          value={layout}
          onChange={onChange}
          setMosaicId={props.setMosaicId}
        />
      ) : (
        <Flex center style={{ width: "100%", height: "100%" }}>
          <Icon large>
            <SpinningLoadingIcon />
          </Icon>
        </Flex>
      )}
    </ErrorBoundary>
  );
}

const ConnectedPanelLayout = ({ importHooks = true }: { importHooks?: boolean }, ref) => {
  const layout = useSelector((state: State) => state.panels.layout);
  const dispatch = useDispatch();
  const actions = React.useMemo(
    () => bindActionCreators({ changePanelLayout, savePanelConfigs, setMosaicId }, dispatch),
    [dispatch]
  );
  const onChange = useCallback(
    (newLayout: any) => {
      actions.changePanelLayout({ layout: newLayout });
    },
    [actions]
  );
  return (
    <UnconnectedPanelLayout
      forwardedRef={ref}
      importHooks={importHooks}
      layout={layout}
      onChange={onChange}
      savePanelConfigs={actions.savePanelConfigs}
      setMosaicId={actions.setMosaicId}
    />
  );
};
export default forwardRef<{ importHooks?: boolean }, _>((props, ref) => ConnectedPanelLayout(props, ref));
