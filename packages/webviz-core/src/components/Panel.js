// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import BorderAllIcon from "@mdi/svg/svg/border-all.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import ExpandAllOutlineIcon from "@mdi/svg/svg/expand-all-outline.svg";
import FullscreenIcon from "@mdi/svg/svg/fullscreen.svg";
import GridLargeIcon from "@mdi/svg/svg/grid-large.svg";
import TrashCanOutlineIcon from "@mdi/svg/svg/trash-can-outline.svg";
import cx from "classnames";
import { last } from "lodash";
import React, { useState, useCallback, useContext, useMemo, type ComponentType } from "react";
import DocumentEvents from "react-document-events";
import {
  getNodeAtPath,
  updateTree,
  getPathFromNode,
  getOtherBranch,
  isParent,
  MosaicContext,
  MosaicWindowContext,
  type MosaicRootActions,
  type MosaicWindowActions,
} from "react-mosaic-component";
import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import styles from "./Panel.module.scss";
import { addSelectedPanelId, removeSelectedPanelId, setSelectedPanelIds } from "webviz-core/src/actions/mosaic";
import { savePanelConfigs, saveFullPanelConfig, changePanelLayout } from "webviz-core/src/actions/panels";
import Button from "webviz-core/src/components/Button";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import KeyListener from "webviz-core/src/components/KeyListener";
import PanelContext from "webviz-core/src/components/PanelContext";
import MosaicDragHandle from "webviz-core/src/components/PanelToolbar/MosaicDragHandle";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import PanelList, { getPanelsByType } from "webviz-core/src/panels/PanelList";
import type { Topic } from "webviz-core/src/players/types";
import type {
  EditHistoryOptions,
  SaveConfigsPayload,
  SaveFullConfigPayload,
  PanelConfig,
  SaveConfig,
} from "webviz-core/src/types/panels";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { TAB_PANEL_TYPE } from "webviz-core/src/util/globalConstants";
import {
  groupPanelsOutput,
  createTabsOutput,
  getPanelTypeFromId,
  getPanelIdForType,
  updateTabPanelLayout,
} from "webviz-core/src/util/layout";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

type Props<Config> = { childId?: string, config?: Config, saveConfig?: (Config) => void, tabId?: string };
type ActionProps = {|
  savePanelConfigs: (SaveConfigsPayload) => void,
  saveFullPanelConfig: (SaveFullConfigPayload) => PanelConfig,
  changePanelLayout: (panels: any) => void,
  addSelectedPanelId: (panelId: string) => void,
  removeSelectedPanelId: (panelId: string) => void,
  setSelectedPanelIds: (panelIds: string[]) => void,
|};
interface PanelStatics<Config> {
  panelType: string;
  defaultConfig: Config;
}

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
  function ConnectedPanel(props: Props<Config>) {
    const { childId, config: originalConfig, saveConfig, tabId } = props;
    const { mosaicActions }: { mosaicActions: MosaicRootActions } = useContext(MosaicContext);
    const { mosaicWindowActions }: { mosaicWindowActions: MosaicWindowActions } = useContext(MosaicWindowContext);

    const layout = useSelector(({ panels }) => panels.layout);
    const savedProps = useSelector(({ panels }) => panels.savedProps);
    const selectedPanelIds = useSelector((state) => state.mosaic.selectedPanelIds);
    const isSelected = selectedPanelIds.includes(childId);

    const validSelectedPanelIds = useMemo(
      () => selectedPanelIds.filter((panelId) => getPanelTypeFromId(panelId) !== TAB_PANEL_TYPE),
      [selectedPanelIds]
    );
    const isOnlyPanel = useMemo(() => (tabId ? false : !isParent(layout)), [layout, tabId]);
    const config = savedProps[childId] || originalConfig || {};

    const { topics, datatypes, capabilities } = PanelAPI.useDataSourceInfo();
    const dispatch = useDispatch();
    const actions: ActionProps = useMemo(
      () =>
        bindActionCreators(
          {
            savePanelConfigs,
            saveFullPanelConfig,
            changePanelLayout,
            addSelectedPanelId,
            removeSelectedPanelId,
            setSelectedPanelIds,
          },
          dispatch
        ),
      [dispatch]
    );

    const [quickActionsKeyPressed, setQuickActionsKeyPressed] = useState(false);
    const [shiftKeyPressed, setShiftKeyPressed] = useState(false);
    const [cmdKeyPressed, setCmdKeyPressed] = useState(false);
    const [fullScreen, setFullScreen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [fullScreenLocked, setFullScreenLocked] = useState(false);
    const [showTabPanelSelectionWarning, setShowTabPanelSelectionWarning] = useState(false);

    const panelsByType = useMemo(() => getPanelsByType(), []);
    const type = PanelComponent.panelType;
    const title = useMemo(() => panelsByType[type]?.title, [panelsByType, type]);
    const panelComponentConfig = useMemo(() => ({ ...PanelComponent.defaultConfig, ...config }), [config]);

    const isTabPanel = useMemo(() => childId && getPanelTypeFromId(childId) === TAB_PANEL_TYPE, [childId]);

    // Mix partial config with current config or `defaultConfig`
    const saveCompleteConfig = useCallback(
      (configToSave: $Shape<Config>, options: ?{ keepLayoutInUrl?: boolean, historyOptions?: EditHistoryOptions }) => {
        if (saveConfig) {
          saveConfig(configToSave);
        }
        if (childId) {
          actions.savePanelConfigs({
            silent: !!options?.keepLayoutInUrl,
            configs: [{ id: childId, config: configToSave, defaultConfig: PanelComponent.defaultConfig }],
            historyOptions: options?.historyOptions,
          });
        }
      },
      [actions, childId, saveConfig]
    );

    const updatePanelConfig = useCallback(
      (panelType: string, perPanelFunc: (PanelConfig) => PanelConfig, historyOptions?: EditHistoryOptions) => {
        actions.saveFullPanelConfig({ panelType, perPanelFunc, historyOptions });
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
        const ownPath = mosaicWindowActions.getPath();

        // Try to find a sibling summary panel and update it with the `siblingConfig`
        const siblingPathEnd = last(ownPath) ? getOtherBranch(last(ownPath)) : "second";
        const siblingPath = ownPath.slice(0, -1).concat(siblingPathEnd);
        const siblingId = getNodeAtPath(mosaicActions.getRoot(), siblingPath);
        if (typeof siblingId === "string" && getPanelTypeFromId(siblingId) === panelType) {
          const siblingConfig: PanelConfig = { ...siblingDefaultConfig, ...savedProps[siblingId] };
          actions.savePanelConfigs({
            configs: [
              { id: siblingId, config: siblingConfigCreator(siblingConfig), defaultConfig: siblingDefaultConfig },
            ],
          });
          return;
        }

        // Otherwise, open new panel
        const newPanelPath = ownPath.concat("second");
        mosaicWindowActions.split({ type: panelType }).then(() => {
          const newPanelId = getNodeAtPath(mosaicActions.getRoot(), newPanelPath);
          actions.savePanelConfigs({
            configs: [
              {
                id: newPanelId,
                config: siblingConfigCreator(siblingDefaultConfig),
                defaultConfig: siblingDefaultConfig,
              },
            ],
          });
        });
      },
      [actions, mosaicActions, mosaicWindowActions, savedProps]
    );

    const onOverlayClick = useCallback(
      (e) => {
        if (!fullScreen && quickActionsKeyPressed) {
          setFullScreen(true);
          if (shiftKeyPressed) {
            setFullScreenLocked(true);
          }
        }

        // If user clicks a 1st panel, select it
        // If user clicks a 2nd+ panel without pressing `Cmd`, clear previous selections & select clicked panel
        if (!e.metaKey) {
          // Unless we are a Tab panel or in a Tab panel
          if (tabId || isTabPanel) {
            return;
          }
          if (childId) {
            actions.setSelectedPanelIds([childId]);
          }
          return;
        }

        // Show a warning if we are pressing `Cmd` and clicking a Tab panel
        // Don't select any panels
        if (tabId || isTabPanel) {
          setShowTabPanelSelectionWarning(true);
          return;
        }

        if (selectedPanelIds.includes(childId)) {
          // If clicked panel is already selected, deselect
          actions.setSelectedPanelIds(selectedPanelIds.filter((panelId) => panelId !== childId));
        } else if (childId) {
          // Otherwise, select clicked panel, while deselecting any already-selected Tab panels
          // (when panels are grouped to create a Tab panel, that new Tab panel is automatically "selected")
          actions.setSelectedPanelIds(
            selectedPanelIds.filter((panelId) => getPanelTypeFromId(panelId) !== TAB_PANEL_TYPE).concat([childId])
          );
        }
      },
      [
        setShowTabPanelSelectionWarning,
        fullScreen,
        quickActionsKeyPressed,
        selectedPanelIds,
        tabId,
        isTabPanel,
        childId,
        shiftKeyPressed,
        actions,
      ]
    );

    const createTabPanel = useCallback(
      (tabPanelId, changePanelPayload, saveConfigsPayload) => {
        actions.changePanelLayout(changePanelPayload);
        actions.savePanelConfigs(saveConfigsPayload);
        actions.setSelectedPanelIds([tabPanelId]);
      },
      [actions]
    );

    const groupPanels = useCallback(
      () => {
        const { tabPanelId, changePanelPayload, saveConfigsPayload } = groupPanelsOutput(
          childId,
          layout,
          validSelectedPanelIds
        );
        createTabPanel(tabPanelId, changePanelPayload, saveConfigsPayload);
      },
      [childId, layout, createTabPanel, validSelectedPanelIds]
    );

    const createTabs = useCallback(
      () => {
        const { tabPanelId, changePanelPayload, saveConfigsPayload } = createTabsOutput(
          childId,
          layout,
          validSelectedPanelIds
        );
        createTabPanel(tabPanelId, changePanelPayload, saveConfigsPayload);
      },
      [childId, layout, createTabPanel, validSelectedPanelIds]
    );

    const { closePanel, splitPanel } = useMemo(
      () => ({
        closePanel: () => {
          mosaicActions.remove(mosaicWindowActions.getPath());
        },
        splitPanel: () => {
          if (tabId) {
            const newId = getPanelIdForType(PanelComponent.panelType);
            const activeTabLayout = savedProps[tabId].tabs[savedProps[tabId].activeTabIdx].layout;
            const pathToPanelInTab = getPathFromNode(childId, activeTabLayout);
            const newTabLayout = updateTree(activeTabLayout, [
              { path: pathToPanelInTab, spec: { $set: { first: childId, second: newId, direction: "row" } } },
            ]);
            const newTabConfig = updateTabPanelLayout(newTabLayout, savedProps[tabId]);
            actions.savePanelConfigs({ configs: [{ id: tabId, config: newTabConfig }, { id: newId, config }] });
          } else {
            mosaicWindowActions.split({ type: PanelComponent.panelType });
          }
        },
      }),
      [actions, childId, config, mosaicActions, mosaicWindowActions, savedProps, tabId]
    );

    const { onMouseEnter, onMouseLeave, onMouseMove, enterFullscreen, exitFullScreen } = useMemo(
      () => ({
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
        onMouseMove: (e) => {
          if (e.metaKey !== cmdKeyPressed) {
            setCmdKeyPressed(e.metaKey);
          }
        },
        enterFullscreen: () => {
          setFullScreen(true);
          setFullScreenLocked(true);
        },
        exitFullScreen: () => {
          setFullScreen(false);
          setFullScreenLocked(false);
        },
      }),
      [cmdKeyPressed]
    );

    const onReleaseQuickActionsKey = useCallback(
      () => {
        setQuickActionsKeyPressed(false);
        if (fullScreen && !fullScreenLocked) {
          exitFullScreen();
        }
      },
      [exitFullScreen, fullScreen, fullScreenLocked]
    );

    const { keyUpHandlers, keyDownHandlers } = useMemo(
      () => ({
        keyUpHandlers: {
          "`": () => onReleaseQuickActionsKey(),
          "~": () => onReleaseQuickActionsKey(),
          Shift: () => setShiftKeyPressed(false),
          Meta: () => {
            setCmdKeyPressed(false);
            setShowTabPanelSelectionWarning(false);
          },
        },
        keyDownHandlers: {
          "`": () => setQuickActionsKeyPressed(true),
          "~": () => setQuickActionsKeyPressed(true),
          Shift: () => setShiftKeyPressed(true),
          Escape: () => exitFullScreen(),
          Meta: () => {
            setCmdKeyPressed(true);
            setShowTabPanelSelectionWarning(false);
          },
        },
      }),
      [exitFullScreen, onReleaseQuickActionsKey]
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
          tabId,
        }}>
        {/* Ensure user exits full-screen mode when leaving window, even if key is still pressed down */}
        <DocumentEvents target={window} enabled onBlur={exitFullScreen} />
        <KeyListener global keyUpHandlers={keyUpHandlers} keyDownHandlers={keyDownHandlers} />
        <Flex
          onClick={onOverlayClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseMove={onMouseMove}
          style={{ border: `2px solid ${isSelected ? colors.BLUE : "transparent"}` }}
          className={cx({ [styles.root]: true, [styles.rootFullScreen]: fullScreen })}
          col
          dataTest="panel-mouseenter-container"
          clip>
          {fullScreen ? <div className={styles.notClickable} /> : null}
          {isSelected && !fullScreen && validSelectedPanelIds.length > 1 && (
            <div data-tab-options className={styles.tabActionsOverlay}>
              <Button style={{ backgroundColor: colors.BLUE }} onClick={groupPanels}>
                <Icon small style={{ marginBottom: 5 }}>
                  <BorderAllIcon />
                </Icon>
                Group in tab
              </Button>
              <Button style={{ backgroundColor: colors.BLUE }} onClick={createTabs}>
                <Icon small style={{ marginBottom: 5 }}>
                  <ExpandAllOutlineIcon />
                </Icon>
                Create {selectedPanelIds.length} tabs
              </Button>
            </div>
          )}
          {showTabPanelSelectionWarning && (
            <div data-tab-options-no-op className={styles.prohibitedSelection}>
              Cannot group Tab panels with other panels
            </div>
          )}
          {type !== TAB_PANEL_TYPE && quickActionsKeyPressed && !fullScreen && (
            <div className={styles.quickActionsOverlay} data-panel-overlay>
              <MosaicDragHandle tabId={tabId}>
                <>
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
                </>
              </MosaicDragHandle>
            </div>
          )}
          {fullScreen ? (
            <button className={styles.exitFullScreen} onClick={exitFullScreen} data-panel-overlay-exit>
              <CloseIcon /> <span>Exit fullscreen</span>
            </button>
          ) : null}
          <ErrorBoundary>
            <PanelComponent
              config={panelComponentConfig}
              saveConfig={saveCompleteConfig}
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
  ConnectedPanel.displayName = `Panel(${PanelComponent.displayName || PanelComponent.name || ""})`;

  const MemoizedConnectedPanel = React.memo(ConnectedPanel);
  // $FlowFixMe - doesn't know underlying memoized PanelComponent's interface
  MemoizedConnectedPanel.defaultConfig = PanelComponent.defaultConfig;
  // $FlowFixMe - doesn't know underlying memoized PanelComponent's interface
  MemoizedConnectedPanel.panelType = PanelComponent.panelType;
  return MemoizedConnectedPanel;
}
