// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import hoistNonReactStatics from "hoist-non-react-statics";
import { last, uniq } from "lodash";
import PropTypes from "prop-types";
import * as React from "react";
import { createSelector } from "reselect";

import MessageHistory from ".";
import type { MessageHistoryData } from "webviz-core/src/components/MessageHistory";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import type { Frame, Message, Topic } from "webviz-core/src/types/players";

type Options = $Shape<{|
  topics: string[],
  historySize: number,
  dontRemountOnSeek: boolean,
|}>;

const heavyTopicsWithNoTimeDependency = createSelector(
  (topics: Topic[]) => topics,
  (topics: Topic[]): string[] =>
    topics
      .filter(({ datatype }) =>
        getGlobalHooks()
          .heavyDatatypesWithNoTimeDependency()
          .includes(datatype)
      )
      .map(({ name }) => name)
);

// This higher-order component provides compatibility between the old way of Panels receiving
// messages, using "frames" and keeping state themselves, and the new `<MessageHistory>` API which
// manages state for you and allows in the future for more flexibility in accessing messages.
//
// We simulate frames by using a `<MessageHistory>` with some low history size, and then every time
// the history changes we cut a frame up until the last frame that we sent. If the history is cleared
// we remount the component altogether, to avoid any bugs in state management (unless you pass
// `dontRemountOnSeek`, in which case you should be really sure that you are handling clearing of
// state correctly).
//
// In the future we should migrate all components to use `<MessageHistory>` directly, but that will
// likely require some expansion of its API, to allow for "reducing" messages into a certain data
// structure. Otherwise we'd have to iterate over every array element any time we receive messages,
// e.g. for topics that publish key-value pairs.
export function FrameCompatibility<Props>(ChildComponent: React.ComponentType<Props>, options: Options = {}) {
  class Component extends React.PureComponent<Props & { forwardedRef: any, topics: Topic[] }, { topics?: string[] }> {
    static displayName = `FrameCompatibility(${ChildComponent.displayName || ChildComponent.name || ""})`;
    static contextTypes = { store: PropTypes.any };

    state = {};
    _lastMessageByTopic: { [topic: string]: Message } = {};
    _key: number = 1;

    _setSubscriptions = (topics: string[]) => {
      this.setState({ topics: uniq(topics.concat(options.topics || [])) });
    };

    render() {
      const { forwardedRef, ...childProps } = this.props;
      const topics = this.state.topics || options.topics || [];

      // Temporary hack to stay fast when dealing with large point clouds and such.
      // TODO(JP): We should remove this hack and do this properly in the
      // 3d view.
      const heavyTopics = heavyTopicsWithNoTimeDependency(this.props.topics || []);
      const historySize = {};
      for (const topic of topics) {
        if (heavyTopics.includes(topic)) {
          historySize[topic] = 1;
        } else {
          historySize[topic] = options.historySize || 100;
        }
      }

      return (
        <MessageHistory paths={topics} historySize={historySize}>
          {({ itemsByPath, cleared }: MessageHistoryData) => {
            if (cleared) {
              this._lastMessageByTopic = {};
              if (!options.dontRemountOnSeek) {
                this._key++;
              }
            }

            const frame: Frame = {};
            for (const topic: string of topics) {
              if (itemsByPath[topic].length > 0) {
                const messages = itemsByPath[topic].map((item) => item.message);
                let index = 0;
                if (this._lastMessageByTopic[topic]) {
                  index = messages.lastIndexOf(this._lastMessageByTopic[topic]) + 1;
                  if (index === 0 && !heavyTopics.includes(topic)) {
                    console.warn("We seem to have skipped over messages; increase historySize for FrameCompatibility!");
                  }
                }
                if (index < messages.length) {
                  frame[topic] = messages.slice(index);
                  this._lastMessageByTopic[topic] = last(frame[topic]);
                }
              }
            }
            return (
              <ChildComponent
                {...childProps}
                ref={forwardedRef}
                key={this._key}
                frame={frame}
                setSubscriptions={this._setSubscriptions}
                cleared={cleared}
              />
            );
          }}
        </MessageHistory>
      );
    }
  }
  return hoistNonReactStatics(
    React.forwardRef((props, ref) => {
      return <Component {...props} forwardedRef={ref} />;
    }),
    ChildComponent
  );
}
