// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import * as React from "react";
import uuid from "uuid";

import { MessagePipelineConsumer, type MessagePipelineContext } from "webviz-core/src/components/MessagePipeline";

type Props = {|
  topic: string,
  datatype: string,
  name: string,
|};

// Component that registers a publisher with the player and provides a publish() function to publish data.
export default class Publisher extends React.PureComponent<Props> {
  _id: string = uuid.v4();
  _context: ?MessagePipelineContext;

  _getContext(): MessagePipelineContext {
    if (!this._context) {
      throw new Error("this._context is missing in <Publisher>");
    }
    return this._context;
  }

  _setPublishers() {
    const { topic, datatype, name } = this.props;
    this._getContext().setPublishers(this._id, [{ topic, datatype, advertiser: { type: "panel", name } }]);
  }

  componentDidMount() {
    this._setPublishers();
  }

  componentDidUpdate() {
    this._setPublishers();
  }

  componentWillUnmount() {
    this._getContext().setPublishers(this._id, []);
  }

  publish(msg: any) {
    const { topic } = this.props;
    this._getContext().publish({ topic, msg });
  }

  render() {
    return (
      <MessagePipelineConsumer>
        {(context: MessagePipelineContext) => {
          this._context = context;
          return null;
        }}
      </MessagePipelineConsumer>
    );
  }
}
