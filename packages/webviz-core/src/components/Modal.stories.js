// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { action } from "@storybook/addon-actions";
import { storiesOf } from "@storybook/react";
import React from "react";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Dropdown from "webviz-core/src/components/Dropdown/index";
import Modal from "webviz-core/src/components/Modal";
import TextContent from "webviz-core/src/components/TextContent";

function ContentStory({ showChildToggle }: {| showChildToggle?: boolean |}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const onToggle = React.useCallback(() => setIsOpen(!isOpen), [isOpen]);
  const renderedRef = React.useRef(false);
  return (
    <Modal onRequestClose={() => {}}>
      <div
        style={{ padding: 20, height: 400, width: 400 }}
        ref={(el) => {
          if (renderedRef.current) {
            return;
          }
          if (!el) {
            return;
          }
          const btn = el.querySelector("button"); // Dropdown or toggle button
          if (!btn) {
            return;
          }
          btn.click();
          renderedRef.current = true;
        }}>
        {showChildToggle ? (
          <ChildToggle position="below" onToggle={onToggle} isOpen={isOpen}>
            <button onClick={onToggle}>Toggle</button>
            <p>ChildToggle component inside a Modal</p>
          </ChildToggle>
        ) : (
          <Dropdown text="Dropdown options inside a Modal" value="two" onChange={() => {}}>
            <span value="foo">one</span>
            <span value="two">two</span>
            <hr />
            <span value="three">three</span>
          </Dropdown>
        )}
      </div>
    </Modal>
  );
}
storiesOf("<Modal>", module)
  .add("basic", () => (
    <Modal onRequestClose={() => action("close")}>
      <div style={{ padding: 20 }}>
        <TextContent>
          <a href="https://google.com" target="_blank" rel="noopener noreferrer">
            link
          </a>
          <div>this is a floating, fixed position modal</div>
          <div>you can press escape or click outside of the modal to fire the close action</div>
        </TextContent>
      </div>
    </Modal>
  ))
  .add("with ChildToggle content", () => <ContentStory showChildToggle />)
  .add("with DropDown content", () => <ContentStory />);
