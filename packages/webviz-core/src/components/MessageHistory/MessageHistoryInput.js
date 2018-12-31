// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import MenuDownIcon from "@mdi/svg/svg/menu-down.svg";
import cx from "classnames";
import React, { PureComponent } from "react";
import { connect } from "react-redux";

import type { MessageHistoryTimestampMethod } from ".";
import styles from "./MessageHistoryInput.module.scss";
import {
  type StructureTraversalResult,
  traverseStructure,
  messagePathStructures,
  messagePathsForDatatype,
  validTerminatingStructureItem,
} from "./messagePathsForDatatype";
import parseRosPath from "./parseRosPath";
import Autocomplete from "webviz-core/src/components/Autocomplete";
import Dropdown from "webviz-core/src/components/Dropdown";
import Icon from "webviz-core/src/components/Icon";
import { TOPICS_WITH_INCORRECT_HEADERS } from "webviz-core/src/components/MessageHistory/internalCommon";
import Tooltip from "webviz-core/src/components/Tooltip";
import type { State } from "webviz-core/src/reducers";
import { getTopicNames } from "webviz-core/src/selectors";
import type { Topic } from "webviz-core/src/types/dataSources";
import type { RosDatatypes } from "webviz-core/src/types/RosDatatypes";

function topicHasNoHeaderStamp(topic: Topic, datatypes: RosDatatypes): boolean {
  const structureTraversalResult = traverseStructure(messagePathStructures(datatypes)[topic.datatype], [
    { type: "name", name: "header" },
    { type: "name", name: "stamp" },
  ]);

  return (
    !structureTraversalResult.valid ||
    !validTerminatingStructureItem(structureTraversalResult.structureItem, ["time"]) ||
    TOPICS_WITH_INCORRECT_HEADERS.includes(topic.name)
  );
}

type MessageHistoryInputProps = {|
  path: string, // A path of the form `/topic.some_field[:]{id==42}.x`
  index: ?number, // Optional index field which gets passed to `onChange` (so you don't have to create anonymous functions)
  onChange: (value: string, index: ?number) => void,
  validTypes: ?(string[]), // Valid types, like "message", "array", or "primitive", or a ROS primitive like "float64"
  noMultiSlices?: boolean, // Don't suggest slices with multiple values `[:]`, only single values like `[0]`.
  autoSize?: boolean,
  placeholder?: string,
  inputStyle?: Object,

  timestampMethod?: MessageHistoryTimestampMethod,
  onTimestampMethodChange?: (MessageHistoryTimestampMethod, index: ?number) => void,

  // From dataSource
  topics: Topic[],
  datatypes: RosDatatypes,
|};
type MessageHistoryInputState = {| focused: boolean |};
class MessageHistoryInput extends PureComponent<MessageHistoryInputProps, MessageHistoryInputState> {
  _input: ?HTMLInputElement;

  constructor(props: MessageHistoryInputProps) {
    super(props);
    this.state = { focused: false };
  }

  // Have to wrap in a setTimeout to prevent hiding when selecting an item.
  _onBlur = () => {
    setTimeout(() => {
      if (this._input && document.activeElement !== this._input) {
        this.setState({ focused: false });
      }
    }, 250);
  };

  _onChange = (event: SyntheticInputEvent<HTMLInputElement>, value: string) => {
    // When typing a "{" character, also  insert a "}", so you get an
    // autocomplete window immediately for selecting a filter name.
    // $FlowFixMe
    if (event.nativeEvent.data === "{") {
      const newCursorPosition = event.target.selectionEnd;
      value = `${value.slice(0, newCursorPosition)}}${value.slice(newCursorPosition)}`;

      const target = event.target;
      setImmediate(() => target.setSelectionRange(newCursorPosition, newCursorPosition));
    }
    this.props.onChange(value, this.props.index);
  };

  _onTimestampMethodChange = (value: MessageHistoryTimestampMethod) => {
    if (this.props.onTimestampMethodChange) {
      this.props.onTimestampMethodChange(value, this.props.index);
    }
  };

  _onSelect = (
    value: string,
    autocomplete: Autocomplete,
    autocompleteType: ?("topicName" | "messagePath"),
    autocompleteRange: {| start: number, end: number |}
  ) => {
    // If we're dealing with a topic name, and we cannot validly end in a message type,
    // add a "." so the user can keep typing to autocomplete the message path.
    const keepGoingAfterTopicName =
      autocompleteType === "topicName" && this.props.validTypes && !this.props.validTypes.includes("message");
    if (keepGoingAfterTopicName) {
      value += ".";
    }
    this.props.onChange(
      this.props.path.substr(0, autocompleteRange.start) + value + this.props.path.substr(autocompleteRange.end),
      this.props.index
    );
    // We want to continue typing if we're dealing with a topic name,
    // or if we just autocompleted something with a filter (because we might want to
    // edit that filter), or if the autocomplete already has a filter (because we might
    // have just autocompleted a name inside that filter).
    if (keepGoingAfterTopicName || value.includes("{") || this.props.path.includes("{")) {
      const newCursorPosition = autocompleteRange.start + value.length;
      setImmediate(() => autocomplete.setSelectionRange(newCursorPosition, newCursorPosition));
    } else {
      autocomplete.blur();
    }
  };

  render() {
    const {
      path,
      topics,
      datatypes,
      validTypes,
      autoSize,
      placeholder,
      noMultiSlices,
      timestampMethod,
      inputStyle,
    } = this.props;

    const rosPath = parseRosPath(path);
    let autocompleteType: ?("topicName" | "messagePath");
    let topic: ?Topic;
    let structureTraversalResult: ?StructureTraversalResult;
    if (rosPath) {
      const { topicName } = rosPath;
      topic = topics.find(({ name }) => name === topicName);

      if (topic) {
        structureTraversalResult = traverseStructure(
          messagePathStructures(datatypes)[topic.datatype],
          rosPath.messagePath
        );
      }

      if (!topic) {
        autocompleteType = "topicName";
      } else if (
        !structureTraversalResult ||
        !structureTraversalResult.valid ||
        !validTerminatingStructureItem(structureTraversalResult.structureItem, validTypes)
      ) {
        autocompleteType = "messagePath";
      }
    } else {
      autocompleteType = "topicName";
    }

    let autocompleteItems = [];
    let autocompleteFilterText = "";
    let autocompleteRange = { start: 0, end: Infinity };
    if (autocompleteType === "topicName") {
      autocompleteItems = getTopicNames(topics);
      autocompleteFilterText = path;
    } else if (autocompleteType === "messagePath" && topic) {
      if (
        structureTraversalResult &&
        !structureTraversalResult.valid &&
        structureTraversalResult.msgPathPart &&
        structureTraversalResult.msgPathPart.type === "filter" &&
        structureTraversalResult.structureItem &&
        structureTraversalResult.structureItem.structureType === "message"
      ) {
        autocompleteItems = Object.keys(structureTraversalResult.structureItem.nextByName);
        autocompleteFilterText = structureTraversalResult.msgPathPart.name;
        autocompleteRange = {
          start: structureTraversalResult.msgPathPart.nameLoc,
          end: structureTraversalResult.msgPathPart.nameLoc + structureTraversalResult.msgPathPart.name.length,
        };
      } else {
        autocompleteItems = messagePathsForDatatype(topic.datatype, datatypes, validTypes, noMultiSlices).filter(
          // .header.seq is pretty useless but shows up everryyywhere.
          (msgPath) => msgPath !== "" && !msgPath.endsWith(".header.seq")
        );
        autocompleteRange = { start: topic.name.length, end: Infinity };
        // Filter out filters (hah!) in a pretty crude way, so autocomplete still works
        // when already having specified a filter and you want to see what other object
        // names you can complete it with. Kind of an edge case, and this doesn't work
        // ideally (because it will remove your existing filter if you actually select
        // the autocomplete item), but it's easy to do for now, and nice to have.
        autocompleteFilterText = path.substr(topic.name.length).replace(/\{[^}]*\}/g, "");
      }
    }

    const noHeaderStamp = topic && topicHasNoHeaderStamp(topic, datatypes);

    return (
      <div style={{ display: "flex", flex: "1 1 auto", minWidth: 0 }}>
        <Autocomplete
          items={autocompleteItems}
          filterText={autocompleteFilterText}
          value={path}
          onChange={this._onChange}
          onSelect={(value: string, item: any, autocomplete: Autocomplete) =>
            this._onSelect(value, autocomplete, autocompleteType, autocompleteRange)
          }
          hasError={!!autocompleteType}
          autocompleteKey={autocompleteType}
          placeholder={placeholder || "/some/topic.msgs[0].field"}
          autoSize={autoSize}
          inputStyle={inputStyle}
        />

        {timestampMethod && (
          <div className={styles.timestampMethodDropdownContainer}>
            <Dropdown
              onChange={this._onTimestampMethodChange}
              value={timestampMethod}
              toggleComponent={
                <Tooltip contents="Timestamp used for x-axis" placement="right">
                  <div
                    className={cx({
                      [styles.timestampMethodDropdown]: true,
                      [styles.timestampMethodDropdownError]: timestampMethod === "headerStamp" && noHeaderStamp,
                    })}>
                    {timestampMethod === "receiveTime" ? "(receive time)" : "(header.stamp)"}
                    <Icon style={{ position: "relative", top: 2, marginLeft: 2 }}>
                      <MenuDownIcon />
                    </Icon>
                  </div>
                </Tooltip>
              }>
              {/* $FlowFixMe - "value" is needed for <Dropdown>, but it's not part of <Tooltip>. */}
              <Tooltip
                value="receiveTime"
                placement="right"
                contents="ROS-time at which the message was received and recorded">
                <span>receive time</span>
              </Tooltip>
              {/* $FlowFixMe - "value" is needed for <Dropdown>, but it's not part of <Tooltip>. */}
              <Tooltip
                value="headerStamp"
                placement="below"
                contents={
                  <div style={{ maxWidth: 200, lineHeight: "normal" }}>
                    Value of the header.stamp field. Can mean different things for different topics. Be sure you know
                    what this value means before using it.
                    {noHeaderStamp && (
                      <div className={styles.timestampItemError}>(header.stamp is not present in this topic)</div>
                    )}
                  </div>
                }>
                <span
                  className={cx({
                    [styles.timestampItemError]: noHeaderStamp,
                  })}>
                  header.stamp
                </span>
              </Tooltip>
            </Dropdown>
          </div>
        )}
      </div>
    );
  }
}

export default connect((state: State) => ({
  topics: state.dataSource.topics,
  datatypes: state.dataSource.datatypes,
}))(MessageHistoryInput);
