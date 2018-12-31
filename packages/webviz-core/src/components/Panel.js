// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import PropTypes from "prop-types";
import * as React from "react";
import { getNodeAtPath } from "react-mosaic-component";
import { connect } from "react-redux";

import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import Flex from "webviz-core/src/components/Flex";
import PanelContext from "webviz-core/src/components/PanelContext";
import PanelList from "webviz-core/src/panels/PanelList";
import type { State } from "webviz-core/src/reducers";
import type { Topic } from "webviz-core/src/types/dataSources";
import type { SaveConfigPayload, PanelConfig, SaveConfig } from "webviz-core/src/types/panels";
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

type Props<Config> = {| childId?: string, config?: Config |};

interface PanelStatics<Config> {
  panelType: string;
  defaultConfig: Config;
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
    topics: Topic[],
    datatypes: RosDatatypes,
    capabilities: string[],
  |};

  const defaultConfig: Config = PanelComponent.defaultConfig;

  class UnconnectedPanel extends React.PureComponent<
    ReduxMappedProps & {| savePanelConfig: (SaveConfigPayload) => void |}
  > {
    static panelType = PanelComponent.panelType;
    static displayName = `Panel(${PanelComponent.displayName || PanelComponent.name || ""})`;

    static contextTypes = {
      mosaicActions: PropTypes.any,
      mosaicWindowActions: PropTypes.any,
      store: PropTypes.any,
    };

    // Save the config, by mixing in the partial config with the current config, or if that does
    // not exist, with the `defaultConfig`. That way we always save complete configs.
    _saveConfig = (config: $Shape<Config>, options: { keepLayoutInUrl?: boolean } = {}) => {
      if (this.props.childId) {
        this.props.savePanelConfig({
          id: this.props.childId,
          silent: !!options.keepLayoutInUrl,
          config: { ...defaultConfig, ...this.props.config, ...config },
        });
      }
    };

    // Open a panel next to the current panel, of the specified `panelType`. If such a panel already
    // exist, we update it with the new props.
    _openSiblingPanel = (panelType: string, siblingConfigCreator: (PanelConfig) => PanelConfig) => {
      const defaultSiblingConfig = PanelList.getComponentForType(panelType).defaultConfig;

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

    render() {
      const { topics, datatypes, capabilities, childId } = this.props;
      return (
        // $FlowFixMe - bug prevents requiring panelType on PanelComponent: https://stackoverflow.com/q/52508434/23649
        <PanelContext.Provider value={{ type: PanelComponent.panelType, id: childId }}>
          <Flex col clip>
            <ErrorBoundary>
              {/* $FlowFixMe - https://github.com/facebook/flow/issues/6479 */}
              <PanelComponent
                config={{ ...defaultConfig, ...this.props.config }}
                saveConfig={this._saveConfig}
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

  function mapStateToProps(state: State, ownProps: Props<Config>): ReduxMappedProps {
    // Be careful when adding something here: it should not change often, otherwise
    // all panels will rerender, which is very expensive.
    return {
      childId: ownProps.childId,
      // $FlowFixMe: if nothing went wrong, `state.panels.savedProps[ownProps.childId]` should be of type `Config`.
      config: state.panels.savedProps[ownProps.childId] || ownProps.config,
      topics: state.dataSource.topics,
      datatypes: state.dataSource.datatypes,
      capabilities: state.dataSource.capabilities,
    };
  }

  // There seems to be a circular dependency here, so defer loading a bit.
  const { savePanelConfig } = require("webviz-core/src/actions/panels");

  const ConnectedPanel = connect(
    mapStateToProps,
    { savePanelConfig }
  )(UnconnectedPanel);

  ConnectedPanel.defaultConfig = defaultConfig;

  return ConnectedPanel;
}
