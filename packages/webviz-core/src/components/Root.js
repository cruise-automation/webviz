// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";
import { hot } from "react-hot-loader";
import { connect, Provider } from "react-redux";

import styles from "./Root.module.scss";
import { changePanelLayout, importPanelLayout, savePanelConfig } from "webviz-core/src/actions/panels";
import Logo from "webviz-core/src/assets/logo.svg";
import AppMenu from "webviz-core/src/components/AppMenu";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import ErrorDisplay from "webviz-core/src/components/ErrorDisplay";
import LayoutMenu from "webviz-core/src/components/LayoutMenu";
import PanelLayout from "webviz-core/src/components/PanelLayout";
import PlaybackControls from "webviz-core/src/components/PlaybackControls";
import PlayerManager from "webviz-core/src/components/PlayerManager";
import renderToBody from "webviz-core/src/components/renderToBody";
import ShareJsonModal from "webviz-core/src/components/ShareJsonModal";
import Toolbar from "webviz-core/src/components/Toolbar";
import withDragDropContext from "webviz-core/src/components/withDragDropContext";
import type { State } from "webviz-core/src/reducers";
import type { PanelsState } from "webviz-core/src/reducers/panels";
import type { Auth } from "webviz-core/src/types/Auth";
import type { ImportPanelLayoutPayload, PanelConfig, SaveConfigPayload } from "webviz-core/src/types/panels";
import type { Store } from "webviz-core/src/types/Store";
import { getPanelIdForType } from "webviz-core/src/util";

const LOGO_SIZE = 24;

type AppProps = {|
  panels: PanelsState,
  auth: Auth,
|};

type Props = {|
  ...AppProps,
  // panelLayout is an opaque structure defined by react-mosaic
  changePanelLayout: (panelLayout: any) => void,
  savePanelConfig: (SaveConfigPayload) => void,
  importPanelLayout: (ImportPanelLayoutPayload, boolean) => void,
|};
class App extends React.PureComponent<Props> {
  container: ?HTMLDivElement;

  componentDidMount() {
    // focus on page load to enable keyboard interaction
    if (this.container) {
      this.container.focus();
    }

    // Add a hook for integration tests.
    window.setPanelLayout = (payload) => this.props.importPanelLayout(payload, false);
  }

  onPanelSelect = (panelType: string, panelConfig?: PanelConfig) => {
    const { panels, changePanelLayout, savePanelConfig } = this.props;
    const id = getPanelIdForType(panelType);
    const newPanels = {
      direction: "row",
      first: id,
      second: panels.layout,
    };
    if (panelConfig) {
      savePanelConfig({ id, config: panelConfig });
    }
    changePanelLayout(newPanels);
  };

  showLayoutModal = () => {
    const modal = renderToBody(
      <ShareJsonModal
        onRequestClose={() => modal.remove()}
        value={this.props.panels}
        onChange={this.onLayoutChange}
        noun="layout"
      />
    );
  };

  onLayoutChange = (layout: any) => {
    this.props.importPanelLayout(layout, false);
  };

  render() {
    return (
      <div ref={(el) => (this.container = el)} className="app-container" tabIndex={0}>
        <PlayerManager>
          <Toolbar>
            <div className={styles.logoWrapper}>
              <a href="/">
                <Logo width={LOGO_SIZE} height={LOGO_SIZE} />
              </a>
              webviz
            </div>
            <div className={styles.block} style={{ marginRight: 5 }}>
              <ErrorDisplay />
            </div>
            <div className={styles.block}>
              <AppMenu onPanelSelect={this.onPanelSelect} />
            </div>
            <div className={styles.block}>
              <LayoutMenu onImportSelect={this.showLayoutModal} />
            </div>
          </Toolbar>
          <div className={styles.layout}>
            <PanelLayout />
          </div>
          <div className={styles["playback-controls"]}>
            <PlaybackControls />
          </div>
        </PlayerManager>
      </div>
    );
  }
}

const mapStateToProps = (state: State, ownProps): AppProps => {
  return {
    panels: state.panels,
    auth: state.auth,
  };
};

const ConnectedApp = connect(
  mapStateToProps,
  {
    changePanelLayout,
    savePanelConfig,
    importPanelLayout,
  }
)(withDragDropContext(App));

const Root = ({ store }: { store: Store }) => {
  return (
    <Provider store={store}>
      <div className="app-container">
        <ErrorBoundary>
          <ConnectedApp />
        </ErrorBoundary>
      </div>
    </Provider>
  );
};

// $FlowFixMe
export default hot(module)(Root);
