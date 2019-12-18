// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LeadPencilIcon from "@mdi/svg/svg/lead-pencil.svg";
import _ from "lodash";
import React, { PureComponent } from "react";
import { hot } from "react-hot-loader/root";
import styled from "styled-components";

import helpContent from "./index.help.md";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";

type Config = {
  noteText: string,
};

type Props = {
  config: Config,
  saveConfig: ($Shape<Config>) => void,
};

type State = {
  isEditing: boolean,
  currentNoteText: string,
};

const STextAreaContainer = styled.div`
  flex-grow: 1;
  padding: 12px 0;
`;

const STextArea = styled.textarea`
  width: 100%;
  height: 100%;
  resize: none;
`;

class Note extends PureComponent<Props, State> {
  static panelType = "Note";
  static defaultConfig = {
    noteText: "",
  };

  state = {
    isEditing: false,
    currentNoteText: this.props.config.noteText,
  };

  changeNoteText = (e) => {
    this.setState({
      currentNoteText: e.target.value,
    });
  };

  saveNoteText = () => {
    this.props.saveConfig({
      noteText: this.state.currentNoteText,
    });
    this.setState({
      isEditing: false,
    });
  };

  startEditing = () => {
    this.setState({ isEditing: true });
  };

  clearNote = (e) => {
    this.setState({
      currentNoteText: "",
    });
  };

  render() {
    return (
      <Flex col style={{ height: "100%", padding: "15px" }}>
        <PanelToolbar helpContent={helpContent} floating />
        {this.state.isEditing ? (
          <div style={{ height: "100%" }}>
            <STextAreaContainer style={{ height: "95%" }}>
              <STextArea
                placeholder="Enter note here"
                value={this.state.currentNoteText}
                onChange={this.changeNoteText}
              />
            </STextAreaContainer>
            <Flex style={{ justifyContent: "flex-end" }}>
              <Button onClick={this.clearNote}>Clear</Button>
              <Button primary onClick={this.saveNoteText}>
                Save
              </Button>
            </Flex>
          </div>
        ) : (
          <Flex col>
            <p style={{ whiteSpace: "pre-wrap" }}>{this.state.currentNoteText}</p>
            <Flex start>
              <button onClick={this.startEditing}>
                <Icon>
                  <LeadPencilIcon />
                </Icon>
              </button>
            </Flex>
          </Flex>
        )}
      </Flex>
    );
  }
}

export default hot(Panel<Config>(Note));
