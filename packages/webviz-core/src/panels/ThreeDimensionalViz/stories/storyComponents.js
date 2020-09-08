// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { Worldview } from "regl-worldview";

import { getExperimentalFeature } from "webviz-core/src/components/ExperimentalFeatures";
import Flex from "webviz-core/src/components/Flex";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";
import GlobalVariableSliderPanel from "webviz-core/src/panels/GlobalVariableSlider";
import ThreeDimensionalViz, { type ThreeDimensionalVizConfig } from "webviz-core/src/panels/ThreeDimensionalViz";
import type { Frame, Topic } from "webviz-core/src/players/types";
import Store from "webviz-core/src/store";
import inScreenshotTests from "webviz-core/src/stories/inScreenshotTests";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import { createRosDatatypesFromFrame } from "webviz-core/src/test/datatypes";
import { wrapJsObject } from "webviz-core/src/util/binaryObjects";

export type FixtureExampleData = {
  topics: { [topicName: string]: Topic },
  frame: Frame,
  globalVariables?: { [name: string]: string | number },
};

function bobjectify(fixture: FixtureExampleData): FixtureExampleData {
  const { SUPPORTED_BOBJECT_MARKER_DATATYPES } = getGlobalHooks().perPanelHooks().ThreeDimensionalViz;
  const { topics, frame } = fixture;
  const newFrame = {};
  // The topics are sometimes arrays, sometimes objects :-(
  const topicsArray = topics instanceof Array ? topics : Object.keys(topics).map((name) => topics[name]);

  const datatypes = createRosDatatypesFromFrame(topicsArray, frame);
  topicsArray.forEach(({ name: topicName, datatype }) => {
    if (frame[topicName]) {
      newFrame[topicName] = frame[topicName].map((msg) => {
        const message = SUPPORTED_BOBJECT_MARKER_DATATYPES.has(datatype)
          ? wrapJsObject(datatypes, datatype, msg.message)
          : msg.message;
        return { topic: msg.topic, receiveTime: msg.receiveTime, message };
      });
    }
  });
  return { ...fixture, frame: newFrame };
}

type FixtureExampleProps = {|
  initialConfig: $Shape<ThreeDimensionalVizConfig>,
  data?: FixtureExampleData,
  loadData?: Promise<FixtureExampleData>,
  futureTime?: boolean,
  onMount?: (?HTMLDivElement, store?: Store) => void,
  bobjects?: boolean,
|};

type FixtureExampleState = {| fixture: ?any, config: $Shape<ThreeDimensionalVizConfig> |};

export const WorldviewContainer = (props: { children: React.Node }) => {
  return (
    <Worldview {...props} hideDebug={inScreenshotTests()}>
      {props.children}
    </Worldview>
  );
};

export class FixtureExample extends React.Component<FixtureExampleProps, FixtureExampleState> {
  state = { fixture: null, config: this.props.initialConfig };

  componentDidMount() {
    const { data, loadData } = this.props;
    if (data) {
      this.updateState(data);
    }
    if (loadData) {
      loadData.then((loadedData) => {
        this.updateState(loadedData);
      });
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps: FixtureExampleProps) {
    if (nextProps.data) {
      this.updateState(nextProps.data);
    }
  }

  updateState = (data: FixtureExampleData) => {
    const { topics, globalVariables, frame } = data;
    this.setState(
      {
        fixture: {
          topics: Object.values(topics),
          globalVariables: globalVariables || { futureTime: 1.5 },
        },
      },
      // Delay passing in the frame in order to work around a MessageHistory behavior
      // where the existing frame is not re-processed when the set of topics changes.
      () => {
        // Additional delay to allow the 3D panel's dynamic setSubscriptions to take effect
        // *before* the fixture changes, not in the same update cycle.
        setImmediate(() => {
          const bobjects = getExperimentalFeature("useBinaryTranslation");
          this.setState((state) => ({
            fixture: { ...state.fixture, frame: bobjects ? bobjectify(data).frame : frame },
          }));
          // Additional delay to trigger updating available namespaces after consuming
          // the messages in SceneBuilder.
          setImmediate(() => {
            this.setState({});
          });
        });
      }
    );
  };

  render() {
    const { fixture } = this.state;
    if (!fixture) {
      return null;
    }
    return (
      <PanelSetup fixture={fixture} onMount={this.props.onMount}>
        <Flex col>
          <ThreeDimensionalViz
            config={this.state.config}
            saveConfig={(config) => this.setState({ config: { ...this.state.config, ...config } })}
          />
          {this.props.futureTime != null && (
            <div style={{ height: "100px" }}>
              <GlobalVariableSliderPanel
                config={{
                  sliderProps: { min: 0, max: 12, step: 0.5 },
                  globalVariableName: "futureTime",
                }}
              />
            </div>
          )}
        </Flex>
      </PanelSetup>
    );
  }
}
