//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// TODO(JP): Should remove this and properly fix Flow.
/* eslint-disable flowtype/no-types-missing-file-annotation */

import React from "react";

import Worldview, { type Props } from "../index";

export default class Container extends React.Component<Props> {
  state = {
    worldviewCamState: this.props.cameraState || this.props.defaultCameraState,
  };

  onCameraStateChange = (worldviewCamState) => {
    this.setState({ worldviewCamState });
    if (this.props.onCameraStateChange) {
      this.props.onCameraStateChange(worldviewCamState);
    }
  };

  render() {
    const { worldviewCamState } = this.state;
    const worldviewCamStateInfo = Object.keys(worldviewCamState)
      .map((key) => `${key}: ${worldviewCamState[key]}`)
      .join("\n");

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {!this.props.hideState && (
          <div
            style={{
              position: "absolute",
              pointerEvents: "none",
              width: "100%",
              bottom: "8px",
              left: "8p",
              zIndex: "1",
              overflow: "hidden",
              fontSize: "0.8rem",
              color: "gray",
              whiteSpace: "pre-line",
            }}>
            {worldviewCamStateInfo}
          </div>
        )}
        <Worldview
          {...this.props}
          defaultCameraState={undefined}
          cameraState={worldviewCamState}
          onCameraStateChange={this.onCameraStateChange}>
          {this.props.children}
        </Worldview>
      </div>
    );
  }
}
