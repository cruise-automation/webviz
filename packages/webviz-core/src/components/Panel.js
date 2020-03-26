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
import React, { useState, useCallback, useContext, useMemo, type ComponentType } from "react";
import DocumentEvents from "react-document-events";
import KeyListener from "react-key-listener";
import { getNodeAtPath, isParent, type MosaicRootActions, type MosaicWindowActions } from "react-mosaic-component";
// $FlowFixMe
import { useSelector, useDispatch, ReactReduxContext } from "react-redux";
import { bindActionCreators } from "redux";

import styles from "./Panel.module.scss";
import { savePanelConfig, saveFullPanelConfig } from "webviz-core/src/actions/panels";
import Button from "webviz-core/src/components/Button";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import Flex from "webviz-core/src/components/Flex";
import PanelContext from "webviz-core/src/components/PanelContext";
import MosaicDragHandle from "webviz-core/src/components/PanelToolbar/MosaicDragHandle";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import PanelList, { getPanelsByType } from "webviz-core/src/panels/PanelList";
import type { Topic } from "webviz-core/src/players/types";
import type {
  SaveConfigPayload as Payload,
  SaveFullConfigPayload as FullPayload,
  PanelConfig,
  SaveConfig,
  PerPanelFunc,
} from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { getPanelTypeFromId } from "webviz-core/src/util";

type Props<Config> = { childId?: string, config?: Config, saveConfig?: (Config) => void };
type ActionProps = {| savePanelConfig: (Payload) => void, saveFullPanelConfig: (FullPayload) => PanelConfig |};
interface PanelStatics<Config> {
  panelType: string;
  defaultConfig: Config;
}
type ContextProps = { mosaicActions: MosaicRootActions, mosaicWindowActions: MosaicWindowActions };

// HOC that wraps panel in an error boundary and flex box.
// Gives panel a `config` and `saveConfig`.
//   export default Panel(MyPanelComponent)
//
// `config` comes from Redux, but in stories / tests you can pass in your own:
//   `<MyPanel config={…} />`
export default function Panel<Config: PanelConfig>(
  PanelComponent: (
    | ComponentType<{}>
    | ComponentType<
        $Shape<{
          config: Config,
          saveConfig: SaveConfig<Config>,
          openSiblingPanel: (string, cb: (PanelConfig) => PanelConfig) => void,
          updatePanelConfig: (panelType: string, perPanelFunc: PerPanelFunc<PanelConfig>) => void,
          topics: Topic[],
          capabilities: string[],
          datatypes: RosDatatypes,
          isHovered: boolean,
        }>
      >
  ) &
    PanelStatics<Config>
  // TODO(JP): Add `& PanelStatics<Config>` to the return type when we have figured out
  // https://stackoverflow.com/questions/52508434/adding-static-variable-to-union-of-class-types
): ComponentType<Props<Config>> {
  function ConnectedPanel(props: Props<Config>, context: ContextProps) {
    const { store } = useContext(ReactReduxContext);
    const { topics, datatypes, capabilities } = PanelAPI.useDataSourceInfo();
    const dispatch = useDispatch();
    const actions: ActionProps = useMemo(() => bindActionCreators({ savePanelConfig, saveFullPanelConfig }, dispatch), [
      dispatch,
    ]);

    const { childId, config: originalConfig, saveConfig } = props;

    const savedPropsForChildId = useSelector(({ panels }) => panels.savedProps[childId]);
    const isOnlyPanel = useSelector(({ panels }) => !isParent(panels.layout));
    const config = savedPropsForChildId || originalConfig || {};
    const { mosaicActions, mosaicWindowActions } = context;

    const [quickActionsKeyPressed, setQuickActionsKeyPressed] = useState(false);
    const [shiftKeyPressed, setShiftKeyPressed] = useState(false);
    const [fullScreen, setFullScreen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [pressingTilde, setPressingTilde] = useState(false);

    const panelsByType = useMemo(() => getPanelsByType(), []);
    const type = PanelComponent.panelType;
    const title = useMemo(() => panelsByType[type]?.title, [panelsByType, type]);
    const panelComponentConfig = useMemo(() => ({ ...PanelComponent.defaultConfig, ...config }), [config]);

    // Mix partial config with current config or `defaultConfig`
    const saveCompleteConfig = useCallback(
      (configToSave: $Shape<Config>, options: ?{ keepLayoutInUrl?: boolean }) => {
        if (saveConfig) {
          saveConfig(configToSave);
        }
        if (childId) {
          actions.savePanelConfig({
            id: childId,
            silent: !!options?.keepLayoutInUrl,
            config: configToSave,
            defaultConfig: PanelComponent.defaultConfig,
          });
        }
      },
      [actions, childId, saveConfig]
    );

    const updatePanelConfig = useCallback(
      (panelType: string, perPanelFunc: (PanelConfig) => PanelConfig) => {
        actions.saveFullPanelConfig({ panelType, perPanelFunc });
      },
      [actions]
    );

    // Open a panel next to the current panel, of the specified `panelType`.
    // If such a panel already exists, we update it with the new props.
    const openSiblingPanel = useCallback(
      (panelType: string, siblingConfigCreator: (PanelConfig) => PanelConfig) => {
        const siblingComponent = PanelList.getComponentForType(panelType);
        if (!siblingComponent) {
          return;
        }
        const siblingDefaultConfig = siblingComponent.defaultConfig;
        const savedProps = store.getState().panels.savedProps;
        const ownPath = mosaicWindowActions.getPath();

        // Try to find a sibling summary panel and update it with the `siblingConfig`
        const siblingPathEnd = ownPath[ownPath.length - 1] === "first" ? "second" : "first";
        const siblingPath = ownPath.slice(0, ownPath.length - 1).concat(siblingPathEnd);
        const siblingId = getNodeAtPath(mosaicActions.getRoot(), siblingPath);
        if (typeof siblingId === "string" && getPanelTypeFromId(siblingId) === panelType) {
          const siblingConfig: PanelConfig = { ...siblingDefaultConfig, ...(savedProps[siblingId]: any) };
          actions.savePanelConfig({
            id: siblingId,
            config: siblingConfigCreator(siblingConfig),
            defaultConfig: siblingDefaultConfig,
          });
          return;
        }

        // Otherwise, open new panel
        const newPanelPath = ownPath.concat("second");
        mosaicWindowActions.split({ type: panelType }).then(() => {
          const newPanelId = getNodeAtPath(mosaicActions.getRoot(), newPanelPath);
          actions.savePanelConfig({
            id: newPanelId,
            config: siblingConfigCreator(siblingDefaultConfig),
            defaultConfig: siblingDefaultConfig,
          });
        });
      },
      [actions, mosaicActions, mosaicWindowActions, store]
    );

    const onOverlayClick = useCallback(
      () => {
        if (quickActionsKeyPressed) {
          setFullScreen(true);
        }
      },
      [quickActionsKeyPressed]
    );

    const { closePanel, splitPanel } = useMemo(
      () => ({
        closePanel: () => {
          mosaicActions.remove(mosaicWindowActions.getPath());
        },
        splitPanel: () => {
          mosaicWindowActions.split({ type: PanelComponent.panelType });
        },
      }),
      [mosaicActions, mosaicWindowActions]
    );

    const { onMouseEnter, onMouseLeave, enterFullscreen, exitFullScreen } = useMemo(
      () => ({
        onMouseEnter: () => {
          setIsHovered(true);
        },
        onMouseLeave: () => {
          setIsHovered(false);
        },
        enterFullscreen: () => {
          setShiftKeyPressed(true);
          setFullScreen(true);
        },
        exitFullScreen: () => {
          setQuickActionsKeyPressed(false);
          setShiftKeyPressed(false);
          setFullScreen(false);
        },
      }),
      []
    );

    const { keyUpHandlers, keyDownHandlers } = useMemo(
      () => ({
        keyUpHandlers: {
          "`": (e) => {
            setPressingTilde(false);
            if (!fullScreen || !shiftKeyPressed) {
              exitFullScreen();
            }
          },
          Shift: (e) => {
            if (shiftKeyPressed && quickActionsKeyPressed && !fullScreen) {
              setShiftKeyPressed(false);
            }
          },
          "~": (e) => {
            if (!fullScreen) {
              setQuickActionsKeyPressed(false);
            }
          },
        },
        keyDownHandlers: {
          "`": (e) => {
            if (pressingTilde) {
              return;
            }
            if (!e.repeat && !quickActionsKeyPressed) {
              setPressingTilde(true);
              setQuickActionsKeyPressed(true);
            }
            if (!e.repeat && fullScreen) {
              setPressingTilde(true);
              exitFullScreen();
            }
          },
          "~": (e) => {
            setQuickActionsKeyPressed(true);
            setShiftKeyPressed(true);
          },
          Shift: (e) => {
            if (!shiftKeyPressed) {
              setShiftKeyPressed(true);
            }
          },
          Escape: (e) => {
            if (fullScreen || quickActionsKeyPressed || shiftKeyPressed) {
              exitFullScreen();
            }
          },
        },
      }),
      [exitFullScreen, fullScreen, pressingTilde, quickActionsKeyPressed, shiftKeyPressed]
    );

    return (
      // $FlowFixMe - bug prevents requiring panelType on PanelComponent: https://stackoverflow.com/q/52508434/23649
      <PanelContext.Provider
        value={{
          type,
          id: childId,
          title,
          config,
          saveConfig: saveCompleteConfig,
          updatePanelConfig,
          openSiblingPanel,
          enterFullscreen,
          isHovered,
        }}>
        {/* Ensure user exits full-screen mode when leaving window, even if key is still pressed down */}
        <DocumentEvents target={window} enabled onBlur={exitFullScreen} />
        <KeyListener global keyUpHandlers={keyUpHandlers} keyDownHandlers={keyDownHandlers} />
        <Flex
          onClick={onOverlayClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={cx({ [styles.root]: true, [styles.rootFullScreen]: fullScreen })}
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
                  <Button onClick={closePanel} disabled={isOnlyPanel}>
                    <TrashCanOutlineIcon />
                    Remove
                  </Button>
                  <Button onClick={splitPanel}>
                    <GridLargeIcon />
                    Split
                  </Button>
                </div>
                {!isOnlyPanel && <p>Drag to move</p>}
              </div>
            </MosaicDragHandle>
          )}
          {fullScreen && shiftKeyPressed ? (
            <button className={styles.exitFullScreen} onClick={exitFullScreen} data-panel-overlay-exit>
              <CloseIcon /> <span>Exit fullscreen</span>
            </button>
          ) : null}
          <ErrorBoundary>
            <PanelComponent
              config={panelComponentConfig}
              saveConfig={saveCompleteConfig}
              updatePanelConfig={updatePanelConfig}
              openSiblingPanel={openSiblingPanel}
              topics={[...topics]}
              datatypes={datatypes}
              capabilities={capabilities}
              isHovered={isHovered}
            />
          </ErrorBoundary>
        </Flex>
      </PanelContext.Provider>
    );
  }
  ConnectedPanel.contextTypes = { mosaicActions: PropTypes.any, mosaicWindowActions: PropTypes.any };
  ConnectedPanel.displayName = `Panel(${PanelComponent.displayName || PanelComponent.name || ""})`;

  const MemoizedConnectedPanel = React.memo(ConnectedPanel);
  // $FlowFixMe - doesn't know underlying memoized PanelComponent's interface
  MemoizedConnectedPanel.defaultConfig = PanelComponent.defaultConfig;
  // $FlowFixMe - doesn't know underlying memoized PanelComponent's interface
  MemoizedConnectedPanel.panelType = PanelComponent.panelType;
  return MemoizedConnectedPanel;
}
