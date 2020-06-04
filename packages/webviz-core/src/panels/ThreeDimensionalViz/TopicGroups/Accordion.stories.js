// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";
import { withScreenshot } from "storycap";

import Accordion from "./Accordion";

const childrenContent = (
  <div>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aliquam, dicta omnis saepe assumenda ipsam ut libero
      ullam adipisci alias laudantium in ad possimus ex sunt fuga temporibus debitis ab porro odio reprehenderit eveniet
      id! Architecto harum officiis soluta accusantium nulla, vitae exercitationem a voluptates itaque eius illum sit
      consectetur cupiditate?
    </p>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aliquam, dicta omnis saepe assumenda ipsam ut libero
      ullam adipisci alias laudantium in ad possimus ex sunt fuga temporibus debitis ab porro odio reprehenderit eveniet
      id! Architecto harum officiis soluta accusantium nulla, vitae exercitationem a voluptates itaque eius illum sit
      consectetur cupiditate?
    </p>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aliquam, dicta omnis saepe assumenda ipsam ut libero
      ullam adipisci alias laudantium in ad possimus ex sunt fuga temporibus debitis ab porro odio reprehenderit eveniet
      id! Architecto harum officiis soluta accusantium nulla, vitae exercitationem a voluptates itaque eius illum sit
      consectetur cupiditate?
    </p>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aliquam, dicta omnis saepe assumenda ipsam ut libero
      ullam adipisci alias laudantium in ad possimus ex sunt fuga temporibus debitis ab porro odio reprehenderit eveniet
      id! Architecto harum officiis soluta accusantium nulla, vitae exercitationem a voluptates itaque eius illum sit
      consectetur cupiditate?
    </p>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aliquam, dicta omnis saepe assumenda ipsam ut libero
      ullam adipisci alias laudantium in ad possimus ex sunt fuga temporibus debitis ab porro odio reprehenderit eveniet
      id! Architecto harum officiis soluta accusantium nulla, vitae exercitationem a voluptates itaque eius illum sit
      consectetur cupiditate?
    </p>
  </div>
);
function ClickedExample() {
  const [active, setActive] = React.useState(false);
  return (
    <div
      ref={() => {
        const btn = document.querySelector("[data-test='test-btn']");
        if (btn) {
          btn.click();
        }
      }}>
      <Accordion
        active={active}
        onToggle={() => setActive(!active)}
        renderHeader={({ onToggle }) => (
          <div>
            <button data-test="test-btn" onClick={onToggle}>
              Click
            </button>
          </div>
        )}>
        {childrenContent}
      </Accordion>
    </div>
  );
}
storiesOf("<Accordion>", module)
  .addDecorator(withScreenshot())
  .add("default", () => {
    return (
      <div>
        <Accordion onToggle={() => {}}>{childrenContent}</Accordion>
        <Accordion active onToggle={() => {}} headerContent={<div>Click Me</div>}>
          {childrenContent}
        </Accordion>
        <Accordion
          active
          onToggle={() => {}}
          renderHeader={({ active, onToggle }) => (
            <div>
              <button onClick={onToggle}>Click</button>
            </div>
          )}>
          {childrenContent}
        </Accordion>
      </div>
    );
  })
  .add("click to expand", () => <ClickedExample />);
