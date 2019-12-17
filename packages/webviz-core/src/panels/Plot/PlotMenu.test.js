// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { cloneDeep } from "lodash";

import { getCSVData, getHeader } from "./PlotMenu";

const data = [
  {
    x: 0.010651803000000001,
    y: 0,
    tooltip: {
      constantName: "",
      item: {
        message: {
          op: "message",
          topic: "/accel_vector_calibrated",
          datatype: "imu_messages/IMUSensor",
          receiveTime: {
            sec: 1547062466,
            nsec: 10664222,
          },
          message: {
            header: {
              seq: 475838,
              stamp: {
                sec: 1547062466,
                nsec: 9726015,
              },
              frame_id: "",
            },
            using_gps_time: false,
            vector: {
              x: -1.6502913414892997,
              y: 0.013979224999911806,
              z: 9.956832079451333,
            },
          },
        },
        queriedData: [
          {
            constantName: "",
            value: false,
            path: "/accel_vector_calibrated.using_gps_time",
          },
        ],
      },
      path: "/accel_vector_calibrated.using_gps_time",
      value: false,
      startTime: {
        sec: 1547062466,
        nsec: 12419,
      },
    },
  },
  {
    x: 0.031882799,
    y: 0,
    tooltip: {
      constantName: "",
      item: {
        message: {
          op: "message",
          topic: "/accel_vector_calibrated",
          datatype: "imu_messages/IMUSensor",
          receiveTime: {
            sec: 1547062466,
            nsec: 31895218,
          },
          message: {
            header: {
              seq: 475839,
              stamp: {
                sec: 1547062466,
                nsec: 31719273,
              },
              frame_id: "",
            },
            using_gps_time: false,
            vector: {
              x: -1.6793369565819012,
              y: 0.04327456632615036,
              z: 10.0864057092908,
            },
          },
        },
        queriedData: [
          {
            constantName: "",
            value: false,
            path: "/accel_vector_calibrated.using_gps_time",
          },
        ],
      },
      path: "/accel_vector_calibrated.using_gps_time",
      value: false,
      startTime: {
        sec: 1547062466,
        nsec: 12419,
      },
    },
  },
];

const datasets_single_topic = [
  {
    borderColor: "#4e98e2",
    label: "/accel_vector_calibrated.using_gps_time",
    key: "0",
    showLine: true,
    fill: false,
    borderWidth: 1,
    pointRadius: 1.5,
    pointHoverRadius: 3,
    pointBackgroundColor: "#74beff",
    pointBorderColor: "transparent",
    data,
  },
];

const datasets_multiple_topics = [1, 2, 3].map((num) => {
  const numData = data.map((perData) => {
    const newData = cloneDeep(perData);
    newData.x = perData.x + num;
    newData.y = perData.y + num;
    return newData;
  });
  return {
    borderColor: "#4e98e2",
    label: `/topic${num}`,
    key: "0",
    showLine: true,
    fill: false,
    borderWidth: 1,
    pointRadius: 1.5,
    pointHoverRadius: 3,
    pointBackgroundColor: "#74beff",
    pointBorderColor: "transparent",
    data: numData,
  };
});

const datasets_no_header = [1, 2, 3].map((num) => {
  const numData = data.map((perData) => {
    const newData = cloneDeep(perData);
    newData.x = perData.x + num;
    newData.y = perData.y + num;
    if (num === 3) {
      delete newData.tooltip.item.message.message.header;
    }
    return newData;
  });
  return {
    borderColor: "#4e98e2",
    label: `/topic${num}`,
    key: "0",
    showLine: true,
    fill: false,
    borderWidth: 1,
    pointRadius: 1.5,
    pointHoverRadius: 3,
    pointBackgroundColor: "#74beff",
    pointBorderColor: "transparent",
    data: numData,
  };
});

const datasets_diff_timestamp = [1, 2, 3].map((num) => {
  const numData = data.map((perData) => {
    const newData = cloneDeep(perData);
    newData.x = perData.x + num;
    newData.y = perData.y + num;
    newData.tooltip.item.message.message.header.stamp.sec = perData.tooltip.item.message.message.header.stamp.sec + num;
    return newData;
  });
  return {
    borderColor: "#4e98e2",
    label: `/topic${num}`,
    key: "0",
    showLine: true,
    fill: false,
    borderWidth: 1,
    pointRadius: 1.5,
    pointHoverRadius: 3,
    pointBackgroundColor: "#74beff",
    pointBorderColor: "transparent",
    data: numData,
  };
});

describe("PlotMenu", () => {
  it("Single topic", () => {
    expect(getCSVData(datasets_single_topic)).toMatchSnapshot();
  });

  it("Multiple topics", () => {
    expect(getCSVData(datasets_multiple_topics)).toMatchSnapshot();
  });

  it("Multiple topics with one topic don't have header.stamp", () => {
    expect(getCSVData(datasets_no_header)).toMatchSnapshot();
  });

  it("Multiple topics with different header.stamp", () => {
    expect(getCSVData(datasets_diff_timestamp)).toMatchSnapshot();
  });

  it("get right header", () => {
    const message = {
      whatever_header: {
        sec: 123,
        nsec: 456,
      },
    };
    expect(getHeader(message)).toEqual({ sec: 123, nsec: 456 });
  });
});
