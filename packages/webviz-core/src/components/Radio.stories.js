// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import * as React from "react";

import Radio, { type RadioOption } from "webviz-core/src/components/Radio";
import { objectValues } from "webviz-core/src/util";

const OPTIONS = {
  first: {
    id: "first",
    label: "First Option",
  },
  second: {
    id: "second",
    label: <i>Second Option</i>,
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
  const ref = React.useRef();
  React.useLayoutEffect(() => {
    if (ref.current && onMount) {
      onMount(ref.current);
    }
  }, [onMount]);
  return (
    <div style={{ margin: 24, width: 432 }} ref={ref}>
      <p>{title}</p>
      <div style={{ width: 432 }}>{children}</div>
    </div>
  );
}

const optionArr: RadioOption[] = objectValues(OPTIONS);

function ControlledExample() {
  const [selectedId, setSelectedId] = React.useState(OPTIONS.first.id);
  return (
    <Box
      title="clicked the 2nd option manually"
      onMount={React.useCallback((el) => {
        const secondOptionEl = el.querySelector("[data-test='second']");
        if (secondOptionEl) {
          secondOptionEl.click();
        }
      }, [])}>
      <Radio options={optionArr} selectedId={selectedId} onChange={(newId) => setSelectedId(newId)} />
    </Box>
  );
}
storiesOf("<Radio>", module).add("basic", () => (
  <div>
    <Box title="default">
      <Radio options={optionArr} selectedId="first" onChange={() => {}} />
    </Box>
    <ControlledExample />
  </div>
));
