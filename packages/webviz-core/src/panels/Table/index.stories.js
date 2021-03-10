// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { isEqual } from "lodash";
import React from "react";

import Table from "webviz-core/src/panels/Table";
import type { Config } from "webviz-core/src/panels/Table/types";
import PanelSetup from "webviz-core/src/stories/PanelSetup";
import type { SaveConfig } from "webviz-core/src/types/panels";

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
        <Table config={{ topicPath: "", cellConfigs: {} }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("no data", () => {
    return (
      <PanelSetup fixture={{ frame: {}, topics: [] }}>
        <Table config={{ topicPath: "/unknown", cellConfigs: {} }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("arrays", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Table config={{ topicPath: "/my_arr.array", cellConfigs: {} }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("expand rows", () => {
    const saveConfig: SaveConfig<Config> = ({ cellConfigs }) => {
      if (!isEqual(cellConfigs, { "": { sortBy: [], rowConfigs: [{ isExpanded: false }] } })) {
        throw new Error(`Got unexpected row configs ${JSON.stringify(cellConfigs ?? null)}`);
      }
    };

    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            document.querySelectorAll("[data-test=expand-row-0]")[0].click();
          });
        }}>
        <Table
          config={{
            topicPath: "/my_arr.array",
            cellConfigs: { "": { sortBy: [], rowConfigs: [{ isExpanded: true }] } },
          }}
          saveConfig={saveConfig}
        />
      </PanelSetup>
    );
  })
  .add("expand cells with nested objects", () => {
    const saveConfig: SaveConfig<Config> = ({ cellConfigs }) => {
      if (!isEqual(cellConfigs, { "obj[0]": { sortBy: [], isExpanded: false } })) {
        throw new Error(`Got unexpected cell configs ${JSON.stringify(cellConfigs ?? null)}`);
      }
    };
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            document.querySelectorAll("[data-test=expand-cell-obj-0]")[0].click();
          });
        }}>
        <Table
          config={{ topicPath: "/my_arr.array", cellConfigs: { "obj[0]": { sortBy: [], isExpanded: true } } }}
          saveConfig={saveConfig}
        />
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
        <Table
          config={{ topicPath: "/my_arr.array", cellConfigs: { "arr[0]": { sortBy: [], isExpanded: true } } }}
          saveConfig={() => {}}
        />
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
            document.querySelectorAll("[data-test=expand-cell-arr-0-obj-0]")[0].click();
          });
        }}>
        <Table
          config={{
            topicPath: "/my_arr.array",
            cellConfigs: {
              "": { sortBy: [], rowConfigs: [{ isExpanded: true }] },
              "arr[0].obj[0]": { sortBy: [], isExpanded: true },
            },
          }}
          saveConfig={() => {}}
        />
      </PanelSetup>
    );
  })
  .add("expand multiple rows", () => {
    const expectedConfigs = [
      { "": { sortBy: [], rowConfigs: [{ isExpanded: false }, { isExpanded: true }] } },
      // The first click's config update is not actually persisted, so not reflected in the second.
      { "": { sortBy: [], rowConfigs: [{ isExpanded: true }, { isExpanded: false }] } },
    ];
    const saveConfig: SaveConfig<Config> = ({ cellConfigs }) => {
      const expectedConfig = expectedConfigs.shift();
      if (!isEqual(cellConfigs, expectedConfig)) {
        throw new Error(`Expected ${JSON.stringify(expectedConfig)}, got ${JSON.stringify(cellConfigs ?? null)}`);
      }
    };
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            document.querySelectorAll("[data-test=expand-row-0]")[0].click();
            document.querySelectorAll("[data-test=expand-row-1]")[0].click();
          });
        }}>
        <Table
          config={{
            topicPath: "/my_arr.array",
            cellConfigs: { "": { sortBy: [], rowConfigs: [{ isExpanded: true }, { isExpanded: true }] } },
          }}
          saveConfig={saveConfig}
        />
      </PanelSetup>
    );
  })

  .add("filtering", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Table config={{ topicPath: "/my_arr.array[:]{val==3}", cellConfigs: {} }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("sorting", () => {
    const expectedConfigs = [
      { "": { sortBy: [{ id: "val", desc: false }] } },
      { "": { sortBy: [{ id: "val", desc: true }] } },
    ];
    const saveConfig: SaveConfig<Config> = ({ cellConfigs }) => {
      const expectedConfig = expectedConfigs.shift();
      if (!isEqual(cellConfigs, expectedConfig)) {
        throw new Error(`Expected ${JSON.stringify(expectedConfig)}, got ${JSON.stringify(cellConfigs ?? null)}`);
      }
    };
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            document.querySelectorAll("[data-test=column-header-val]")[0].click();
            document.querySelectorAll("[data-test=column-header-val]")[0].click();
          });
        }}>
        <Table config={{ topicPath: "/my_arr.array", cellConfigs: {} }} saveConfig={saveConfig} />
      </PanelSetup>
    );
  })
  .add("sorted from config", () => {
    const config = {
      topicPath: "/my_arr.array",
      cellConfigs: { "": { sortBy: [{ id: "val", desc: true }, { id: "random-missing-col", desc: false }] } },
    };
    return (
      <PanelSetup fixture={fixture}>
        <Table config={config} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("handles primitives", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Table config={{ topicPath: "/my_arr.array[:].val", cellConfigs: {} }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("handles arrays of primitives", () => {
    return (
      <PanelSetup fixture={fixture}>
        <Table config={{ topicPath: "/my_arr.array[:].primitiveArray", cellConfigs: {} }} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("constrained width", () => {
    return (
      <PanelSetup fixture={fixture}>
        <div style={{ width: "100px" }}>
          <Table config={{ topicPath: "/my_arr.array[:]{val==3}", cellConfigs: {} }} saveConfig={() => {}} />
        </div>
      </PanelSetup>
    );
  })
  .add("conditional formatting", () => {
    const config = {
      topicPath: "/my_arr.array",
      columnConfigs: {
        val: {
          conditionalFormats: {
            ["1"]: {
              comparator: ">",
              primitive: 10,
              color: "red",
            },
          },
        },
      },
      cellConfigs: {},
    };
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            // TODO: fix
            document.querySelectorAll("[data-test=expand-settings]")[0].click();
          });
        }}>
        <Table config={config} saveConfig={() => {}} />
      </PanelSetup>
    );
  })
  .add("conditional formatting on nested fields", () => {
    const config = {
      topicPath: "/my_arr.array",
      columnConfigs: {
        val: {
          conditionalFormats: {
            ["1"]: {
              comparator: ">",
              primitive: 10,
              color: "red",
            },
          },
        },
        ["arr.val"]: {
          conditionalFormats: {
            ["2"]: {
              comparator: "<",
              primitive: 3,
              color: "red",
            },
          },
        },
      },
      cellConfigs: {
        "arr[0]": {
          isExpanded: true,
          sortBy: [],
        },
        "arr[1]": {
          isExpanded: true,
          sortBy: [],
        },
      },
    };
    return (
      <PanelSetup
        fixture={fixture}
        onMount={() => {
          setImmediate(() => {
            // TODO: fix
            document.querySelectorAll("[data-test=expand-settings]")[0].click();
          });
        }}>
        <Table config={config} saveConfig={() => {}} />
      </PanelSetup>
    );
  });
