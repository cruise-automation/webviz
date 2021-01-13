// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import cx from "classnames";
import { ConnectedRouter } from "connected-react-router";
import React, { useEffect, useRef } from "react";
import { hot } from "react-hot-loader/root";
import { connect, Provider } from "react-redux";
import { Route } from "react-router";

import styles from "./Root.module.scss";
import SettingsMenu from "./SettingsMenu";
import { redoLayoutChange, undoLayoutChange } from "webviz-core/src/actions/layoutHistory";
import { importPanelLayout } from "webviz-core/src/actions/panels";
import Logo from "webviz-core/src/assets/logo.svg";
import AppMenu from "webviz-core/src/components/AppMenu";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import LayoutMenu from "webviz-core/src/components/LayoutMenu";
import NotificationDisplay from "webviz-core/src/components/NotificationDisplay";
import PanelLayout from "webviz-core/src/components/PanelLayout";
import PlaybackControls from "webviz-core/src/components/PlaybackControls";
import PlayerManager from "webviz-core/src/components/PlayerManager";
import ShortcutsModal from "webviz-core/src/components/ShortcutsModal";
import { TinyConnectionPicker } from "webviz-core/src/components/TinyConnectionPicker";
import Toolbar from "webviz-core/src/components/Toolbar";
import withDragDropContext from "webviz-core/src/components/withDragDropContext";
import type { State } from "webviz-core/src/reducers";
import getGlobalStore from "webviz-core/src/store/getGlobalStore";
import { setReactHotLoaderConfig } from "webviz-core/src/util/dev";
import browserHistory from "webviz-core/src/util/history";
import inAutomatedRunMode from "webviz-core/src/util/inAutomatedRunMode";
// Only used in dev.
setReactHotLoaderConfig();

const LOGO_SIZE = 24;

type Props = {|
  history: any,
  importPanelLayout: typeof importPanelLayout,
  redoStateCount: number,
  undoStateCount: number,
  redoLayoutChange: () => void,
  undoLayoutChange: () => void,
|};

function App({ importPanelLayout: importPanelLayoutProp }) {
  const containerRef = useRef<?HTMLDivElement>(undefined);
  useEffect(() => {
    // Focus on page load to enable keyboard interaction.
    if (containerRef.current) {
      containerRef.current.focus();
    }
    // Add a hook for integration tests.
    window.setPanelLayout = (payload) => importPanelLayoutProp(payload);
  }, [importPanelLayoutProp]);

  return (
    <div ref={containerRef} className="app-container" tabIndex={0}>
      <Route path="/shortcuts" component={ShortcutsModal} />
      <PlayerManager>
        {({ inputDescription }) => (
          <>
            <Toolbar>
              <div className={styles.left}>
                <div className={styles.logoWrapper}>
                  <a href="/">
                    <Logo width={LOGO_SIZE} height={LOGO_SIZE} />
                  </a>
                  webviz
                </div>
              </div>

              <div className={styles.block} style={{ marginRight: 5 }}>
                {!inAutomatedRunMode() && <NotificationDisplay />}
              </div>
              <div className={styles.block}>
                <LayoutMenu />
              </div>
              <div className={styles.block}>
                <AppMenu />
              </div>
              <div className={styles.block}>
                <TinyConnectionPicker inputDescription={inputDescription} />
              </div>
              <div className={styles.block} style={{ marginRight: "10px" }}>
                <SettingsMenu />
              </div>
            </Toolbar>
            <div className={cx(styles.layout, "PanelLayout-root")}>
              <PanelLayout />
            </div>
            <div className={styles["playback-controls"]}>
              <PlaybackControls />
            </div>
          </>
        )}
      </PlayerManager>
    </div>
  );
}

const ConnectedApp = connect<Props, { history: any }, _, _, _, _>(
  ({ layoutHistory: { redoStates, undoStates } }: State) => ({
    redoStateCount: redoStates.length,
    undoStateCount: undoStates.length,
  }),
  { importPanelLayout, redoLayoutChange, undoLayoutChange }
)(withDragDropContext(App));

const Root = () => {
  return (
    <Provider store={getGlobalStore()}>
      <ConnectedRouter history={browserHistory}>
        <div className="app-container" key="0">
          <ErrorBoundary>
            <Route path="/" render={({ history: routeHistory }) => <ConnectedApp history={routeHistory} />} />
          </ErrorBoundary>
        </div>
      </ConnectedRouter>
    </Provider>
  );
};

export default hot(Root);
