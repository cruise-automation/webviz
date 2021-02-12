// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import Table from "webviz-core/src/panels/Table";
import PanelSetup from "webviz-core/src/stories/PanelSetup";

const makeArrayData = (length = 50, nestArray = true) => {
  return new Array(length).fill().map((_, i) => {
    return {
      val: i,
      bool: true,
      str: `${i}-abcd-edfg`,
      n: null,
      obj: {
        date: new Date(`2020-01-${i}`),
      },
      arr: nestArray ? makeArrayData(5, false) : [],
      primitiveArray: [1, 2, 3, 4, 5],
    };
  });
};

const fixture = {
  datatypes: {
    my_arr: {
      fields: [{ type: "json", name: "array", isConstant: false, isArray: true }],
    },
  },
  topics: [{ name: "/my_arr", datatype: "my_arr" }],
  frame: {
    "/my_arr": [
      {
        topic: "/my_arr",
        receiveTime: { sec: 1, nsec: 0 },
        message: { array: makeArrayData() },
      },
    ],
  },
};

storiesOf("<Table>", module)
  .add("no topic path", () => {
    return (
      <PanelSetup fixture={{ frame: {}, topics: [] }}>
        <Table config={{ topicPath: "" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("no data", () => {
    return (
      <PanelSetup fixture={{ frame: {}, topics: [] }}>
        <Table config={{ topicPath: "/unknown" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("arrays", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Table config={{ topicPath: "/my_arr.array" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("expand rows", () => {
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            document.querySelectorAll("[data-test=expand-row-0]")[0].click();
          });
        }}>
        <Table config={{ topicPath: "/my_arr.array" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("expand cells with nested objects", () => {
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            document.querySelectorAll("[data-test=expand-cell-obj-0]")[0].click();
          });
        }}>
        <Table config={{ topicPath: "/my_arr.array" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("expand cells with nested arrays", () => {
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            document.querySelectorAll("[data-test=expand-cell-arr-0]")[0].click();
          });
        }}>
        <Table config={{ topicPath: "/my_arr.array" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })

  .add("expand nested cells", () => {
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            document.querySelectorAll("[data-test=expand-row-0]")[0].click();
            document.querySelectorAll("[data-test=expand-cell-arr-obj-0]")[0].click();
          });
        }}>
        <Table config={{ topicPath: "/my_arr.array" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("expand multiple rows", () => {
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            document.querySelectorAll("[data-test=expand-row-0]")[0].click();
            document.querySelectorAll("[data-test=expand-row-1]")[0].click();
          });
        }}>
        <Table config={{ topicPath: "/my_arr.array" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })

  .add("filtering", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Table config={{ topicPath: "/my_arr.array[:]{val==3}" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("sorting", () => {
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            document.querySelectorAll("[data-test=column-header-val]")[0].click();
            document.querySelectorAll("[data-test=column-header-val]")[0].click();
          });
        }}>
        <Table config={{ topicPath: "/my_arr.array" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("handles primitives", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Table config={{ topicPath: "/my_arr.array[:].val" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("handles arrays of primitives", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Table config={{ topicPath: "/my_arr.array[:].primitiveArray" }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("constrained width", () => {
    return (
      <PanelSetup fixture={fixture}>
        <div style={{ width: "100px" }}>
          <Table config={{ topicPath: "/my_arr.array[:]{val==3}" }} saveConfig={() => {}} />
        </div>
      </PanelSetup>
    );
  });
