// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CloseIcon from "@mdi/svg/svg/close.svg";
import FullscreenIcon from "@mdi/svg/svg/fullscreen.svg";
import GridLargeIcon from "@mdi/svg/svg/grid-large.svg";
import cx from "classnames";
import { omit } from "lodash";
import PropTypes from "prop-types";
import * as React from "react";
import DocumentEvents from "react-document-events";
import KeyListener from "react-key-listener";
import { getNodeAtPath, isParent } from "react-mosaic-component";
import { connect } from "react-redux";

import styles from "./Panel.module.scss";
import Button from "webviz-core/src/components/Button";
import ChildToggle from "webviz-core/src/components/ChildToggle";
import Dropdown from "webviz-core/src/components/Dropdown";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import Flex from "webviz-core/src/components/Flex";
import { Item } from "webviz-core/src/components/Menu";
import { getFilteredFormattedTopics } from "webviz-core/src/components/MessageHistory/topicPrefixUtils";
import { MessagePipelineConsumer, type MessagePipelineContext } from "webviz-core/src/components/MessagePipeline";
import PanelContext from "webviz-core/src/components/PanelContext";
import MosaicDragHandle from "webviz-core/src/components/PanelToolbar/MosaicDragHandle";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import PanelList, { getPanelListItemsByType } from "webviz-core/src/panels/PanelList";
import type { State as ReduxState } from "webviz-core/src/reducers";
import type { SaveConfigPayload, PanelConfig, SaveConfig } from "webviz-core/src/types/panels";
import type { Topic } from "webviz-core/src/types/players";
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

export const TOPIC_PREFIX_CONFIG_KEY = "webviz___topicPrefix";

type Props<Config> = {| childId?: string, config?: Config |};
type State = {
  quickActionsKeyPressed: boolean,
  fullScreen: boolean,
  removePanelKeyPressed: boolean,
};

interface PanelStatics<Config> {
  panelType: string;
  defaultConfig: Config;
  canSetTopicPrefix?: boolean;
}

const getTopicPrefixIconPrefix = (topicPrefix?: string) => {
  return (
    <span style={{ marginLeft: 3, marginTop: 3 }}>
      {getGlobalHooks().perPanelHooks().Panel.topicPrefixes[topicPrefix].iconPrefix}
    </span>
  );
};

const getTopicPrefixTooltip = (topicPrefix?: string) => {
  return getGlobalHooks().perPanelHooks().Panel.topicPrefixes[topicPrefix].tooltipText;
};

const getTopicPrefixOptionText = (topicPrefix?: string) => {
  return getGlobalHooks().perPanelHooks().Panel.topicPrefixes[topicPrefix].labelText;
};

const getTopicPrefixIcon = (topicPrefix?: string) => {
  const IconComponent = getGlobalHooks().perPanelHooks().Panel.topicPrefixes[topicPrefix].icon;
  return <IconComponent style={{ height: 14, marginLeft: -5, marginTop: 2 }} />;
};

const TopicPrefixDropdown = (props: {|
  topicPrefix: string,
  saveTopicPrefix: (newTopicPrefix: string) => Function,
|}) => {
  const { topicPrefix, saveTopicPrefix } = props;
  return (
    <ChildToggle.ContainsOpen>
      {(containsOpen) => (
        <Dropdown
          position="above"
          toggleComponent={
            <div
              data-test-topic-prefix-toggle
              className={cx(styles.topicPrefixLabel, {
                [styles.hasEmptyTopicPrefix]: !topicPrefix && !containsOpen,
              })}>
              {getTopicPrefixIconPrefix(topicPrefix)}
              {getTopicPrefixIcon(topicPrefix)}
            </div>
          }>
          <Item key="title" disabled>
            Show topics from:
          </Item>
          {Object.keys(getGlobalHooks().perPanelHooks().Panel.topicPrefixes).map((prefix) => {
            return (
              <Item
                key={prefix || "none"}
                checked={topicPrefix === prefix}
                icon={getTopicPrefixIcon(prefix)}
                tooltip={prefix && getTopicPrefixTooltip(prefix)}
                onClick={saveTopicPrefix(prefix)}>
                {getTopicPrefixOptionText(prefix)}
              </Item>
            );
          })}
        </Dropdown>
      )}
    </ChildToggle.ContainsOpen>
  );
};

export class MockPanelContextProvider extends React.Component<{ topicPrefix?: string, children: React.Node }> {
  render() {
    const { topicPrefix = "", children } = this.props;
    return (
      <PanelContext.Provider value={{ type: "foo", id: "bar", title: "Foo Panel", topicPrefix }}>
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
    isOnlyPanel: boolean,
  |};

  type PipelineProps = {|
    topics: Topic[],
    datatypes: RosDatatypes,
    capabilities: string[],
  |};

  const defaultConfig: Config = PanelComponent.defaultConfig;
  const canSetTopicPrefix: boolean = PanelComponent.canSetTopicPrefix || false;

  class UnconnectedPanel extends React.PureComponent<
    ReduxMappedProps & PipelineProps & {| savePanelConfig: (SaveConfigPayload) => void |},
    State
  > {
    static displayName = `Panel(${PanelComponent.displayName || PanelComponent.name || ""})`;

    static contextTypes = {
      mosaicActions: PropTypes.any,
      mosaicWindowActions: PropTypes.any,
      store: PropTypes.any,
    };

    state = { quickActionsKeyPressed: false, fullScreen: false, removePanelKeyPressed: false };

    // Save the config, by mixing in the partial config with the current config, or if that does
    // not exist, with the `defaultConfig`. That way we always save complete configs.
    _saveConfig = (config: $Shape<Config>, options: { keepLayoutInUrl?: boolean } = {}) => {
      if (config[TOPIC_PREFIX_CONFIG_KEY]) {
        throw new Error("Panel is not allowed to set TOPIC_PREFIX_CONFIG_KEY");
      }
      if (this.props.childId) {
        this.props.savePanelConfig({
          id: this.props.childId,
          silent: !!options.keepLayoutInUrl,
          config: { ...defaultConfig, ...this.props.config, ...config },
        });
      }
    };

    // this is same as above _saveConfig, but is internal to this file / allows you to save the TOPIC_PREFIX_CONFIG_KEY
    _saveTopicPrefix = (newTopicPrefix: string) => {
      return () => {
        if (this.props.childId) {
          this.props.savePanelConfig({
            id: this.props.childId,
            silent: false,
            config: { ...this.props.config, ...{ [TOPIC_PREFIX_CONFIG_KEY]: newTopicPrefix } },
          });
        }
      };
    };

    // Open a panel next to the current panel, of the specified `panelType`. If such a panel already
    // exist, we update it with the new props.
    _openSiblingPanel = (panelType: string, siblingConfigCreator: (PanelConfig) => PanelConfig) => {
      const siblingComponent = PanelList.getComponentForType(panelType);
      if (!siblingComponent) {
        return;
      }
      const defaultSiblingConfig = siblingComponent.defaultConfig;

      const { mosaicActions, mosaicWindowActions, store } = this.context;
      const panelConfigById = store.getState().panels.savedProps;
      const ownPath = mosaicWindowActions.getPath();

      // Try to find a sibling summary panel and update it with the `siblingConfig`.
      const siblingPathEnd = ownPath[ownPath.length - 1] === "first" ? "second" : "first";
      const siblingPath = ownPath.slice(0, ownPath.length - 1).concat(siblingPathEnd);
      const siblingId = getNodeAtPath(mosaicActions.getRoot(), siblingPath);
      if (typeof siblingId === "string" && getPanelTypeFromId(siblingId) === panelType) {
        const siblingConfig: PanelConfig = { ...defaultSiblingConfig, ...(panelConfigById[siblingId]: any) };
        this.props.savePanelConfig({ id: siblingId, config: siblingConfigCreator(siblingConfig) });
        return;
      }

      // Otherwise, open a new panel.
      const newPanelPath = ownPath.concat("second");
      mosaicWindowActions.split({ type: panelType }).then(() => {
        const newPanelId = getNodeAtPath(mosaicActions.getRoot(), newPanelPath);
        this.props.savePanelConfig({ id: newPanelId, config: siblingConfigCreator(defaultSiblingConfig) });
      });
    };

    _onOverlayClick = () => {
      if (this.state.quickActionsKeyPressed) {
        this.setState({ fullScreen: true });
      }
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
        this.setState({ quickActionsKeyPressed: false, fullScreen: false });
        this._keyUpTimeout = null;
      }, 0);
    };

    _keyUpHandlers = {
      "`": this._exitFullScreen,
    };

    _keyDownHandlers = {
      "`": (e) => {
        if (!e.repeat || !this.state.quickActionsKeyPressed) {
          clearTimeout(this._keyUpTimeout);
          this.setState({ quickActionsKeyPressed: true });
        }
      },
    };

    render() {
      const { topics, datatypes, capabilities, childId, isOnlyPanel, config = {} } = this.props;
      const { quickActionsKeyPressed, fullScreen } = this.state;
      const panelListItemsByType = getPanelListItemsByType();
      const type = PanelComponent.panelType;
      const title = panelListItemsByType[type] && panelListItemsByType[type].title;

      const currentTopicPrefix = config[TOPIC_PREFIX_CONFIG_KEY] || "";

      return (
        // $FlowFixMe - bug prevents requiring panelType on PanelComponent: https://stackoverflow.com/q/52508434/23649
        <PanelContext.Provider value={{ type, id: childId, title, topicPrefix: currentTopicPrefix }}>
          {/* ensures user exits full-screen mode when leaving the window, even if key is still pressed down */}
          <DocumentEvents target={window.top} enabled onBlur={this._exitFullScreen} />
          <KeyListener global keyUpHandlers={this._keyUpHandlers} keyDownHandlers={this._keyDownHandlers} />
          <Flex
            onClick={this._onOverlayClick}
            className={cx({
              [styles.root]: true,
              [styles.rootFullScreen]: fullScreen,
            })}
            col
            clip>
            {quickActionsKeyPressed && !fullScreen && (
              <MosaicDragHandle>
                <div className={styles.quickActionsOverlay} data-panel-overlay>
                  <div>
                    <FullscreenIcon />
                    Fullscreen
                  </div>
                  <div>
                    <Button onClick={this._closePanel} disabled={isOnlyPanel}>
                      <CloseIcon />
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
            <ErrorBoundary>
              {/* $FlowFixMe - https://github.com/facebook/flow/issues/6479 */}
              <PanelComponent
                config={{ ...defaultConfig, ...omit(config, TOPIC_PREFIX_CONFIG_KEY) }}
                saveConfig={this._saveConfig}
                openSiblingPanel={this._openSiblingPanel}
                topics={getFilteredFormattedTopics(topics, currentTopicPrefix)}
                datatypes={datatypes}
                capabilities={capabilities}
              />
              {canSetTopicPrefix ? (
                <TopicPrefixDropdown topicPrefix={currentTopicPrefix} saveTopicPrefix={this._saveTopicPrefix} />
              ) : null}
            </ErrorBoundary>
          </Flex>
        </PanelContext.Provider>
      );
    }
  }

  function ConnectedToPipelinePanel(props: any) {
    return (
      <MessagePipelineConsumer>
        {(context: MessagePipelineContext) => {
          return (
            <UnconnectedPanel
              {...props}
              topics={context.sortedTopics}
              datatypes={context.datatypes}
              capabilities={context.playerState.capabilities}
            />
          );
        }}
      </MessagePipelineConsumer>
    );
  }

  function mapStateToProps(state: ReduxState, ownProps: Props<Config>): ReduxMappedProps {
    // Be careful when adding something here: it should not change often, otherwise
    // all panels will rerender, which is very expensive.
    return {
      childId: ownProps.childId,
      config: state.panels.savedProps[ownProps.childId] || ownProps.config,
      isOnlyPanel: !isParent(state.panels.layout),
    };
  }

  // There seems to be a circular dependency here, so defer loading a bit.
  const { savePanelConfig } = require("webviz-core/src/actions/panels");

  const ConnectedPanel = connect(
    mapStateToProps,
    { savePanelConfig }
  )(ConnectedToPipelinePanel);

  ConnectedPanel.defaultConfig = defaultConfig;
  ConnectedPanel.panelType = PanelComponent.panelType;
  ConnectedPanel.canSetTopicPrefix = PanelComponent.canSetTopicPrefix;

  return ConnectedPanel;
}
