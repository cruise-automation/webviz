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
import type { Time } from "rosbag";

import styles from "./Root.module.scss";
import { changePanelLayout, importPanelLayout, savePanelConfig } from "webviz-core/src/actions/panels";
import { pausePlayback, seekPlayback, setPlaybackSpeed, startPlayback } from "webviz-core/src/actions/player";
import Logo from "webviz-core/src/assets/logo.svg";
import AppMenu from "webviz-core/src/components/AppMenu";
import DocumentDropListener from "webviz-core/src/components/DocumentDropListener";
import DropOverlay from "webviz-core/src/components/DropOverlay";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import ErrorDisplay from "webviz-core/src/components/ErrorDisplay";
import LayoutMenu from "webviz-core/src/components/LayoutMenu";
import PanelLayout from "webviz-core/src/components/PanelLayout";
import PlaybackControls from "webviz-core/src/components/PlaybackControls";
import renderToBody from "webviz-core/src/components/renderToBody";
import ShareJsonModal from "webviz-core/src/components/ShareJsonModal";
import Toolbar from "webviz-core/src/components/Toolbar";
import withDragDropContext from "webviz-core/src/components/withDragDropContext";
import { loadBag } from "webviz-core/src/players/build";
import type { State } from "webviz-core/src/reducers";
import type { PanelsState } from "webviz-core/src/reducers/panels";
import type { Auth } from "webviz-core/src/types/Auth";
import type { ImportPanelLayoutPayload, PanelConfig, SaveConfigPayload } from "webviz-core/src/types/panels";
import type { Store } from "webviz-core/src/types/Store";
import { getPanelIdForType } from "webviz-core/src/util";
import { SECOND_BAG_PREFIX } from "webviz-core/src/util/globalConstants";

const LOGO_SIZE = 24;

type AppProps = {
  panels: PanelsState,
  auth: Auth,
};

type Props = AppProps & {
  // panelLayout is an opaque structure defined by react-mosaic
  changePanelLayout: (panelLayout: any) => void,
  savePanelConfig: (SaveConfigPayload) => void,
  seekPlayback: (Time) => void,
  startPlayback: () => any,
  pausePlayback: () => any,
  setPlaybackSpeed: (speed: number) => any,
  loadBag: (files: FileList | File[], addBag: boolean) => any,
  importPanelLayout: (ImportPanelLayoutPayload, boolean) => void,
};
class App extends React.PureComponent<Props> {
  container: ?HTMLDivElement;

  componentDidMount() {
    // focus on page load to enable keyboard interaction
    if (this.container) {
      this.container.focus();
    }
  }

  onFilesSelected = ({ files, shiftPressed }: { files: FileList, shiftPressed: boolean }) => {
    this.props.loadBag(files, shiftPressed);
  };

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
        <DocumentDropListener filesSelected={this.onFilesSelected}>
          <DropOverlay>
            <div
              style={{
                fontSize: "4em",
                marginBottom: "1em",
              }}>
              Drop a bag file to load it!
            </div>
            <div
              style={{
                fontSize: "2em",
              }}>
              (hold SHIFT while dropping a second bag file to add it
              <br />
              with all topics prefixed with {SECOND_BAG_PREFIX})
            </div>
          </DropOverlay>
        </DocumentDropListener>
        <Toolbar>
          <div className={styles.logoWrapper}>
            <div>
              <Logo width={LOGO_SIZE} height={LOGO_SIZE} />
              Cruise Webviz
            </div>
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
    pausePlayback,
    savePanelConfig,
    seekPlayback,
    setPlaybackSpeed,
    startPlayback,
    loadBag,
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

export default hot(module)(Root);
