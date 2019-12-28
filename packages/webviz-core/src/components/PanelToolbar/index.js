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
import JsonIcon from "@mdi/svg/svg/json.svg";
import SettingsIcon from "@mdi/svg/svg/settings.svg";
import TrashCanOutlineIcon from "@mdi/svg/svg/trash-can-outline.svg";
import cx from "classnames";
import PropTypes from "prop-types";
import * as React from "react"; // eslint-disable-line import/no-duplicates
import { useContext, useState, useCallback } from "react"; // eslint-disable-line import/no-duplicates
import Dimensions from "react-container-dimensions";
import { getNodeAtPath } from "react-mosaic-component";
// $FlowFixMe
import { connect, ReactReduxContext } from "react-redux";

import HelpButton from "./HelpButton";
import styles from "./index.module.scss";
import MosaicDragHandle from "./MosaicDragHandle";
import { savePanelConfig } from "webviz-core/src/actions/panels";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";
import { Item, SubMenu } from "webviz-core/src/components/Menu";
import PanelContext from "webviz-core/src/components/PanelContext";
import { getPanelTypeFromMosiac } from "webviz-core/src/components/PanelToolbar/utils";
import renderToBody from "webviz-core/src/components/renderToBody";
import ShareJsonModal from "webviz-core/src/components/ShareJsonModal";
import PanelList from "webviz-core/src/panels/PanelList";
import type { PanelConfig, SaveConfigPayload } from "webviz-core/src/types/panels";
import { getPanelIdForType } from "webviz-core/src/util";

type Props = {|
  children?: React.Node,
  floating?: boolean,
  helpContent?: React.Node,
  menuContent?: React.Node,
  showPanelName?: boolean,
  additionalIcons?: React.Node,
|};

// separated into a sub-component so it can always skip re-rendering
// it never changes after it initially mounts
class StandardMenuItems extends React.PureComponent<{| savePanelConfig: (SaveConfigPayload) => void |}> {
  static contextTypes = {
    mosaicWindowActions: PropTypes.any,
    mosaicActions: PropTypes.any,
    mosaicId: PropTypes.any,
  };

  getPanelType() {
    const { mosaicWindowActions, mosaicActions } = this.context;

    return getPanelTypeFromMosiac(mosaicWindowActions, mosaicActions);
  }

  close = () => {
    const { mosaicActions, mosaicWindowActions } = this.context;
    window.ga("send", "event", "Panel", "Close", this.getPanelType());
    mosaicActions.remove(mosaicWindowActions.getPath());
  };

  split = (store, id: ?string, direction: "row" | "column") => {
    const { mosaicActions, mosaicWindowActions } = this.context;
    const type = this.getPanelType();
    if (!id || !type) {
      throw new Error("Trying to split unknown panel!");
    }

    window.ga("send", "event", "Panel", "Split", type);

    const config = store.getState().panels.savedProps[id];
    const newId = getPanelIdForType(type);
    this.props.savePanelConfig({ id: newId, config, defaultConfig: {} });

    const path = mosaicWindowActions.getPath();
    const root = mosaicActions.getRoot();
    mosaicActions.replaceWith(path, { direction, first: getNodeAtPath(root, path), second: newId });
  };

  swap = (type: string, panelConfig?: PanelConfig) => {
    window.ga("send", "event", "Panel", "Swap", type);
    this.context.mosaicWindowActions.replaceWithNew({ type, panelConfig });
  };

  _onImportClick = (store, id) => {
    if (!id) {
      return;
    }
    const panelConfigById = store.getState().panels.savedProps;
    const modal = renderToBody(
      <ShareJsonModal
        onRequestClose={() => modal.remove()}
        value={panelConfigById[id] || {}}
        onChange={(config) => this.props.savePanelConfig({ id, config, override: true, defaultConfig: {} })}
        noun="panel configuration"
      />
    );
  };

  render() {
    const type = this.getPanelType();
    if (!type) {
      return null;
    }

    const isOnlyPanel = this.context.mosaicWindowActions.getPath().length === 0;
    return (
      <ReactReduxContext.Consumer>
        {({ store }) => (
          <PanelContext.Consumer>
            {(panelData) => (
              <>
                <SubMenu text="Change panel" icon={<CheckboxMultipleBlankOutlineIcon />}>
                  {/* $FlowFixMe - not sure why it thinks onPanelSelect is a Redux action */}
                  <PanelList selectedPanelType={panelData.type} onPanelSelect={this.swap} />
                </SubMenu>
                <Item
                  icon={<ArrowSplitHorizontalIcon />}
                  onClick={() => this.split(store, panelData && panelData.id, "column")}
                  dataTest="panel-settings-hsplit">
                  Split horizontal
                </Item>
                <Item
                  icon={<ArrowSplitVerticalIcon />}
                  onClick={() => this.split(store, panelData && panelData.id, "row")}
                  dataTest="panel-settings-vsplit">
                  Split vertical
                </Item>
                <Item icon={<TrashCanOutlineIcon />} onClick={this.close} disabled={isOnlyPanel}>
                  Remove panel
                </Item>
                <Item
                  icon={<JsonIcon />}
                  onClick={() => this._onImportClick(store, panelData && panelData.id)}
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
}

const ConnectedStandardMenuItems = connect(
  null,
  { savePanelConfig }
)(StandardMenuItems);

type PanelToolbarControlsProps = {|
  ...Props,
  onDragStart: () => void,
  onDragEnd: () => void,
|};

// Keep controls, which don't change often, in a pure component in order to avoid re-rendering the
// whole PanelToolbar when only children change.
const PanelToolbarControls = React.memo(function PanelToolbarControls(props: PanelToolbarControlsProps) {
  const panelData = useContext(PanelContext);
  const { floating, helpContent, menuContent, showPanelName, additionalIcons, onDragStart, onDragEnd } = props;

  return (
    <div className={styles.iconContainer}>
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
          <Icon fade tooltip="Move panel">
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
  const { children, floating, helpContent, menuContent, additionalIcons } = props;
  const { isHovered } = useContext(PanelContext) || {};
  const [isDragging, setIsDragging] = useState(false);
  const onDragStart = useCallback(() => setIsDragging(true), []);
  const onDragEnd = useCallback(() => setIsDragging(false), []);

  return (
    <Dimensions>
      {({ width }) => (
        <ChildToggle.ContainsOpen>
          {(containsOpen) => (
            <div
              className={cx(styles.panelToolbarContainer, {
                [styles.floating]: floating,
                [styles.containsOpen]: containsOpen,
                [styles.hasChildren]: !!children,
              })}>
              {(isHovered || containsOpen || isDragging || !floating) && children}
              {(isHovered || containsOpen || isDragging) && (
                <PanelToolbarControls
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
          )}
        </ChildToggle.ContainsOpen>
      )}
    </Dimensions>
  );
});
