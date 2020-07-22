// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import HelpCircleIcon from "@mdi/svg/svg/help-circle.svg";
import React from "react";
import { hot } from "react-hot-loader/root";
import { connect, Provider } from "react-redux";

import styles from "./Root.module.scss";
import { redoLayoutChange, undoLayoutChange } from "webviz-core/src/actions/layoutHistory";
import { selectAllPanelIds } from "webviz-core/src/actions/mosaic";
import { importPanelLayout } from "webviz-core/src/actions/panels";
import Logo from "webviz-core/src/assets/logo.svg";
import AppMenu from "webviz-core/src/components/AppMenu";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import Icon from "webviz-core/src/components/Icon";
import LayoutHistoryKeyListener from "webviz-core/src/components/LayoutHistoryKeyListener";
import LayoutMenu from "webviz-core/src/components/LayoutMenu";
import { MessagePipelineConsumer, type MessagePipelineContext } from "webviz-core/src/components/MessagePipeline";
import NotificationDisplay from "webviz-core/src/components/NotificationDisplay";
import PanelLayout from "webviz-core/src/components/PanelLayout";
import PlaybackControls from "webviz-core/src/components/PlaybackControls";
import PlayerManager from "webviz-core/src/components/PlayerManager";
import SelectableTimestamp from "webviz-core/src/components/SelectableTimestamp";
import { TinyConnectionPicker } from "webviz-core/src/components/TinyConnectionPicker";
import Toolbar from "webviz-core/src/components/Toolbar";
import withDragDropContext from "webviz-core/src/components/withDragDropContext";
import type { State } from "webviz-core/src/reducers";
import getGlobalStore from "webviz-core/src/store/getGlobalStore";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import { setReactHotLoaderConfig } from "webviz-core/src/util/dev";
import inAutomatedRunMode from "webviz-core/src/util/inAutomatedRunMode";
import { showHelpModalOpenSource } from "webviz-core/src/util/showHelpModalOpenSource";

// Only used in dev.
setReactHotLoaderConfig();

const LOGO_SIZE = 24;

type Props = {|
  importPanelLayout: typeof importPanelLayout,
  redoStateCount: number,
  undoStateCount: number,
  redoLayoutChange: () => void,
  undoLayoutChange: () => void,
  selectAllPanelIds: () => void,
|};
class App extends React.PureComponent<Props> {
  container: ?HTMLDivElement;

  componentDidMount() {
    // focus on page load to enable keyboard interaction
    if (this.container) {
      this.container.focus();
    }

    // Add a hook for integration tests.
    window.setPanelLayout = (payload) => this.props.importPanelLayout(payload);
  }

  render() {
    return (
      <div ref={(el) => (this.container = el)} className="app-container" tabIndex={0}>
        <LayoutHistoryKeyListener />
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
                  <MessagePipelineConsumer>
                    {({ playerState, seekPlayback, pausePlayback }: MessagePipelineContext) => {
                      if (inScreenshotTests()) {
                        // In our open-source integration test the Rosbridge playback emits messages
                        // at the current timestamp, so this always looks different in screenshots.
                        return null;
                      }
                      if (!playerState.activeData) {
                        return null;
                      }
                      const { currentTime, startTime, endTime } = playerState.activeData;

                      return (
                        <SelectableTimestamp
                          pausePlayback={pausePlayback}
                          seekPlayback={seekPlayback}
                          currentTime={currentTime}
                          startTime={startTime}
                          endTime={endTime}
                        />
                      );
                    }}
                  </MessagePipelineConsumer>
                </div>

                <div className={styles.block} style={{ marginRight: 5 }}>
                  {!inAutomatedRunMode() && <NotificationDisplay />}
                </div>
                <div className={styles.block}>
                  <Icon tooltip="Help" small fade onClick={showHelpModalOpenSource}>
                    <HelpCircleIcon />
                  </Icon>
                </div>
                <div className={styles.block}>
                  <AppMenu />
                </div>
                <div className={styles.block}>
                  <LayoutMenu
                    selectAllPanels={this.props.selectAllPanelIds}
                    redoLayoutChange={this.props.redoLayoutChange}
                    redoStateCount={this.props.redoStateCount}
                    undoLayoutChange={this.props.undoLayoutChange}
                    undoStateCount={this.props.undoStateCount}
                  />
                </div>
                <div className={styles.block}>
                  <TinyConnectionPicker inputDescription={inputDescription} />
                </div>
              </Toolbar>
              <div className={styles.layout}>
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
}

const ConnectedApp = connect<Props, {}, _, _, _, _>(
  ({ layoutHistory: { redoStates, undoStates } }: State) => ({
    redoStateCount: redoStates.length,
    undoStateCount: undoStates.length,
  }),
  { importPanelLayout, selectAllPanelIds, redoLayoutChange, undoLayoutChange }
)(withDragDropContext(App));

const Root = () => {
  return (
    <Provider store={getGlobalStore()}>
      <div className="app-container">
        <ErrorBoundary>
          <ConnectedApp />
        </ErrorBoundary>
      </div>
    </Provider>
  );
};

export default hot(Root);
