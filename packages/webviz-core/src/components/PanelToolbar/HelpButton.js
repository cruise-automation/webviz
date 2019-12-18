// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import HelpCircleIcon from "@mdi/svg/svg/help-circle.svg";
import * as React from "react";

import styles from "./index.module.scss";
import HelpModal from "webviz-core/src/components/HelpModal";
import Icon from "webviz-core/src/components/Icon";
import renderToBody from "webviz-core/src/components/renderToBody";

type Props = {|
  children: React.Node | string,
|};

export default class HelpButton extends React.Component<Props> {
  render() {
    return (
      <>
        <Icon
          tooltip="Help"
          fade
          onClick={() => {
            const modal = renderToBody(
              <HelpModal onRequestClose={() => modal.remove()}>{this.props.children}</HelpModal>
            );
          }}>
          <HelpCircleIcon className={styles.icon} />
        </Icon>
      </>
    );
  }
}
