// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { withState } from "@dump247/storybook-state";
import MinusCircleIcon from "@mdi/svg/svg/minus-circle.svg";
import PlusCircleIcon from "@mdi/svg/svg/plus-circle.svg";
import { storiesOf } from "@storybook/react";
import React from "react";

import ChildToggle from "webviz-core/src/components/ChildToggle";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";

const initialState = {
  isOpen: true,
  value: "",
};

const Block = (props: any) => <div style={{ width: 50, backgroundColor: "red" }}>{props.children}</div>;

function ChildToggleStory({ store }) {
  const { state } = store;
  const onToggle = () => {
    store.set({ isOpen: !state.isOpen });
  };
  const icon = state.isOpen ? <MinusCircleIcon /> : <PlusCircleIcon />;
  return (
    <Flex col center style={{ position: "relative" /* shouldn't affect popup position */ }}>
      <div style={{ margin: 30, border: "1px solid gray" }}>
        <ChildToggle position="right" onToggle={onToggle} isOpen={state.isOpen}>
          <Icon>{icon}</Icon>
          <Block>this opens right-aligned of the icon</Block>
        </ChildToggle>
      </div>
      <div style={{ marginTop: 60, marginBottom: 10, border: "1px solid gray" }}>
        <ChildToggle position="above" onToggle={onToggle} isOpen={state.isOpen}>
          <Icon>{icon}</Icon>
          <Block>this opens above the icon</Block>
        </ChildToggle>
      </div>
      <div style={{ margin: 30, border: "1px solid gray" }}>
        <ChildToggle position="below" onToggle={onToggle} isOpen={state.isOpen}>
          <Icon>{icon}</Icon>
          <Block>this opens below the icon</Block>
        </ChildToggle>
      </div>
      <div style={{ margin: 30, border: "1px solid gray" }}>
        <ChildToggle position="left" onToggle={onToggle} isOpen={state.isOpen}>
          <Icon>{icon}</Icon>
          <Block>this opens left-aligned of the icon</Block>
        </ChildToggle>
      </div>
      <div style={{ margin: 30, border: "1px solid gray" }}>
        <ChildToggle.ContainsOpen>
          {(containsOpen) => (
            <div>
              Contains an open child toggle: {JSON.stringify(containsOpen)}
              <ChildToggle position="below" onToggle={onToggle} isOpen={state.isOpen}>
                <Icon>{icon}</Icon>
                <Block>this opens below</Block>
              </ChildToggle>
            </div>
          )}
        </ChildToggle.ContainsOpen>
      </div>
      <div style={{ margin: 30, border: "1px solid gray" }}>
        <ChildToggle.ContainsOpen>
          {(containsOpen) => (
            <div>
              Contains an open child toggle: {JSON.stringify(containsOpen)}
              <ChildToggle position="below" isOpen={false} onToggle={() => {}}>
                <Icon>{icon}</Icon>
                <Block>this should never be visible</Block>
              </ChildToggle>
            </div>
          )}
        </ChildToggle.ContainsOpen>
      </div>
    </Flex>
  );
}

storiesOf("<ChildToggle>", module)
  .add("controlled", withState(initialState, (store) => <ChildToggleStory store={store} />))
  .add(
    "closes when Escape key pressed",
    withState(initialState, (store) => {
      return (
        <div
          ref={() =>
            setImmediate(() =>
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27 }))
            )
          }>
          <ChildToggleStory store={store} />
        </div>
      );
    })
  );
