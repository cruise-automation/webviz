// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import hoistNonReactStatics from "hoist-non-react-statics";
import PropTypes from "prop-types";
import * as React from "react";

import { getGlobalHooks } from "../../loadWebviz";
import Transforms from "webviz-core/src/panels/ThreeDimensionalViz/Transforms";
import type { Frame } from "webviz-core/src/players/types";
import { isBobject, deepParse } from "webviz-core/src/util/binaryObjects";
import { TRANSFORM_STATIC_TOPIC, TRANSFORM_TOPIC } from "webviz-core/src/util/globalConstants";

type State = {| transforms: Transforms |};

function withTransforms<Props: *>(ChildComponent: React.ComponentType<Props>) {
  class Component extends React.PureComponent<$Shape<{| frame: Frame, cleared: boolean, forwardedRef: any |}>, State> {
    static displayName = `withTransforms(${ChildComponent.displayName || ChildComponent.name || ""})`;
    static contextTypes = { store: PropTypes.any };

    state: State = { transforms: new Transforms() };

    static getDerivedStateFromProps(nextProps: Props, prevState: State): ?$Shape<State> {
      const { frame, cleared } = nextProps;
      let { transforms } = prevState;
      if (cleared) {
        transforms = new Transforms();
      }

      getGlobalHooks()
        .perPanelHooks()
        .ThreeDimensionalViz.consumePose(frame, transforms);

      const tfs = frame[TRANSFORM_TOPIC];
      if (tfs) {
        const skipFrameId = getGlobalHooks().perPanelHooks().ThreeDimensionalViz.sceneBuilderHooks.skipTransformFrame
          ?.frameId;
        for (const { message } of tfs) {
          const parsedMessage = isBobject(message) ? deepParse(message) : message;
          for (const tf of parsedMessage.transforms) {
            if (tf.child_frame_id !== skipFrameId) {
              transforms.consume(tf);
            }
          }
        }
      }
      const tfs_static = frame[TRANSFORM_STATIC_TOPIC];
      if (tfs_static) {
        for (const { message } of tfs_static) {
          const parsedMessage = isBobject(message) ? deepParse(message) : message;
          for (const tf of parsedMessage.transforms) {
            transforms.consume(tf);
          }
        }
      }

      return { transforms };
    }

    render() {
      // $FlowFixMe - can't seem to figure out how to properly type this.
      return <ChildComponent {...this.props} ref={this.props.forwardedRef} transforms={this.state.transforms} />;
    }
  }
  return hoistNonReactStatics(
    React.forwardRef((props, ref) => {
      return <Component {...props} forwardedRef={ref} />;
    }),
    ChildComponent
  );
}

export default withTransforms;
