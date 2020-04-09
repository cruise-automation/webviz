/* eslint-disable header/header */

//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import _ from "lodash";
import React, { useContext } from "react";
import { useDrag } from "react-dnd";
import { MosaicDragType, createDragToUpdates, MosaicContext, MosaicWindowContext } from "react-mosaic-component";
import { useSelector } from "react-redux";

import { getPanelTypeFromMosaic } from "webviz-core/src/components/PanelToolbar/utils";

// HOC to integrate mosaic drag functionality into any other component
function MosaicDragHandle(props, context) {
  const { children } = props;
  const { mosaicActions } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const type = getPanelTypeFromMosaic(mosaicWindowActions, mosaicActions);
  const mosaicId = useSelector(({ mosaic }) => mosaic.mosaicId);

  const [__, drag] = useDrag({
    item: { type: MosaicDragType.WINDOW },
    begin: (monitor) => {
      if (props.onDragStart) {
        props.onDragStart();
      }

      // TODO: Actually just delete instead of hiding
      // The defer is necessary as the element must be present on start for HTML DnD to not cry
      const path = mosaicWindowActions.getPath();
      const deferredHide = _.defer(() => mosaicActions.hide(path));
      return { mosaicId, deferredHide };
    },
    end: (item, monitor) => {
      if (props.onDragEnd) {
        props.onDragEnd();
      }

      // If the hide call hasn't happened yet, cancel it
      window.clearTimeout(item.deferredHide);
      window.ga("send", "event", "Panel", "Drag", type);
      const ownPath = mosaicWindowActions.getPath();
      const dropResult = monitor.getDropResult() || {};
      const { position, path: destinationPath } = dropResult;
      if (position != null && destinationPath != null && !_.isEqual(destinationPath, ownPath)) {
        mosaicActions.updateTree(createDragToUpdates(mosaicActions.getRoot(), ownPath, destinationPath, position));
      } else {
        mosaicActions.updateTree([{ path: _.dropRight(ownPath), spec: { splitPercentage: { $set: null } } }]);
      }
    },
  });
  return <div ref={drag}>{children}</div>;
}

export default MosaicDragHandle;
