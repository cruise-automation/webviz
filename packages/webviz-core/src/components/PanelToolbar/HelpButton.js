// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
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
import TextContent from "webviz-core/src/components/TextContent";
import { getGlobalHooks } from "webviz-core/src/loadWebviz";

function Footnote() {
  const FootnoteInternal = getGlobalHooks().helpPageFootnote;
  return (
    <TextContent>
      <div className={styles.helpModalFootnote}>
        <FootnoteInternal />
      </div>
    </TextContent>
  );
}

type Props = {|
  children: React.Node | string,
|};

export default class HelpButton extends React.Component<Props> {
  render() {
    return (
      <React.Fragment>
        <Icon
          tooltip="Help"
          fade
          onClick={() => {
            const modal = renderToBody(
              <HelpModal onRequestClose={() => modal.remove()} footer={<Footnote />}>
                {this.props.children}
              </HelpModal>
            );
          }}>
          <HelpCircleIcon className={styles.icon} />
        </Icon>
      </React.Fragment>
    );
  }
}
