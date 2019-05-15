/* eslint-disable header/header */

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import _ from "lodash";
import PropTypes from "prop-types";
import { Component } from "react";
import { DragSource } from "react-dnd";
import { MosaicDragType, createDragToUpdates } from "react-mosaic-component";

import { getPanelTypeFromMosiac } from "webviz-core/src/components/PanelToolbar/utils";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";

const dragSource = {
  beginDrag: (props, monitor, component) => {
    // TODO: Actually just delete instead of hiding
    // The defer is necessary as the element must be present on start for HTML DnD to not cry
    const { mosaicActions, mosaicWindowActions } = component.context;
    const path = mosaicWindowActions.getPath();
    const hideTimer = _.defer(() => mosaicActions.hide(path));
    return {
      mosaicId: component.context.mosaicId,
      hideTimer,
    };
  },
  endDrag: (props, monitor, component) => {
    const { hideTimer } = monitor.getItem();
    // If the hide call hasn't happened yet, cancel it
    window.clearTimeout(hideTimer);

    const { mosaicWindowActions, mosaicActions } = component.context;
    const type = getPanelTypeFromMosiac(mosaicWindowActions, mosaicActions);

    getGlobalHooks().onPanelDrag(type);
    const ownPath = component.context.mosaicWindowActions.getPath();
    const dropResult = monitor.getDropResult() || {};
    const { position, path: destinationPath } = dropResult;
    if (position != null && destinationPath != null && !_.isEqual(destinationPath, ownPath)) {
      mosaicActions.updateTree(createDragToUpdates(mosaicActions.getRoot(), ownPath, destinationPath, position));
    } else {
      mosaicActions.updateTree([
        {
          path: _.dropRight(ownPath),
          spec: {
            splitPercentage: {
              $set: null,
            },
          },
        },
      ]);
    }
  },
};

// HOC to integrate mosaic drag functionality into any other component
class MosaicDragHandle extends Component {
  static contextTypes = {
    mosaicWindowActions: PropTypes.any,
    mosaicActions: PropTypes.any,
    mosaicId: PropTypes.any,
  };

  render() {
    const { children, connectDragSource } = this.props;
    return connectDragSource(children);
  }
}

// connect the drag handle to react dnd
const ConnectedDragHandle = DragSource(MosaicDragType.WINDOW, dragSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
}))(MosaicDragHandle);

export default ConnectedDragHandle;
