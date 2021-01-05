// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useState, useReducer } from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import helpContent from "./index.help.md";
import { PanelToolbarInput, PanelToolbarLabel } from "webviz-core/shared/panelToolbarStyles";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import KeyListener from "webviz-core/src/components/KeyListener";
import Item from "webviz-core/src/components/Menu/Item";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import Publisher from "webviz-core/src/components/Publisher";
import { PlayerCapabilities, type Topic } from "webviz-core/src/players/types";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

type Config = {|
  topicName: string,
|};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,

  // player state
  capabilities: string[],
  topics: Topic[],
  datatypes: RosDatatypes,
};

const SErrorText = styled.div`
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  padding: 4px;
  color: ${colors.red};
`;

function Teleop(props: Props) {
  const { config, saveConfig, capabilities } = props;
  const { topicName } = config;

  const publisher = React.createRef<Publisher>();

  const [pressing, setPressing] = useState({
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    " ": false,
  });

  const isValidTopic = (t) => {
    return t.startsWith("/") && t.length >= 3;
  };

  const composeTwist = (key) => {
    const COMMANDS = {
      // Map x, y, z, th here
      ArrowUp: [1, 0, 0, 0],
      ArrowDown: [-1, 0, 0, 0],
      ArrowLeft: [0, 0, 0, 1],
      ArrowRight: [0, 0, 0, -1],
      " ": [0, 0, 0, 0], // Stop
    };
    const [x, y, z, th] = COMMANDS[key];
    const speed = 0.5,
      turn = 1.0;
    return {
      linear: {
        x: x * speed,
        y: y * speed,
        z: z * speed,
      },
      angular: {
        x: 0,
        y: 0,
        z: th * turn,
      },
    };
  };

  // https://reactjs.org/docs/hooks-faq.html#is-there-something-like-forceupdate
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const handleKey = (event) => {
    const newPressing = pressing;
    newPressing[event.key] = event.type === "keydown";
    if (publisher.current && isValidTopic(topicName)) {
      if (event.type === "keydown") {
        publisher.current.publish(composeTwist(event.key));
      }
    } else {
      console.error("Publisher not set or topic name invalid");
    }
    setPressing(newPressing);

    // HACK Appears to be required to update the colors quickly (to give feedback when using keyboard)
    forceUpdate();
  };

  // Add handler here for all desired keybindings (they are all the same!)
  const keyHandlers = {
    ArrowLeft: handleKey,
    ArrowRight: handleKey,
    ArrowUp: handleKey,
    ArrowDown: handleKey,
    " ": handleKey, // Space
  };

  const onCommandButtonClick = (command) => {
    // Simulate key press and release
    handleKey({ key: command, type: "keydown" });
    handleKey({ key: command, type: "keyup" });
  };

  const buttonColor = "#00A871";

  const canPublish = capabilities.includes(PlayerCapabilities.advertise) && isValidTopic(topicName);

  const renderError = () => {
    if (topicName.length === 0) {
      return (
        <>
          <SErrorText>Topic name can&apos;t be empty!</SErrorText>
        </>
      );
    } else if (!isValidTopic(topicName)) {
      return (
        <>
          {
            <SErrorText>
              Topic name &quot;{topicName}&quot; is invalid (must be at least 2 characters long and start with /)
            </SErrorText>
          }
        </>
      );
    }
    return <></>;
  };
  const renderMenuContent = () => {
    return (
      <>
        <Item>
          <PanelToolbarLabel>Topic name</PanelToolbarLabel>
          <PanelToolbarInput
            type="text"
            value={config.topicName}
            onChange={(event) => {
              saveConfig({ topicName: event.target.value });
            }}
            placeholder="Choose /cmd_vel if unsure"
          />
        </Item>
      </>
    );
  };

  return (
    <Flex col style={{ height: "100%", padding: "12px" }}>
      {topicName && <Publisher ref={publisher} name="Publish" topic={topicName} datatype="geometry_msgs/Twist" />}

      <KeyListener keyDownHandlers={keyHandlers} keyUpHandlers={keyHandlers} />

      <PanelToolbar floating menuContent={renderMenuContent()} helpContent={helpContent} />
      <Flex row style={{ flex: "0 0 auto", justifyContent: "center", paddingTop: "5px", paddingBottom: "5px" }}>
        <Button
          style={{ backgroundColor: pressing.ArrowUp ? colors.red : buttonColor }}
          disabled={!canPublish}
          tooltip={canPublish ? "" : "Connect to ROS to publish data"}
          onClick={(_) => onCommandButtonClick("ArrowUp")}>
          ↑
        </Button>
      </Flex>
      <Flex row style={{ flex: "0 0 auto", justifyContent: "center", paddingTop: "5px", paddingBottom: "5px" }}>
        <Button
          style={{ backgroundColor: pressing.ArrowLeft ? colors.red : buttonColor }}
          disabled={!canPublish}
          tooltip={canPublish ? "" : "Connect to ROS to publish data"}
          onClick={(_) => onCommandButtonClick("ArrowLeft")}>
          ←
        </Button>
        <Button
          style={{ backgroundColor: pressing.ArrowDown ? colors.red : buttonColor }}
          disabled={!canPublish}
          tooltip={canPublish ? "" : "Connect to ROS to publish data"}
          onClick={(_) => onCommandButtonClick("ArrowDown")}>
          ↓
        </Button>
        <Button
          style={{ backgroundColor: pressing.ArrowRight ? colors.red : buttonColor }}
          disabled={!canPublish}
          tooltip={canPublish ? "" : "Connect to ROS to publish data"}
          onClick={(_) => onCommandButtonClick("ArrowRight")}>
          →
        </Button>
      </Flex>
      <Flex row style={{ flex: "0 0 auto", justifyContent: "center", paddingTop: "5px", paddingBottom: "5px" }}>
        <Button
          style={{ backgroundColor: pressing[" "] ? buttonColor : colors.red }}
          disabled={!canPublish}
          tooltip={canPublish ? "" : "Connect to ROS to publish data"}
          onClick={(_) => onCommandButtonClick(" ")}>
          Stop
        </Button>
      </Flex>
      <Flex row style={{ flex: "0 0 auto", justifyContent: "center", paddingTop: "5px", paddingBottom: "5px" }}>
        {renderError()}
      </Flex>
    </Flex>
  );
}

Teleop.panelType = "Teleop";
Teleop.defaultConfig = {
  topicName: "/cmd_vel",
};
export default hot(Panel<Config>(Teleop));
