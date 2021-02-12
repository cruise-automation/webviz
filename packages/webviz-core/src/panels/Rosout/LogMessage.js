// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import _ from "lodash";
import React from "react";
import type { Time } from "rosbag";

import LevelToString from "./LevelToString";
import style from "./LogMessage.module.scss";
import { type Header } from "webviz-core/src/types/Messages";

// pad the start of `val` with 0's to make the total string length `count` size
function PadStart(val, count) {
  return _.padStart(`${val}`, count, "0");
}

function Stamp(props: { stamp: Time }) {
  const stamp = props.stamp;
  return (
    <span>
      {PadStart(stamp.sec, 10)}.{PadStart(stamp.nsec, 9)}
    </span>
  );
}

type Props = {|
  msg: { file: string, line: string, level: number, name: string, msg: string, header: Header },
|};

export default React.memo<Props>(function LogMessage({ msg }: Props) {
  const altStr = `${msg.file}:${msg.line}`;

  const strLevel = LevelToString(msg.level);

  const levelClassName = style[strLevel.toLocaleLowerCase()];

  // the first message line is rendered with the info/stamp/name
  // following newlines are rendered on their own line
  const lines = msg.msg.split("\n");
  return (
    <div title={altStr} className={`${style.container} ${levelClassName}`}>
      <div>
        <span>[{_.padStart(strLevel, 5, " ")}]</span>
        <span>
          [<Stamp stamp={msg.header.stamp} />]
        </span>
        <span>
          [{msg.name}
          ]:
        </span>
        <span>&nbsp;</span>
        <span>{lines[0]}</span>
      </div>
      {/* extra lines */}
      <div>
        {/* using array index as key is desired here since the index does not change */}
        {lines.slice(1).map((line, idx) => {
          return (
            <div key={idx}>
              &nbsp;&nbsp;&nbsp;&nbsp;
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
});
