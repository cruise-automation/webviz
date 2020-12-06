// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import * as React from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import { PanelToolbarInput, PanelToolbarLabel } from "webviz-core/shared/panelToolbarStyles";
import Autocomplete from "webviz-core/src/components/Autocomplete";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Item from "webviz-core/src/components/Menu/Item";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import Publisher from "webviz-core/src/components/Publisher";
import KeyListener from "webviz-core/src/components/KeyListener";
import { PlayerCapabilities, type Topic } from "webviz-core/src/players/types";
import colors from "webviz-core/src/styles/colors.module.scss";
import { colors as c } from "webviz-core/src/util/sharedStyleConstants";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";
import { string } from "prop-types";

type Config = {|
  buttonColor: string,
|};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,

  // player state
  capabilities: string[],
  topics: Topic[],
  datatypes: RosDatatypes,
};

type PanelState = {|
  cachedProps: $Shape<Props>,
  datatypeNames: string[],
  parsedObject: ?any,
  error: ?string,
  pressing: any,
  topic: string,
|};

const STextArea = styled.textarea`
  width: 100%;
  height: 100%;
  resize: none;
`;

const STextAreaContainer = styled.div`
  flex-grow: 1;
  padding: 12px 0;
`;

const SErrorText = styled.div`
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  padding: 4px;
  color: ${colors.red};
`;

const SSpan = styled.span`
  opacity: 0.8;
`;
const SRow = styled.div`
  display: flex;
  line-height: 24px;
  flex-shrink: 0;
`;

function getTopicName(topic: Topic): string {
  return topic.name;
}

function parseInput(value: string): $Shape<PanelState> {
  let parsedObject;
  let error = null;
  try {
    const parsedAny = JSON.parse(value);
    if (Array.isArray(parsedAny)) {
      error = "Message content must be an object, not an array";
    } else if (parsedAny === null) {
      error = "Message content must be an object, not null";
    } else if (typeof parsedAny !== "object") {
      error = `Message content must be an object, not ‘${typeof parsedAny}’`;
    } else {
      parsedObject = parsedAny;
    }
  } catch (e) {
    error = value ? e.message : "";
  }
  return { error, parsedObject };
}

class Teleop extends React.PureComponent<Props, PanelState> {
  static panelType = "Teleop";
  static defaultConfig = {
    buttonColor: "#00A871",
  };

  _publisher = React.createRef<Publisher>();

  state = {
    cachedProps: {},
    datatypeNames: [],
    error: null,
    parsedObject: undefined,
    pressing: {ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false},
  };

  static getDerivedStateFromProps(props: Props, state: PanelState) {
    const newState: $Shape<PanelState> = parseInput(props.config.value);
    let changed = false;

    if (props !== state.cachedProps) {
      newState.cachedProps = props;
      changed = true;
    }

    if (props.datatypes !== state.cachedProps.datatypes) {
      newState.datatypeNames = Object.keys(props.datatypes).sort();
      changed = true;
    }

    return changed ? newState : null;
  }

  composeTwist = (key) => {
    const COMMANDS = { // Map x, y, z, th here
      ArrowUp: [1, 0, 0, 0], 
      ArrowDown: [-1, 0, 0, 0], 
      ArrowLeft: [0, 0, 0, 1], 
      ArrowRight: [0, 0, 0, -1],
      " ": [0, 0, 0, 0], // Stop
    };
    const [x, y, z, th] = COMMANDS[key];
    const speed = 0.5, turn = 1.0;
    return {
      linear: {
        x: x*speed,
        y: y*speed,
        z: z*speed
      },
      angular: {
        x: 0,
        y: 0,
        z: th * turn
      }
    }
  };

  _onChange = (event: SyntheticInputEvent<HTMLTextAreaElement>) => {
    this.props.saveConfig({ value: event.target.value });
  };

  _onCommandButtonClick = (command) => {
    // Simulate key press and release
    this._handleKey({key: command, type: "keydown"});
    this._handleKey({key: command, type: "keyup"});
  };

  _handleKey = (event) => {
    this.setState(function(state, props) {
      let newPressing = state.pressing;
      newPressing[event.key] = event.type == "keydown";
      if(this._publisher.current){
        if(event.type=="keydown" ){
          this._publisher.current.publish(this.composeTwist(event.key));
        }
      } else {
        console.error("Publisher not set!");
      }
      return {
        pressing: newPressing
      };
    });

    this.forceUpdate(); // HACK Appears to be required to update the colors quickly???
  };

  // Add handler here for all desired keybindings (they are all the same!)
  _keyHandlers = {
    ArrowLeft: this._handleKey,
    ArrowRight: this._handleKey,
    ArrowUp: this._handleKey,
    ArrowDown: this._handleKey,
    " ": this._handleKey, // Space
  };

  _renderMenuContent() {
    const { config, saveConfig } = this.props;

    return (
      <>
        <Item>
          <PanelToolbarLabel>Button color (rgba or hex)</PanelToolbarLabel>
          <PanelToolbarInput
            type="text"
            value={config.buttonColor}
            onChange={(event) => {
              saveConfig({ buttonColor: event.target.value });
            }}
            placeholder="rgba(1,1,1,1) or #FFFFFF"
          />
        </Item>
      </>
    );
  }

  render() {
    const {
      capabilities,
      topics,
      config: { buttonColor },
    } = this.props;

    const { datatypeNames, parsedObject, error, pressing } = this.state;
    const canPublish = capabilities.includes(PlayerCapabilities.advertise);

    return (
      <Flex col style={{ height: "100%", padding: "12px" }} onKeyPress={this.handleKey}>
        <Publisher ref={this._publisher} name="Publish" topic="/cmd_vel" datatype="geometry_msgs/Twist" />
        
        <KeyListener global keyDownHandlers={this._keyHandlers} keyUpHandlers={this._keyHandlers} />
        <PanelToolbar floating menuContent={this._renderMenuContent()} />
        <Flex row style={{ flex: "0 0 auto", justifyContent: "center", "paddingTop": "5px", "paddingBottom": "5px"}}>
          <Button
            style={{backgroundColor: pressing.ArrowUp ? colors.red : buttonColor}}
            disabled={!canPublish}
            tooltip={canPublish ? "" : "Connect to ROS to publish data"}
            onClick={(e) => this._onCommandButtonClick("ArrowUp")}
          >↑</Button>
        </Flex>
        <Flex row style={{ flex: "0 0 auto", justifyContent: "center", "paddingTop": "5px", "paddingBottom": "5px"}}>
          <Button
            style={{backgroundColor: pressing.ArrowLeft ? colors.red : buttonColor}}
            disabled={!canPublish}
            tooltip={canPublish ? "" : "Connect to ROS to publish data"}
            onClick={(e) => this._onCommandButtonClick("ArrowLeft")}
          >←</Button>
          <Button
            style={{backgroundColor: pressing.ArrowDown ? colors.red : buttonColor}}
            disabled={!canPublish}
            tooltip={canPublish ? "" : "Connect to ROS to publish data"}
            onClick={(e) => this._onCommandButtonClick("ArrowDown")}
          >↓</Button>
          <Button
            style={{backgroundColor: pressing.ArrowRight ? colors.red : buttonColor}}
            disabled={!canPublish}
            tooltip={canPublish ? "" : "Connect to ROS to publish data"}
            onClick={(e) => this._onCommandButtonClick("ArrowRight")}
          >→</Button>
        </Flex>
        <Flex row style={{ flex: "0 0 auto", justifyContent: "center", "paddingTop": "5px", "paddingBottom": "5px"}}>
          <Button
            style={{backgroundColor: pressing[" "] ? buttonColor : colors.red}}
            disabled={!canPublish}
            tooltip={canPublish ? "" : "Connect to ROS to publish data"}
            onClick={(e) => this._onCommandButtonClick(" ")}
          >Stop</Button>
        </Flex>
      </Flex>
    );
  }
}

export default hot(Panel<Config>(Teleop));
