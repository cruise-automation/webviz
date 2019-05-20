// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CheckboxMultipleBlankOutlineIcon from "@mdi/svg/svg/checkbox-multiple-blank-outline.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import DragIcon from "@mdi/svg/svg/drag.svg";
import GridLargeIcon from "@mdi/svg/svg/grid-large.svg";
import JsonIcon from "@mdi/svg/svg/json.svg";
import SettingsIcon from "@mdi/svg/svg/settings.svg";
import cx from "classnames";
import PropTypes from "prop-types";
import * as React from "react"; // eslint-disable-line import/no-duplicates
import { useContext } from "react"; // eslint-disable-line import/no-duplicates
import Dimensions from "react-container-dimensions";
import { connect } from "react-redux";

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
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import PanelList from "webviz-core/src/panels/PanelList";
import type { PanelConfig, SaveConfigPayload } from "webviz-core/src/types/panels";

type Props = {|
  children?: React.Node,
  floating?: boolean,
  helpContent?: React.Node,
  menuContent?: React.Node,
  showPanelName?: boolean,
|};

// separated into a sub-component so it can always skip re-rendering
// it never changes after it initially mounts
class StandardMenuItems extends React.PureComponent<{| savePanelConfig: (SaveConfigPayload) => void |}> {
  static contextTypes = {
    mosaicWindowActions: PropTypes.any,
    mosaicActions: PropTypes.any,
    mosaicId: PropTypes.any,
    store: PropTypes.any,
  };

  getPanelType() {
    const { mosaicWindowActions, mosaicActions } = this.context;

    return getPanelTypeFromMosiac(mosaicWindowActions, mosaicActions);
  }

  close = () => {
    const { mosaicActions, mosaicWindowActions } = this.context;
    getGlobalHooks().onPanelClose(this.getPanelType());
    mosaicActions.remove(mosaicWindowActions.getPath());
  };

  split = () => {
    const { mosaicWindowActions } = this.context;
    const type = this.getPanelType();
    getGlobalHooks().onPanelSplit(type);
    mosaicWindowActions.split({ type });
  };

  swap = (type: string, panelConfig?: PanelConfig) => {
    getGlobalHooks().onPanelSwap(type);
    this.context.mosaicWindowActions.replaceWithNew({ type, panelConfig });
  };

  _onImportClick = (id) => {
    if (!id) {
      return;
    }
    const panelConfigById = this.context.store.getState().panels.savedProps;
    const modal = renderToBody(
      <ShareJsonModal
        onRequestClose={() => modal.remove()}
        value={panelConfigById[id] || {}}
        onChange={(config) => this.props.savePanelConfig({ id, config, override: true })}
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
      <PanelContext.Consumer>
        {(panelData) => (
          <>
            <SubMenu text="Change panel" icon={<CheckboxMultipleBlankOutlineIcon />}>
              {/* $FlowFixMe - not sure why it thinks onPanelSelect is a Redux action */}
              <PanelList selectedPanelType={panelData.type} onPanelSelect={this.swap} />
            </SubMenu>
            <Item icon={<JsonIcon />} onClick={() => this._onImportClick(panelData && panelData.id)}>
              Import/export config
            </Item>
            <Item key="split" icon={<GridLargeIcon />} onClick={this.split}>
              Split panel
            </Item>
            <Item key="close" icon={<CloseIcon />} onClick={this.close} disabled={isOnlyPanel}>
              Remove panel
            </Item>
          </>
        )}
      </PanelContext.Consumer>
    );
  }
}

const ConnectedStandardMenuItems = connect(
  null,
  { savePanelConfig }
)(StandardMenuItems);

// Keep controls, which don't change often, in a pure component in order to avoid re-rendering the
// whole PanelToolbar when only children change.
const PanelToolbarControls = React.memo(function PanelToolbarControls(props: Props) {
  const panelData = useContext(PanelContext);
  const { floating, helpContent, menuContent, showPanelName } = props;
  return (
    <div className={styles.iconContainer}>
      {showPanelName && panelData && <div className={styles.panelName}>{panelData.title}</div>}
      {helpContent && <HelpButton>{helpContent}</HelpButton>}
      <Dropdown
        flatEdges={!floating}
        toggleComponent={
          <Icon fade tooltip="Panel settings">
            <SettingsIcon className={styles.icon} />
          </Icon>
        }>
        <ConnectedStandardMenuItems />
        <hr />
        {menuContent && <>{menuContent}</>}
      </Dropdown>
      <MosaicDragHandle>
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
export default class PanelToolbar extends React.PureComponent<Props> {
  render() {
    const { children, floating, helpContent, menuContent } = this.props;
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
                {children}
                <PanelToolbarControls
                  floating={floating}
                  helpContent={helpContent}
                  menuContent={menuContent}
                  showPanelName={width > 360}
                />
              </div>
            )}
          </ChildToggle.ContainsOpen>
        )}
      </Dimensions>
    );
  }
}
