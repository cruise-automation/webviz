// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { groupLinesIntoInstancedLineLists } from "./groupingUtils";
import type { Color, Point, LineStripMarker, LineListMarker } from "webviz-core/src/types/Messages";
import { COLORS, MARKER_MSG_TYPES } from "webviz-core/src/util/globalConstants";

function lineStrip({
  points,
  closed,
  color,
}: {|
  points: Point[],
  closed?: boolean,
  color?: ?Color,
|}): LineStripMarker {
  return {
    id: "foo",
    ns: "bar",
    scale: { x: 1.0, y: 1.0, z: 1.0 },
    points,
    ...(closed !== undefined ? { closed } : {}),
    header: { frame_id: "quux", stamp: { sec: 1, nsec: 2 } },
    action: 0,
    pose: { position: { x: 0, y: 0, z: 0 }, orientation: { w: 1, x: 1, y: 1, z: 1 } },
    ...(color ? { color } : {}),
    type: MARKER_MSG_TYPES.LINE_STRIP,
  };
}

function lineList({ points, color }: {| points: Point[], color?: ?Color |}): LineListMarker {
  return {
    id: "foo",
    ns: "bar",
    scale: { x: 1.0, y: 1.0, z: 1.0 },
    points,
    header: { frame_id: "quux", stamp: { sec: 1, nsec: 2 } },
    action: 0,
    pose: { position: { x: 0, y: 0, z: 0 }, orientation: { w: 1, x: 1, y: 1, z: 1 } },
    ...(color ? { color } : {}),
    type: MARKER_MSG_TYPES.LINE_LIST,
  };
}

describe("groupLineStripsIntoInstancedLineLists", () => {
  // NOTE: Some created markers have more properties than they should -- both `pose` and `poses`,
  // both `color` and `colors`. This isn't problematic, but it's also not necessary. If these
  // properties disappear in some future change that's fine -- these test outputs just serve to
  // document the current output, not necessarily the ideal output.
  it("handles markers with open loops", () => {
    const markers = [
      lineStrip({
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        closed: false,
        color: COLORS.RED,
      }),
    ];
    expect(groupLinesIntoInstancedLineLists(markers)).toEqual([
      {
        action: 0,
        colors: [COLORS.RED, COLORS.RED],
        header: { frame_id: "quux", stamp: { nsec: 2, sec: 1 } },
        id: "ns:bar_type:4_scalex:1_scaley:1_scalez:1",
        metadataByIndex: [
          {
            header: { frame_id: "quux", stamp: { sec: 1, nsec: 2 } },
            action: 0,
            id: "foo",
            ns: "bar",
            type: MARKER_MSG_TYPES.LINE_STRIP,
            scale: { x: 1.0, y: 1.0, z: 1.0 },
            points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
            closed: false,
            color: COLORS.RED,
            pose: { position: { x: 0, y: 0, z: 0 }, orientation: { w: 1, x: 1, y: 1, z: 1 } },
          },
        ],
        ns: "bar",
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        pose: { orientation: { w: 1, x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } },
        poses: [{ orientation: { w: 1, x: 1, y: 1, z: 1 }, position: { x: 0, y: 0, z: 0 } }],
        scale: { x: 1, y: 1, z: 1 },
        type: MARKER_MSG_TYPES.INSTANCED_LINE_LIST,
        primitive: "lines",
      },
    ]);
  });

  it("handles markers with closed loops", () => {
    const markers = [
      lineStrip({
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        closed: true,
        color: COLORS.RED,
      }),
    ];
    expect(groupLinesIntoInstancedLineLists(markers)).toEqual([
      {
        action: 0,
        colors: [COLORS.RED, COLORS.RED, COLORS.RED, COLORS.RED],
        header: { frame_id: "quux", stamp: { nsec: 2, sec: 1 } },
        id: "ns:bar_type:4_scalex:1_scaley:1_scalez:1",
        metadataByIndex: [
          {
            header: { frame_id: "quux", stamp: { sec: 1, nsec: 2 } },
            action: 0,
            id: "foo",
            ns: "bar",
            type: MARKER_MSG_TYPES.LINE_STRIP,
            scale: { x: 1.0, y: 1.0, z: 1.0 },
            points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
            closed: true,
            color: COLORS.RED,
            pose: { position: { x: 0, y: 0, z: 0 }, orientation: { w: 1, x: 1, y: 1, z: 1 } },
          },
          {
            header: { frame_id: "quux", stamp: { sec: 1, nsec: 2 } },
            action: 0,
            id: "foo",
            ns: "bar",
            type: MARKER_MSG_TYPES.LINE_STRIP,
            scale: { x: 1.0, y: 1.0, z: 1.0 },
            points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
            closed: true,
            color: COLORS.RED,
            pose: { position: { x: 0, y: 0, z: 0 }, orientation: { w: 1, x: 1, y: 1, z: 1 } },
          },
        ],
        ns: "bar",
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }],
        pose: { orientation: { w: 1, x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } },
        poses: [
          { orientation: { w: 1, x: 1, y: 1, z: 1 }, position: { x: 0, y: 0, z: 0 } },
          { orientation: { w: 1, x: 1, y: 1, z: 1 }, position: { x: 0, y: 0, z: 0 } },
        ],
        scale: { x: 1, y: 1, z: 1 },
        type: MARKER_MSG_TYPES.INSTANCED_LINE_LIST,
        primitive: "lines",
      },
    ]);
  });

  it("handles markers without specified colors", () => {
    const markers = [
      lineStrip({
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        closed: false,
      }),
    ];
    expect(groupLinesIntoInstancedLineLists(markers)).toEqual([
      {
        action: 0,
        colors: [COLORS.WHITE, COLORS.WHITE],
        header: { frame_id: "quux", stamp: { nsec: 2, sec: 1 } },
        id: "ns:bar_type:4_scalex:1_scaley:1_scalez:1",
        metadataByIndex: [
          {
            header: { frame_id: "quux", stamp: { sec: 1, nsec: 2 } },
            action: 0,
            id: "foo",
            ns: "bar",
            type: MARKER_MSG_TYPES.LINE_STRIP,
            scale: { x: 1.0, y: 1.0, z: 1.0 },
            points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
            closed: false,
            pose: { position: { x: 0, y: 0, z: 0 }, orientation: { w: 1, x: 1, y: 1, z: 1 } },
          },
        ],
        ns: "bar",
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        pose: { orientation: { w: 1, x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } },
        poses: [{ orientation: { w: 1, x: 1, y: 1, z: 1 }, position: { x: 0, y: 0, z: 0 } }],
        scale: { x: 1, y: 1, z: 1 },
        type: MARKER_MSG_TYPES.INSTANCED_LINE_LIST,
        primitive: "lines",
      },
    ]);
  });

  it("handles line lists", () => {
    const markers = [
      lineList({
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        color: COLORS.RED,
      }),
    ];
    expect(groupLinesIntoInstancedLineLists(markers)).toEqual([
      {
        action: 0,
        colors: [COLORS.RED, COLORS.RED],
        header: { frame_id: "quux", stamp: { nsec: 2, sec: 1 } },
        id: "ns:bar_type:5_scalex:1_scaley:1_scalez:1",
        metadataByIndex: [
          {
            header: { frame_id: "quux", stamp: { sec: 1, nsec: 2 } },
            action: 0,
            id: "foo",
            ns: "bar",
            type: MARKER_MSG_TYPES.LINE_LIST,
            scale: { x: 1.0, y: 1.0, z: 1.0 },
            points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
            color: COLORS.RED,
            pose: { position: { x: 0, y: 0, z: 0 }, orientation: { w: 1, x: 1, y: 1, z: 1 } },
          },
        ],
        ns: "bar",
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        pose: { orientation: { w: 1, x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } },
        poses: [{ orientation: { w: 1, x: 1, y: 1, z: 1 }, position: { x: 0, y: 0, z: 0 } }],
        scale: { x: 1, y: 1, z: 1 },
        type: MARKER_MSG_TYPES.INSTANCED_LINE_LIST,
        primitive: "lines",
      },
    ]);
  });

  it("handles line strips and line lists", () => {
    const markers = [
      lineStrip({
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        closed: false,
        color: COLORS.RED,
      }),
      lineList({
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        color: COLORS.RED,
      }),
    ];
    expect(groupLinesIntoInstancedLineLists(markers)).toEqual([
      {
        action: 0,
        colors: [COLORS.RED, COLORS.RED],
        header: { frame_id: "quux", stamp: { nsec: 2, sec: 1 } },
        id: "ns:bar_type:4_scalex:1_scaley:1_scalez:1",
        metadataByIndex: [
          {
            header: { frame_id: "quux", stamp: { sec: 1, nsec: 2 } },
            action: 0,
            id: "foo",
            ns: "bar",
            type: MARKER_MSG_TYPES.LINE_STRIP,
            scale: { x: 1.0, y: 1.0, z: 1.0 },
            points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
            closed: false,
            color: COLORS.RED,
            pose: { position: { x: 0, y: 0, z: 0 }, orientation: { w: 1, x: 1, y: 1, z: 1 } },
          },
        ],
        ns: "bar",
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        pose: { orientation: { w: 1, x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } },
        poses: [{ orientation: { w: 1, x: 1, y: 1, z: 1 }, position: { x: 0, y: 0, z: 0 } }],
        scale: { x: 1, y: 1, z: 1 },
        type: MARKER_MSG_TYPES.INSTANCED_LINE_LIST,
        primitive: "lines",
      },
      {
        action: 0,
        colors: [COLORS.RED, COLORS.RED],
        header: { frame_id: "quux", stamp: { nsec: 2, sec: 1 } },
        id: "ns:bar_type:5_scalex:1_scaley:1_scalez:1",
        metadataByIndex: [
          {
            header: { frame_id: "quux", stamp: { sec: 1, nsec: 2 } },
            action: 0,
            id: "foo",
            ns: "bar",
            type: MARKER_MSG_TYPES.LINE_LIST,
            scale: { x: 1.0, y: 1.0, z: 1.0 },
            points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
            color: COLORS.RED,
            pose: { position: { x: 0, y: 0, z: 0 }, orientation: { w: 1, x: 1, y: 1, z: 1 } },
          },
        ],
        ns: "bar",
        points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        pose: { orientation: { w: 1, x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } },
        poses: [{ orientation: { w: 1, x: 1, y: 1, z: 1 }, position: { x: 0, y: 0, z: 0 } }],
        scale: { x: 1, y: 1, z: 1 },
        type: MARKER_MSG_TYPES.INSTANCED_LINE_LIST,
        primitive: "lines",
      },
    ]);
  });
});
