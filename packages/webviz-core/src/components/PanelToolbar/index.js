// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ArrowSplitHorizontalIcon from "@mdi/svg/svg/arrow-split-horizontal.svg";
import ArrowSplitVerticalIcon from "@mdi/svg/svg/arrow-split-vertical.svg";
import CheckboxMultipleBlankOutlineIcon from "@mdi/svg/svg/checkbox-multiple-blank-outline.svg";
import DragIcon from "@mdi/svg/svg/drag.svg";
import FullscreenIcon from "@mdi/svg/svg/fullscreen.svg";
import JsonIcon from "@mdi/svg/svg/json.svg";
import SettingsIcon from "@mdi/svg/svg/settings.svg";
import TrashCanOutlineIcon from "@mdi/svg/svg/trash-can-outline.svg";
import cx from "classnames";
import * as React from "react"; // eslint-disable-line import/no-duplicates
import { useContext, useState, useCallback } from "react"; // eslint-disable-line import/no-duplicates
import Dimensions from "react-container-dimensions";
import { getNodeAtPath, MosaicContext, MosaicWindowContext } from "react-mosaic-component";
// $FlowFixMe - typedefs do not recognize the ReactReduxContext import
import { connect, ReactReduxContext } from "react-redux";

import HelpButton from "./HelpButton";
import styles from "./index.module.scss";
import MosaicDragHandle from "./MosaicDragHandle";
import { savePanelConfigs as savePanelConfigsAction } from "webviz-core/src/actions/panels";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";
import { Item, SubMenu } from "webviz-core/src/components/Menu";
import PanelContext from "webviz-core/src/components/PanelContext";
import { getPanelTypeFromMosaic } from "webviz-core/src/components/PanelToolbar/utils";
import renderToBody from "webviz-core/src/components/renderToBody";
import ShareJsonModal from "webviz-core/src/components/ShareJsonModal";
import PanelList, { type PanelSelection } from "webviz-core/src/panels/PanelList";
import type { SaveConfigsPayload } from "webviz-core/src/types/panels";
import { getPanelIdForType, getSaveConfigsPayloadForTab, getPanelIdsInsideTabPanels } from "webviz-core/src/util";
import frameless from "webviz-core/src/util/frameless";
import { TAB_PANEL_TYPE } from "webviz-core/src/util/globalConstants";

type Props = {|
  children?: React.Node,
  floating?: boolean,
  helpContent?: React.Node,
  menuContent?: React.Node,
  showPanelName?: boolean,
  additionalIcons?: React.Node,
  hideToolbars?: boolean,
  showHiddenControlsOnHover?: boolean,
|};

// separated into a sub-component so it can always skip re-rendering
// it never changes after it initially mounts
function StandardMenuItems({ savePanelConfigs }: {| savePanelConfigs: (SaveConfigsPayload) => void |}) {
  const { mosaicActions } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);

  const getPanelType = useCallback(() => getPanelTypeFromMosaic(mosaicWindowActions, mosaicActions), [
    mosaicActions,
    mosaicWindowActions,
  ]);

  const close = useCallback(
    () => {
      window.ga("send", "event", "Panel", "Close", getPanelType());
      mosaicActions.remove(mosaicWindowActions.getPath());
    },
    [getPanelType, mosaicActions, mosaicWindowActions]
  );

  const split = useCallback(
    (store, id: ?string, direction: "row" | "column") => {
      const type = getPanelType();
      if (!id || !type) {
        throw new Error("Trying to split unknown panel!");
      }
      window.ga("send", "event", "Panel", "Split", type);

      const savedProps = store.getState().panels.savedProps;
      const config = savedProps[id];
      const newId = getPanelIdForType(type);
      if (type === TAB_PANEL_TYPE) {
        const relatedConfigs = getPanelIdsInsideTabPanels([id], savedProps).reduce(
          (result, panelId) => ({ ...result, [panelId]: savedProps[panelId] }),
          {}
        );
        const payload = getSaveConfigsPayloadForTab({ id: newId, config, relatedConfigs });
        savePanelConfigs(payload);
      } else if (config) {
        savePanelConfigs({ configs: [{ id: newId, config }] });
      }

      const path = mosaicWindowActions.getPath();
      const root = mosaicActions.getRoot();
      mosaicActions.replaceWith(path, { direction, first: getNodeAtPath(root, path), second: newId });
    },
    [getPanelType, mosaicActions, mosaicWindowActions, savePanelConfigs]
  );

  const swap = useCallback(
    ({ type, config, relatedConfigs }: PanelSelection) => {
      window.ga("send", "event", "Panel", "Swap", type);
      if (config && relatedConfigs) {
        const newId = getPanelIdForType(type);
        const { configs } = getSaveConfigsPayloadForTab({ id: newId, config, relatedConfigs });
        savePanelConfigs({ configs });
        const tabConfigObj = configs.find(({ id }) => id === newId) || {};
        mosaicWindowActions.replaceWithNew({ type, panelConfig: tabConfigObj.config });
      } else {
        mosaicWindowActions.replaceWithNew({ type, panelConfig: config });
      }
    },
    [mosaicWindowActions, savePanelConfigs]
  );

  const onImportClick = useCallback(
    (store, id) => {
      if (!id) {
        return;
      }
      const panelConfigById = store.getState().panels.savedProps;
      const modal = renderToBody(
        <ShareJsonModal
          onRequestClose={() => modal.remove()}
          value={panelConfigById[id] || {}}
          onChange={(config) => savePanelConfigs({ configs: [{ id, config, override: true }] })}
          noun="panel configuration"
        />
      );
    },
    [savePanelConfigs]
  );

  const type = getPanelType();
  if (!type) {
    return null;
  }

  const isOnlyPanel = mosaicWindowActions.getPath().length === 0;
  return (
    <ReactReduxContext.Consumer>
      {({ store }) => (
        <PanelContext.Consumer>
          {(panelContext) => (
            <>
              <SubMenu text="Change panel" icon={<CheckboxMultipleBlankOutlineIcon />}>
                <PanelList selectedPanelTitle={panelContext?.title} onPanelSelect={swap} />
              </SubMenu>
              <Item
                icon={<FullscreenIcon />}
                onClick={panelContext?.enterFullscreen}
                dataTest="panel-settings-fullscreen"
                tooltip="(shortcut: ` or ~)">
                Fullscreen
              </Item>
              <Item
                icon={<ArrowSplitHorizontalIcon />}
                onClick={() => split(store, panelContext?.id, "column")}
                dataTest="panel-settings-hsplit"
                tooltip="(shortcut: ` or ~)">
                Split horizontal
              </Item>
              <Item
                icon={<ArrowSplitVerticalIcon />}
                onClick={() => split(store, panelContext?.id, "row")}
                dataTest="panel-settings-vsplit"
                tooltip="(shortcut: ` or ~)">
                Split vertical
              </Item>
              <Item icon={<TrashCanOutlineIcon />} onClick={close} disabled={isOnlyPanel} tooltip="(shortcut: ` or ~)">
                Remove panel
              </Item>
              <Item
                icon={<JsonIcon />}
                onClick={() => onImportClick(store, panelContext?.id)}
                dataTest="panel-settings-config">
                Import/export panel settings
              </Item>
            </>
          )}
        </PanelContext.Consumer>
      )}
    </ReactReduxContext.Consumer>
  );
}

const ConnectedStandardMenuItems = connect(
  null,
  { savePanelConfigs: savePanelConfigsAction }
)(StandardMenuItems);

type PanelToolbarControlsProps = {|
  ...Props,
  isRendered: boolean,
  onDragStart: () => void,
  onDragEnd: () => void,
|};

// Keep controls, which don't change often, in a pure component in order to avoid re-rendering the
// whole PanelToolbar when only children change.
const PanelToolbarControls = React.memo(function PanelToolbarControls(props: PanelToolbarControlsProps) {
  const panelData = useContext(PanelContext);
  const { floating, helpContent, menuContent, showPanelName, additionalIcons, showHiddenControlsOnHover } = props;
  const { isRendered, onDragStart, onDragEnd } = props;

  return (
    <div
      className={styles.iconContainer}
      style={showHiddenControlsOnHover && !isRendered ? { visibility: "hidden" } : {}}>
      {showPanelName && panelData && <div className={styles.panelName}>{panelData.title}</div>}
      {additionalIcons}
      {helpContent && <HelpButton>{helpContent}</HelpButton>}
      <Dropdown
        flatEdges={!floating}
        toggleComponent={
          <Icon fade tooltip="Panel settings" dataTest="panel-settings">
            <SettingsIcon className={styles.icon} />
          </Icon>
        }>
        <ConnectedStandardMenuItems />
        {menuContent && <hr />}
        {menuContent}
      </Dropdown>
      <MosaicDragHandle onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {/* Can only nest native nodes into <MosaicDragHandle>, so wrapping in a <span> */}
        <span>
          <Icon fade tooltip="Move panel (shortcut: ` or ~)">
            <DragIcon className={styles.dragIcon} />
          </Icon>
        </span>
      </MosaicDragHandle>
    </div>
  );
});

// Panel toolbar should be added to any panel that's part of the
// react-mosaic layout.  It adds a drag handle, remove/replace controls
// and has a place to add custom controls via it's children property
export default React.memo<Props>(function PanelToolbar(props: Props) {
  const {
    children,
    floating,
    helpContent,
    menuContent,
    additionalIcons,
    hideToolbars,
    showHiddenControlsOnHover,
  } = props;
  const { isHovered } = useContext(PanelContext) || {};
  const [isDragging, setIsDragging] = useState(false);
  const onDragStart = useCallback(() => setIsDragging(true), []);
  const onDragEnd = useCallback(() => setIsDragging(false), []);

  if (frameless() || hideToolbars) {
    return null;
  }

  return (
    <Dimensions>
      {({ width }) => (
        <ChildToggle.ContainsOpen>
          {(containsOpen) => {
            const isRendered = isHovered || containsOpen || isDragging;
            return (
              <div
                className={cx(styles.panelToolbarContainer, {
                  [styles.floating]: floating,
                  [styles.floatingShow]: floating && isRendered,
                  [styles.containsOpen]: containsOpen,
                  [styles.hasChildren]: !!children,
                })}>
                {(isRendered || !floating) && children}
                {(isRendered || showHiddenControlsOnHover) && (
                  <PanelToolbarControls
                    isRendered={isRendered}
                    showHiddenControlsOnHover={showHiddenControlsOnHover}
                    floating={floating}
                    helpContent={helpContent}
                    menuContent={menuContent}
                    showPanelName={width > 360}
                    additionalIcons={additionalIcons}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                )}
              </div>
            );
          }}
        </ChildToggle.ContainsOpen>
      )}
    </Dimensions>
  );
});
