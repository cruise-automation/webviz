// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  capabilitiesReceived,
  datatypesReceived,
  frameReceived,
  playerStateChanged,
  setAuxiliaryData,
  timeUpdated,
  topicsReceived,
} from "webviz-core/src/actions/dataSource";
import type { Frame, Message, DataSourceMessage, Timestamp } from "webviz-core/src/types/dataSources";
import type { Dispatch } from "webviz-core/src/types/Store";
import { recordMark, recordAndClearMeasure } from "webviz-core/src/util/performanceMeasurements";

// connects a datasource to redux and
// dispatches messages from datasource to redux
// including buffered frames
export default class DataSourceDispatcher {
  _dispatch: Dispatch;
  _lastReceiveTime: ?Timestamp;
  _buffer: Frame = {};
  _timer: any;
  _signal: () => void = () => {};
  _promise: Promise<void>;
  _requestDataFn: () => void = () => {};

  constructor(dispatch: Dispatch) {
    this._dispatch = dispatch;
    this._resetPromise();
  }

  _resetPromise() {
    this._promise = new Promise((resolve) => (this._signal = resolve));
  }

  _addMessageToFrame(msg: Message): Promise<void> {
    this._buffer[msg.topic] = this._buffer[msg.topic] || [];
    this._buffer[msg.topic].push(msg);
    recordMark("dispatchWait-start");
    this._timer =
      this._timer ||
      setTimeout(() => {
        recordAndClearMeasure("dispatchWait", "dispatchWait-start");

        recordMark("dispatch-start");
        this._dispatch(frameReceived(this._buffer, this._lastReceiveTime));
        recordAndClearMeasure("dispatch", "dispatch-start");

        this._signal();

        // reset loop variables
        this._timer = undefined;
        this._buffer = {};
        this._resetPromise();

        // Drop off the main thread (so the paint happens) and then request more data.
        window.requestAnimationFrame(this._requestDataFn);
      }, 30);
    return this._promise;
  }

  // we need our consume method to return a promise
  // in the case of buffering messages into a frame
  // so in our tests we can deterministically wait
  // for a full frame to be dispatched before we test
  // the new state within the store
  consumeMessage(msg: DataSourceMessage): Promise<void> {
    switch (msg.op) {
      case "msg":
      case "message":
        if (!msg.receiveTime) {
          // Should be covered by Flow, but just to make sure.
          throw new Error("msg.receiveTime missing");
        }
        this._lastReceiveTime = msg.receiveTime;
        return this._addMessageToFrame(msg);

      case "update_time":
        this._lastReceiveTime = msg.time;
        // Only update the time immediately if we don't have a frame waiting to render.
        if (!this._timer) {
          this._dispatch(timeUpdated(this._lastReceiveTime));
        }
        break;

      case "topics":
        this._dispatch(
          topicsReceived(
            msg.topics.map(({ datatype, topic }) => (datatype ? { datatype, name: topic } : undefined)).filter(Boolean)
          )
        );
        break;

      case "datatypes":
        this._dispatch(datatypesReceived(msg.datatypes));
        break;

      case "player_state": {
        const { start_time: startTime, end_time: endTime, playing: isPlaying, speed } = msg;
        return this._dispatch(playerStateChanged({ startTime, endTime, isPlaying, speed }));
      }

      case "capabilities":
        this._dispatch(capabilitiesReceived(msg.capabilities));
        break;

      case "auxiliaryData": {
        const { data } = msg;
        this._dispatch(setAuxiliaryData(() => data));
        break;
      }

      // noop - don't do anything with these, these are just acks
      case "subscribe":
        break;
      case "unsubscribe":
        break;

      case "seek":
        this._buffer = {};
        this._dispatch({ type: "PLAYBACK_RESET" });
        break;

      case "progress":
        this._dispatch({ type: "DATA_SOURCE_PROGRESS", payload: msg.progress });
        break;

      default:
        if (msg.op === "msg") {
          // appease Flow which doesn't properly understand the fallthrough above
          throw new Error();
        }
        (msg.op: empty);
        console.warn("unknown UI thread op", msg.op, msg);
    }
    return Promise.resolve();
  }

  setReadyForMore(fn: any) {
    this._requestDataFn = fn;
  }
}
