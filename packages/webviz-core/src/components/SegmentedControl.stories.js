// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";

import SegmentedControl, { type Option } from "webviz-core/src/components/SegmentedControl";

const OPTIONS = {
  first: {
    id: "first",
    label: "First Option",
  },
  second: {
    id: "second",
    label: "Second Option",
  },
  third: {
    id: "third",
    label: "Third Option",
  },
};

function Box({
  title = "",
  children,
  onMount,
}: {
  title?: string,
  children: React.Node,
  onMount?: (HTMLDivElement) => void,
}) {
  return (
    <div
      style={{ margin: 24, width: 432 }}
      ref={(el) => {
        if (el && onMount) {
          onMount(el);
        }
      }}>
      <p>{title}</p>
      <div style={{ width: 432 }}>{children}</div>
    </div>
  );
}

// $FlowFixMe
const optionArr: Option[] = Object.values(OPTIONS);

function ControlledExample() {
  const [selectedId, setSelectedId] = React.useState(OPTIONS.first.id);
  return (
    <Box
      title="clicked the 2nd option manually"
      onMount={(el) => {
        const secondOptionEl = el.querySelector("[data-test='second']");
        if (secondOptionEl) {
          secondOptionEl.click();
        }
      }}>
      <SegmentedControl options={optionArr} selectedId={selectedId} onChange={(newId) => setSelectedId(newId)} />
    </Box>
  );
}
storiesOf("<SegmentedControl>", module).add("basic", () => (
  <div>
    <Box title="default">
      <SegmentedControl options={optionArr} selectedId="first" onChange={() => {}} />
    </Box>
    <ControlledExample />
  </div>
));
