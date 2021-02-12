// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React from "react";

import styles from "./Confirm.module.scss";
import Button from "webviz-core/src/components/Button";
import Flex from "webviz-core/src/components/Flex";
import Modal, { Title } from "webviz-core/src/components/Modal";
import renderToBody from "webviz-core/src/components/renderToBody";

type ConfirmStyle = "danger" | "primary";

type Props = {
  // the title of the confirm modal - defaults to 'Are you sure?'
  title?: string,
  // the prompt text in the body of the confirm modal
  prompt: string,
  // the text for the OK button - defaults to "OK"
  ok?: string,
  // the text for the cancel button - defaults to "Cancel"
  // set to false to completely hide the cancel button
  cancel?: string | false,

  // whether to use red/green/no color on the confirm button
  confirmStyle?: ConfirmStyle,
};

// shows a confirmation modal to the user with an ok and a cancel button
// returns a promise which resolves with true if the user confirmed the modal
// or false if the user closed the modal with escape or clicked the cancel button
export default (props: Props): Promise<boolean> => {
  return new Promise((resolve) => {
    const confirmStyle = props.confirmStyle || "danger";
    const modal = renderToBody(
      <Modal onRequestClose={() => close(false)}>
        <div className={styles.container}>
          <Title>{props.title || "Are you sure?"}</Title>
          <hr />
          <Flex col style={{ padding: "32px" }}>
            <div className={styles.prompt}>{props.prompt}</div>
            <div className={styles.controls}>
              {props.cancel !== false && <Button onClick={() => close(false)}>{props.cancel || "Cancel"}</Button>}
              <Button
                danger={confirmStyle === "danger"}
                primary={confirmStyle === "primary"}
                onClick={() => close(true)}>
                {props.ok || "OK"}
              </Button>
            </div>
          </Flex>
        </div>
      </Modal>
    );

    function close(value) {
      modal.remove();
      resolve(value);
    }
  });
};
