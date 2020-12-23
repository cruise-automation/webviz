// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import hoistNonReactStatics from "hoist-non-react-statics";
import { partition, uniq } from "lodash";
import * as React from "react";

import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import * as PanelAPI from "webviz-core/src/PanelAPI";
import type { Message, Topic } from "webviz-core/src/players/types";
import { useChangeDetector, useDeepMemo } from "webviz-core/src/util/hooks";
import { getTopicsByTopicName } from "webviz-core/src/util/selectors";

const useFrame = (
  topics: string[],
  callbackKey: "addMessages" | "addBobjects"
): {| cleared: boolean, frame: { [topic: string]: $ReadOnlyArray<Message> } |} => {
  // NOTE(JP): This is a huge abuse of the `useMessageReducer` API. Never use `useMessageReducer`
  // in this way yourself!! `restore` and `addMessage` should be pure functions and not have
  // side effects!
  const frame = React.useRef({});
  const lastClearTime = PanelAPI.useMessageReducer({
    topics,
    restore: React.useCallback(() => {
      frame.current = {};
      return Date.now();
    }, [frame]),
    [callbackKey]: React.useCallback((time, messages: $ReadOnlyArray<Message>) => {
      for (const message of messages) {
        frame.current[message.topic] = frame.current[message.topic] || [];
        frame.current[message.topic].push(message);
      }
      return time;
    }, [frame]),
  });

  const cleared = useChangeDetector([lastClearTime], false);
  const latestFrame = frame.current;
  frame.current = {};
  return { cleared, frame: latestFrame };
};

// This higher-order component provides compatibility between the old way of Panels receiving
// messages, using "frames" and keeping state themselves, and the new `useMessageReducer` API which
// manages state for you and allows in the future for more flexibility in accessing messages.
//
// TODO(JP): Remove FrameCompatibilityDEPRECATED from the last panel where it's still used: the 3d panel!
// This is the "Scenebuilder refactor" project.
export function FrameCompatibilityDEPRECATED<Props>(ChildComponent: React.ComponentType<Props>, baseTopics: string[]) {
  function FrameCompatibilityComponent(props: Props & { forwardedRef: any, topics: Topic[] }) {
    const { forwardedRef, ...childProps } = props;
    const [topics, setTopics] = React.useState<string[]>(baseTopics);
    const componentSetSubscriptions = React.useCallback((newTopics: string[]) => {
      setTopics(uniq(newTopics.concat(baseTopics || [])));
    }, []);

    const supportedBobjectTypes = getGlobalHooks().perPanelHooks().ThreeDimensionalViz
      .SUPPORTED_BOBJECT_MARKER_DATATYPES;
    const stableTopics = useDeepMemo(props.topics);
    const topicsByName = React.useMemo(() => getTopicsByTopicName(stableTopics), [stableTopics]);
    const [bobjectTopics, messageTopics] = partition(
      topics,
      (topic) =>
        // It's possible the subscribed topic isn't in the bag.
        topicsByName[topic] && supportedBobjectTypes.has(topicsByName[topic].datatype)
    );
    const { frame: messageFrame, cleared } = useFrame(messageTopics, "addMessages");
    const { frame: bobjectFrame } = useFrame(bobjectTopics, "addBobjects");

    return (
      <ChildComponent
        {...childProps}
        ref={forwardedRef}
        frame={{ ...messageFrame, ...bobjectFrame }}
        setSubscriptions={componentSetSubscriptions}
        cleared={cleared}
      />
    );
  }

  return hoistNonReactStatics(
    React.forwardRef((props, ref) => {
      return <FrameCompatibilityComponent {...props} forwardedRef={ref} />;
    }),
    ChildComponent
  );
}
