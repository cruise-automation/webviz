// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CloseIcon from "@mdi/svg/svg/close.svg";
import FullscreenIcon from "@mdi/svg/svg/fullscreen.svg";
import GridLargeIcon from "@mdi/svg/svg/grid-large.svg";
import TrashCanOutlineIcon from "@mdi/svg/svg/trash-can-outline.svg";
import cx from "classnames";
import PropTypes from "prop-types";
import * as React from "react";
import DocumentEvents from "react-document-events";
import KeyListener from "react-key-listener";
import { getNodeAtPath, isParent } from "react-mosaic-component";
// $FlowFixMe
import { useSelector, useDispatch, ReactReduxContext } from "react-redux";
import { bindActionCreators } from "redux";

import styles from "./Panel.module.scss";
import Button from "webviz-core/src/components/Button";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import Flex from "webviz-core/src/components/Flex";
import PanelContext, { type PanelContextType } from "webviz-core/src/components/PanelContext";
import MosaicDragHandle from "webviz-core/src/components/PanelToolbar/MosaicDragHandle";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import PanelList, { getPanelsByType } from "webviz-core/src/panels/PanelList";
import type { Topic } from "webviz-core/src/players/types";
import type {
  SaveConfigPayload,
  SaveFullConfigPayload,
  PanelConfig,
  SaveConfig,
  PerPanelFunc,
} from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { getPanelTypeFromId } from "webviz-core/src/util";

// Higher-order component to wrap your panel in. Gives you a `config` and a method to save a new
// config: `saveConfig`. Typically used like this:
//
//   export default Panel(MyPanelComponent)
//
// We get the config from Redux, but in stories and tests you can pass in your own:
//
//   `<MyPanel config={…} />`
//
// The panel also gets wrapped in an error boundary and flex box.

type Props<Config> = {| childId?: string, config?: Config, saveConfig?: () => void |};
type State = {|
  quickActionsKeyPressed: boolean,
  shiftKeyPressed: boolean,
  fullScreen: boolean,
  removePanelKeyPressed: boolean,
  isHovered: boolean,
|};

interface PanelStatics<Config> {
  panelType: string;
  defaultConfig: Config;
}

type MockProps = $Rest<PanelContextType<any>, {}>;
const DEFAULT_MOCK_PANEL_CONTEXT: PanelContextType<any> = {
  type: "foo",
  id: "bar",
  title: "Foo Panel",
  config: {},
  saveConfig: () => {},
  updatePanelConfig: () => {},
  openSiblingPanel: () => {},
  isHovered: false,
};
export class MockPanelContextProvider extends React.Component<{ ...MockProps, children: React.Node }> {
  render() {
    const { children, ...rest } = this.props;
    return (
      <PanelContext.Provider
        value={{
          ...DEFAULT_MOCK_PANEL_CONTEXT,
          ...rest,
        }}>
        {children}
      </PanelContext.Provider>
    );
  }
}

export default function Panel<Config: PanelConfig>(
  PanelComponent: (
    | React.ComponentType<{}>
    | React.ComponentType<
        $Shape<{
          config: Config,
          saveConfig: SaveConfig<Config>,
          openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
          updatePanelConfig: (panelType: string, perPanelFunc: PerPanelFunc<PanelConfig>) => void,
          topics: Topic[],
          capabilities: string[],
          datatypes: RosDatatypes,
        }>
      >
  ) &
    PanelStatics<Config>
  // TODO(JP): Add `& PanelStatics<Config>` to the return type when we have figured out
  // https://stackoverflow.com/questions/52508434/adding-static-variable-to-union-of-class-types
): React.ComponentType<Props<Config>> {
  type ReduxMappedProps = {|
    childId?: string,
    config: Config,
    saveConfig?: (any) => void,
    isOnlyPanel: boolean,

    // keep the whole store to avoid unnecessary re-renders when panel state changes
    // (we only read the state on demand in openSiblingPanel)
    store: any,
  |};

  type PipelineProps = {|
    topics: Topic[],
    datatypes: RosDatatypes,
    capabilities: string[],
  |};

  const defaultConfig: Config = PanelComponent.defaultConfig;

  class UnconnectedPanel extends React.PureComponent<
    ReduxMappedProps &
      PipelineProps & {|
        savePanelConfig: (SaveConfigPayload) => void,
        saveFullPanelConfig: (SaveFullConfigPayload) => PanelConfig,
      |},
    State
  > {
    static displayName = `Panel(${PanelComponent.displayName || PanelComponent.name || ""})`;

    static contextTypes = {
      mosaicActions: PropTypes.any,
      mosaicWindowActions: PropTypes.any,
    };

    state = {
      quickActionsKeyPressed: false,
      shiftKeyPressed: false,
      fullScreen: false,
      removePanelKeyPressed: false,
      isHovered: false,
    };

    _tildePressing: boolean = false;

    // Save the config, by mixing in the partial config with the current config, or if that does
    // not exist, with the `defaultConfig`. That way we always save complete configs.
    _saveConfig = (config: $Shape<Config>, options: { keepLayoutInUrl?: boolean } = {}) => {
      const { childId, savePanelConfig, saveConfig } = this.props;
      if (saveConfig) {
        saveConfig(config);
      }
      if (childId) {
        savePanelConfig({
          id: childId,
          silent: !!options.keepLayoutInUrl,
          config,
          defaultConfig,
        });
      }
    };

    _updatePanelConfig = (panelType: string, perPanelFunc: (PanelConfig) => PanelConfig) => {
      this.props.saveFullPanelConfig({ panelType, perPanelFunc });
    };

    // Open a panel next to the current panel, of the specified `panelType`. If such a panel already
    // exist, we update it with the new props.
    _openSiblingPanel = (panelType: string, siblingConfigCreator: (PanelConfig) => PanelConfig) => {
      const siblingComponent = PanelList.getComponentForType(panelType);
      if (!siblingComponent) {
        return;
      }
      const defaultSiblingConfig = siblingComponent.defaultConfig;

      const panelConfigById = this.props.store.getState().panels.savedProps;
      const { mosaicActions, mosaicWindowActions } = this.context;
      const ownPath = mosaicWindowActions.getPath();

      // Try to find a sibling summary panel and update it with the `siblingConfig`.
      const siblingPathEnd = ownPath[ownPath.length - 1] === "first" ? "second" : "first";
      const siblingPath = ownPath.slice(0, ownPath.length - 1).concat(siblingPathEnd);
      const siblingId = getNodeAtPath(mosaicActions.getRoot(), siblingPath);
      if (typeof siblingId === "string" && getPanelTypeFromId(siblingId) === panelType) {
        const siblingConfig: PanelConfig = { ...defaultSiblingConfig, ...(panelConfigById[siblingId]: any) };
        this.props.savePanelConfig({
          id: siblingId,
          config: siblingConfigCreator(siblingConfig),
          defaultConfig: defaultSiblingConfig,
        });
        return;
      }

      // Otherwise, open a new panel.
      const newPanelPath = ownPath.concat("second");
      mosaicWindowActions.split({ type: panelType }).then(() => {
        const newPanelId = getNodeAtPath(mosaicActions.getRoot(), newPanelPath);
        this.props.savePanelConfig({
          id: newPanelId,
          config: siblingConfigCreator(defaultSiblingConfig),
          defaultConfig: defaultSiblingConfig,
        });
      });
    };

    _onOverlayClick = () => {
      if (this.state.quickActionsKeyPressed) {
        this.setState({ fullScreen: true });
      }
    };

    _onMouseEnter = () => {
      this.setState({ isHovered: true });
    };

    _onMouseLeave = () => {
      this.setState({ isHovered: false });
    };

    _closePanel = () => {
      const { mosaicActions, mosaicWindowActions } = this.context;
      mosaicActions.remove(mosaicWindowActions.getPath());
    };

    _splitPanel = () => {
      const { mosaicWindowActions } = this.context;
      mosaicWindowActions.split({ type: PanelComponent.panelType });
    };

    _keyUpTimeout = null;

    _exitFullScreen = (e) => {
      // When using Synergy, holding down a key leads to repeated keydown/up events, so give the
      // keydown events a chance to cancel a pending keyup.
      this._keyUpTimeout = setTimeout(() => {
        this.setState({ quickActionsKeyPressed: false, shiftKeyPressed: false, fullScreen: false });
        this._keyUpTimeout = null;
      }, 0);
    };

    _keyUpHandlers = {
      "`": (e) => {
        this._tildePressing = false;
        const { fullScreen, shiftKeyPressed } = this.state;
        if (!fullScreen || !shiftKeyPressed) {
          this._exitFullScreen();
        }
      },
      Shift: (e) => {
        const { fullScreen, shiftKeyPressed, quickActionsKeyPressed } = this.state;
        if (shiftKeyPressed && quickActionsKeyPressed && !fullScreen) {
          this.setState({ shiftKeyPressed: false });
        }
      },
      "~": (e) => {
        if (!this.state.fullScreen) {
          this.setState({ quickActionsKeyPressed: false });
        }
      },
    };

    _keyDownHandlers = {
      "`": (e) => {
        const { quickActionsKeyPressed, fullScreen } = this.state;
        if (this._tildePressing) {
          return;
        }
        if (!e.repeat && !quickActionsKeyPressed) {
          clearTimeout(this._keyUpTimeout);
          this._tildePressing = true;
          this.setState({ quickActionsKeyPressed: true });
        }
        if (!e.repeat && fullScreen) {
          clearTimeout(this._keyUpTimeout);
          this._tildePressing = true;
          this._exitFullScreen();
        }
      },
      "~": (e) => {
        clearTimeout(this._keyUpTimeout);
        this.setState({ quickActionsKeyPressed: true, shiftKeyPressed: true });
      },
      Shift: (e) => {
        if (!this.state.shiftKeyPressed) {
          clearTimeout(this._keyUpTimeout);
          this.setState({ shiftKeyPressed: true });
        }
      },
      Escape: (e) => {
        if (this.state.fullScreen || this.state.quickActionsKeyPressed || this.state.shiftKeyPressed) {
          clearTimeout(this._keyUpTimeout);
          this._exitFullScreen();
        }
      },
    };

    render() {
      const { topics, datatypes, capabilities, childId, isOnlyPanel, config = {} } = this.props;
      const { quickActionsKeyPressed, shiftKeyPressed, fullScreen } = this.state;
      const panelsByType = getPanelsByType();
      const type = PanelComponent.panelType;
      const title = panelsByType[type] && panelsByType[type].title;

      return (
        // $FlowFixMe - bug prevents requiring panelType on PanelComponent: https://stackoverflow.com/q/52508434/23649
        <PanelContext.Provider
          value={{
            type,
            id: childId,
            title,
            config,
            saveConfig: this._saveConfig,
            updatePanelConfig: this._updatePanelConfig,
            openSiblingPanel: this._openSiblingPanel,
            isHovered: this.state.isHovered,
          }}>
          {/* ensures user exits full-screen mode when leaving the window, even if key is still pressed down */}
          <DocumentEvents target={window.top} enabled onBlur={this._exitFullScreen} />
          <KeyListener global keyUpHandlers={this._keyUpHandlers} keyDownHandlers={this._keyDownHandlers} />
          <Flex
            onClick={this._onOverlayClick}
            onMouseEnter={this._onMouseEnter}
            onMouseLeave={this._onMouseLeave}
            className={cx({
              [styles.root]: true,
              [styles.rootFullScreen]: fullScreen,
            })}
            col
            dataTest="panel-mouseenter-container"
            clip>
            {fullScreen ? <div className={styles.notClickable} /> : null}
            {quickActionsKeyPressed && !fullScreen && (
              <MosaicDragHandle>
                <div className={styles.quickActionsOverlay} data-panel-overlay>
                  <div>
                    <FullscreenIcon />
                    {shiftKeyPressed ? "Lock fullscreen" : "Fullscreen (Shift+click to lock)"}
                  </div>
                  <div>
                    <Button onClick={this._closePanel} disabled={isOnlyPanel}>
                      <TrashCanOutlineIcon />
                      Remove
                    </Button>
                    <Button onClick={this._splitPanel}>
                      <GridLargeIcon />
                      Split
                    </Button>
                  </div>
                  {!isOnlyPanel && <p>Drag to move</p>}
                </div>
              </MosaicDragHandle>
            )}
            {fullScreen && shiftKeyPressed ? (
              <button className={styles.exitFullScreen} onClick={this._exitFullScreen} data-panel-overlay-exit>
                <CloseIcon /> <span>Exit fullscreen</span>
              </button>
            ) : null}
            <ErrorBoundary>
              {/* $FlowFixMe - https://github.com/facebook/flow/issues/6479 */}
              <PanelComponent
                config={{ ...defaultConfig, ...config }}
                saveConfig={this._saveConfig}
                updatePanelConfig={this._updatePanelConfig}
                openSiblingPanel={this._openSiblingPanel}
                topics={topics}
                datatypes={datatypes}
                capabilities={capabilities}
              />
            </ErrorBoundary>
          </Flex>
        </PanelContext.Provider>
      );
    }
  }

  // There seems to be a circular dependency here, so defer loading a bit.
  const { savePanelConfig, saveFullPanelConfig } = require("webviz-core/src/actions/panels");

  function ConnectedPanel(props: Props<Config>) {
    const store = React.useContext(ReactReduxContext).store;
    const savedProps = useSelector((state) => state.panels.savedProps[props.childId]);
    const isOnlyPanel = useSelector((state) => !isParent(state.panels.layout));
    const { topics, datatypes, capabilities } = PanelAPI.useDataSourceInfo();
    const dispatch = useDispatch();
    const actions = React.useMemo(() => bindActionCreators({ savePanelConfig, saveFullPanelConfig }, dispatch), [
      dispatch,
    ]);
    return (
      <UnconnectedPanel
        {...props}
        store={store}
        childId={props.childId}
        config={savedProps || props.config}
        isOnlyPanel={isOnlyPanel}
        topics={topics}
        datatypes={datatypes}
        capabilities={capabilities}
        {...actions}
      />
    );
  }

  ConnectedPanel.defaultConfig = defaultConfig;
  ConnectedPanel.panelType = PanelComponent.panelType;

  return ConnectedPanel;
}
