// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import React, { Component } from "react";

import styles from "./ShareJsonModal.module.scss";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Modal from "webviz-core/src/components/Modal";
import clipboard from "webviz-core/src/util/clipboard";
import sentry from "webviz-core/src/util/sentry";

type Props = {
  onRequestClose: () => void,
  onChange: (value: any) => void,
  // the panel state from redux
  // this will be serialized to json & displayed
  value: any, // eslint-disable-line react/no-unused-prop-types
  noun: string,
};

type State = {|
  value: string,
  error: boolean,
  copied: boolean,
|};

function encode(value: any): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    sentry.captureException(e, { extra: value });
    console.error("Error encoding value", e);
    return "";
  }
}

function decode(value: any): string {
  try {
    return JSON.parse(value);
  } catch (err) {
    return JSON.parse(atob(value));
  }
}

export default class ShareJsonModal extends Component<Props, State> {
  state = {
    value: encode(this.props.value),
    error: false,
    copied: false,
  };

  onChange = () => {
    const { onChange } = this.props;
    const { value } = this.state;
    try {
      return onChange(decode(value));
    } catch (e) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Error parsing value from base64 json", e);
      }
      this.setState({ error: true });
    }
  };

  onCopy = () => {
    const { value } = this.state;
    clipboard.copy(value);
    this.setState({ copied: true });

    setTimeout(() => this.setState({ copied: false }), 1500);
  };

  renderError() {
    const { error } = this.state;
    if (!error) {
      return null;
    }
    return <div className="notification is-danger">The input you provided is invalid.</div>;
  }

  render() {
    const { value, copied } = this.state;

    return (
      <Modal
        onRequestClose={this.props.onRequestClose}
        contentStyle={{
          height: 400,
          width: 600,
          display: "flex",
        }}>
        <Flex col className={styles.container}>
          <p>
            <em>Paste a new {this.props.noun} to use it, or copy this one to share it:</em>
          </p>
          <textarea
            className={cx("textarea", styles.textarea)}
            value={value}
            onChange={(e) => this.setState({ value: e.target.value })}
          />
          {this.renderError()}
          <div className={styles.buttonBar}>
            <Button primary onClick={this.onChange}>
              Apply
            </Button>
            <Button onClick={this.onCopy}>{copied ? "Copied!" : "Copy"}</Button>
            <Button onClick={() => this.setState({ value: "{}" })}>Clear</Button>
          </div>
        </Flex>
      </Modal>
    );
  }
}
