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

import buildSampleMessage from "./buildSampleMessage";
import { PanelToolbarInput, PanelToolbarLabel } from "webviz-core/shared/panelToolbarStyles";
import Autocomplete from "webviz-core/src/components/Autocomplete";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Item from "webviz-core/src/components/Menu/Item";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import Publisher from "webviz-core/src/components/Publisher";
import { PlayerCapabilities, type Topic } from "webviz-core/src/players/types";
import colors from "webviz-core/src/styles/colors.module.scss";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

type Config = {|
  topicName: string,
  datatype: string,
  buttonText: string,
  buttonTooltip: string,
  buttonColor: string,
  advancedView: boolean,
  value: string,
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

class Publish extends React.PureComponent<Props, PanelState> {
  static panelType = "Publish";
  static defaultConfig = {
    topicName: "",
    datatype: "",
    buttonText: "Publish",
    buttonTooltip: "",
    buttonColor: "#00A871",
    advancedView: true,
    value: "",
  };

  _publisher = React.createRef<Publisher>();

  state = {
    cachedProps: {},
    datatypeNames: [],
    error: null,
    parsedObject: undefined,
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

    // when the selected datatype changes, replace the textarea contents with a sample message of the correct shape
    // Make sure not to build a sample message on first load, though -- we don't want to overwrite
    // the user's message just because state.cachedProps.config hasn't been initialized.
    if (
      props.config.datatype &&
      state.cachedProps?.config?.datatype != null &&
      props.config.datatype !== state.cachedProps?.config?.datatype &&
      props.datatypes[props.config.datatype] != null
    ) {
      const sampleMessage = buildSampleMessage(props.datatypes, props.config.datatype);
      if (sampleMessage) {
        const stringifiedSampleMessage = JSON.stringify(sampleMessage, null, 2);
        props.saveConfig({ value: stringifiedSampleMessage });
        changed = true;
      }
    }

    return changed ? newState : null;
  }

  _onChangeTopic = (event, topicName: string) => {
    this.props.saveConfig({ topicName });
  };

  // when a known topic is selected, also fill in its datatype
  _onSelectTopic = (topicName: string, topic: Topic, autocomplete: Autocomplete) => {
    this.props.saveConfig({ topicName, datatype: topic.datatype });
    autocomplete.blur();
  };

  _onSelectDatatype = (datatype: string, value: any, autocomplete: Autocomplete) => {
    this.props.saveConfig({ datatype });
    autocomplete.blur();
  };

  _publish = () => {
    const { topicName } = this.props.config;
    const { parsedObject } = this.state;
    if (topicName && parsedObject && this._publisher.current) {
      this._publisher.current.publish(parsedObject);
    } else {
      throw new Error(`called _publish() when input was invalid`);
    }
  };

  _onChange = (event: SyntheticInputEvent<HTMLTextAreaElement>) => {
    this.props.saveConfig({ value: event.target.value });
  };

  _renderMenuContent() {
    const { config, saveConfig } = this.props;

    return (
      <>
        <Item
          icon={config.advancedView ? <CheckboxMarkedIcon /> : <CheckboxBlankOutlineIcon />}
          onClick={() => {
            saveConfig({ advancedView: !config.advancedView });
          }}>
          <span>Advanced mode</span>
        </Item>
        <Item>
          <PanelToolbarLabel>Button text</PanelToolbarLabel>
          <PanelToolbarInput
            type="text"
            value={config.buttonText}
            onChange={(event) => {
              saveConfig({ buttonText: event.target.value });
            }}
            placeholder="Publish"
          />
        </Item>
        <Item>
          <PanelToolbarLabel>Button tooltip</PanelToolbarLabel>
          <PanelToolbarInput
            type="text"
            value={config.buttonTooltip}
            onChange={(event) => {
              saveConfig({ buttonTooltip: event.target.value });
            }}
          />
        </Item>
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
      config: { topicName, datatype, buttonText, buttonTooltip, buttonColor, advancedView, value },
    } = this.props;

    const { datatypeNames, parsedObject, error } = this.state;
    const canPublish = capabilities.includes(PlayerCapabilities.advertise);
    const buttonRowStyle = advancedView ? { flex: "0 0 auto" } : { flex: "0 0 auto", justifyContent: "center" };

    return (
      <Flex col style={{ height: "100%", padding: "12px" }}>
        {topicName && datatype && (
          <Publisher ref={this._publisher} name="Publish" topic={topicName} datatype={datatype} />
        )}
        <PanelToolbar floating menuContent={this._renderMenuContent()} />
        {advancedView && (
          <SRow>
            <SSpan>Topic:</SSpan>
            <Autocomplete
              placeholder="Choose a topic"
              items={topics}
              hasError={false}
              onChange={this._onChangeTopic}
              onSelect={this._onSelectTopic}
              selectedItem={{ name: topicName }}
              getItemText={getTopicName}
              getItemValue={getTopicName}
            />
          </SRow>
        )}
        {advancedView && (
          <SRow>
            <PanelToolbarLabel>Datatype:</PanelToolbarLabel>
            <Autocomplete
              clearOnFocus
              placeholder="Choose a datatype"
              items={datatypeNames}
              onSelect={this._onSelectDatatype}
              selectedItem={datatype}
            />
          </SRow>
        )}
        {advancedView && (
          <STextAreaContainer>
            <STextArea placeholder="Enter message content as JSON" value={value || ""} onChange={this._onChange} />
          </STextAreaContainer>
        )}
        <Flex row style={buttonRowStyle}>
          {error && <SErrorText>{error}</SErrorText>}
          <Button
            style={canPublish ? { backgroundColor: buttonColor } : {}}
            tooltip={canPublish ? buttonTooltip : "Connect to ROS to publish data"}
            disabled={!canPublish || !parsedObject}
            primary={canPublish && !!parsedObject}
            onClick={this._publish}>
            {buttonText}
          </Button>
        </Flex>
      </Flex>
    );
  }
}

export default hot(Panel<Config>(Publish));
