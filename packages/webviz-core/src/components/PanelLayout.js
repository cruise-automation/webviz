// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useCallback, useMemo, useState, forwardRef, type ElementRef } from "react";
import { MosaicWithoutDragDropContext, MosaicWindow, MosaicDumbWindow } from "react-mosaic-component";
import { useSelector, useDispatch } from "react-redux";
import "react-mosaic-component/react-mosaic-component.css";
import { bindActionCreators } from "redux";

import ErrorBoundary from "./ErrorBoundary";
import "./PanelLayout.scss";
import { setMosaicId } from "webviz-core/src/actions/mosaic";
import { changePanelLayout, savePanelConfigs, type SAVE_PANEL_CONFIGS } from "webviz-core/src/actions/panels";
import { useExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import SpinningLoadingIcon from "webviz-core/src/components/SpinningLoadingIcon";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import PanelList from "webviz-core/src/panels/PanelList";
import { EmptyDropTarget } from "webviz-core/src/panels/Tab/EmptyDropTarget";
import type { State, Dispatcher } from "webviz-core/src/reducers";
import type { MosaicNode, SaveConfigsPayload } from "webviz-core/src/types/panels";
import { getPanelIdForType, getPanelTypeFromId } from "webviz-core/src/util/layout";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

type Props = {
  layout: ?MosaicNode,
  onChange: (panels: any) => void,
  setMosaicId: (mosaicId: string) => void,
  savePanelConfigs: (SaveConfigsPayload) => Dispatcher<SAVE_PANEL_CONFIGS>,
  importHooks: boolean,
  forwardedRef?: ElementRef<any>,
  mosaicId?: string,
  tabId?: string,
  /*
   * React mosaic adds a DropTarget wrapper around the mosaic root; remove for
   * Tab panels so that users can correctly drag panels in from the outer
   * layout.
   */
  removeRootDropTarget?: boolean,
};

// we subclass the mosaic layout without dragdropcontext
// dragdropcontext is initialized in the App container
// so components outside the mosaic component can participate
class MosaicRoot extends MosaicWithoutDragDropContext {
  componentDidMount() {
    // set the mosaic id in redux so elements outside the container
    // can use the id to register their drag intents with mosaic drop targets
    this.props.setMosaicId(this.state.mosaicId);
    if (window.webviz_hideLoadingLogo) {
      window.webviz_hideLoadingLogo();
    }
  }
}

export function UnconnectedPanelLayout(props: Props) {
  const { importHooks, layout, onChange, savePanelConfigs: saveConfigs, tabId, removeRootDropTarget, mosaicId } = props;
  const [hooksImported, setHooksImported] = useState(getGlobalHooks().areHooksImported());

  if (importHooks && !hooksImported) {
    const globalHooks = getGlobalHooks();
    globalHooks
      .importHooksAsync()
      .then(() => {
        setHooksImported({ hooksImported: true });
      })
      .catch((reason) => {
        console.error(`Import failed ${reason}`);
      });
  }

  const createTile = useCallback((config: any) => {
    const defaultPanelType = "RosOut";
    const type = config ? config.type || defaultPanelType : defaultPanelType;
    const id = getPanelIdForType(type);
    if (config.panelConfig) {
      saveConfigs({ configs: [{ id, config: config.panelConfig }] });
    }
    return id;
  }, [saveConfigs]);

  const renderTile = useCallback((id: string | {}, path: any) => {
    // `id` is usually a string. But when `layout` is empty, `id` will be an empty object, in which case we don't need to render Tile
    if (!id || typeof id !== "string") {
      return;
    }
    const type = getPanelTypeFromId(id);
    const MosaicWindowComponent = type === "Tab" ? MosaicDumbWindow : MosaicWindow;

    return (
      <MosaicWindowComponent key={path} path={path} createNode={createTile} renderPreview={() => null} tabId={tabId}>
        {(() => {
          if (!hooksImported) {
            return null;
          }
          // If we haven't found a panel of the given type, render the panel selector
          const PanelComponent = PanelList.getComponentForType(type);
          if (!PanelComponent) {
            return (
              <MosaicWindow path={path} createNode={createTile} renderPreview={() => null}>
                <Flex col center>
                  <PanelToolbar floating isUnknownPanel />
                  Unknown panel type: {type}.
                </Flex>
              </MosaicWindow>
            );
          }
          return <PanelComponent childId={id} tabId={tabId} />;
        })()}
        <div
          style={{
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            position: "absolute",
            background: colors.DARK2,
            opacity: hooksImported ? 0 : 1,
            pointerEvents: "none",
            zIndex: 1,
            transition: `all ${0.35}s ease-out ${Math.random() + 0.25}s`,
          }}>
          <Flex center style={{ width: "100%", height: "100%" }}>
            <Icon large>
              <SpinningLoadingIcon />
            </Icon>
          </Flex>
        </div>
      </MosaicWindowComponent>
    );
  }, [createTile, hooksImported, tabId]);
  const isDemoMode = useExperimentalFeature("demoMode");
  const bodyToRender = useMemo(
    () =>
      layout ? (
        <MosaicRoot
          renderTile={renderTile}
          className={isDemoMode ? "borderless" : "none"}
          resize={{ minimumPaneSizePercentage: 2 }}
          value={layout}
          onChange={onChange}
          setMosaicId={props.setMosaicId}
          mosaicId={mosaicId}
          removeRootDropTarget={removeRootDropTarget}
        />
      ) : (
        <EmptyDropTarget tabId={tabId} mosaicId={mosaicId} />
      ),
    [isDemoMode, layout, mosaicId, onChange, props.setMosaicId, removeRootDropTarget, renderTile, tabId]
  );

  return <ErrorBoundary ref={props.forwardedRef}>{bodyToRender}</ErrorBoundary>;
}

const ConnectedPanelLayout = ({ importHooks = true }: { importHooks?: boolean }, ref) => {
  const layout = useSelector((state: State) => state.persistedState.panels.layout);
  const dispatch = useDispatch();
  const actions = React.useMemo(
    () => bindActionCreators({ changePanelLayout, savePanelConfigs, setMosaicId }, dispatch),
    [dispatch]
  );
  const onChange = useCallback((newLayout: MosaicNode) => {
    actions.changePanelLayout({ layout: newLayout });
  }, [actions]);
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
