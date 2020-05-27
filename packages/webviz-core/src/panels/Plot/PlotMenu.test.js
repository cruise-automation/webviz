// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { cloneDeep, flatten } from "lodash";

import { getCSVData } from "./PlotMenu";
import { type TimeBasedChartTooltipData } from "webviz-core/src/components/TimeBasedChart";
import { type DataSet, getDatasetsAndTooltips } from "webviz-core/src/panels/Plot/PlotChart";

const getDatasetAndTooltipsParameters = [
  [
    {
      value: "/some_topic.ok",
      enabled: true,
      timestampMethod: "headerStamp",
    },
    {
      value: "",
      enabled: true,
      timestampMethod: "headerStamp",
    },
  ],
  {
    "/some_topic.ok": [
      {
        receiveTime: {
          sec: 1570207539,
          nsec: 81366108,
        },
        headerStamp: {
          sec: 1570207538,
          nsec: 950411000,
        },
        queriedData: [
          {
            value: true,
            path: "/some_topic.ok",
          },
        ],
      },
      {
        receiveTime: {
          sec: 1570207539,
          nsec: 178513840,
        },
        headerStamp: {
          sec: 1570207539,
          nsec: 50344000,
        },
        queriedData: [
          {
            value: true,
            path: "/some_topic.ok",
          },
        ],
      },
    ],
    "": [],
  },
  {
    sec: 1570207539,
    nsec: 138873,
  },
  "timestamp",
];
const { tooltips: trackedObjectsTooltips, datasets: trackedObjectsDatasets } = getDatasetsAndTooltips(
  ...getDatasetAndTooltipsParameters
);

const data = [
  {
    x: 0.010651803000000001,
    y: 0,
    tooltip: {
      x: 0.010651803000000001,
      y: 0,
      datasetKey: "default",
      constantName: "",
      item: {
        receiveTime: {
          sec: 1547062466,
          nsec: 10664222,
        },
        headerStamp: {
          sec: 1547062466,
          nsec: 9726015,
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
      x: 0.031882799,
      y: 0,
      datasetKey: "default",
      constantName: "",
      item: {
        receiveTime: {
          sec: 1547062466,
          nsec: 31895218,
        },
        headerStamp: {
          sec: 1547062466,
          nsec: 31719273,
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
    key: "default",
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
  const datasetKey = `dataset-${num}`;
  const numData = data.map((perData) => {
    const newData = cloneDeep(perData);
    newData.x = perData.x + num;
    newData.y = perData.y + num;
    if (newData.tooltip) {
      newData.tooltip.datasetKey = datasetKey;
    }
    return newData;
  });
  return {
    borderColor: "#4e98e2",
    label: `/topic${num}`,
    key: datasetKey,
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
  const datasetKey = `dataset-${num}`;
  const numData = data.map((perData) => {
    const newData = cloneDeep(perData);
    newData.x = perData.x + num;
    newData.y = perData.y + num;
    if (num === 3 && newData.tooltip) {
      delete newData.tooltip.item.headerStamp;
    }
    if (newData.tooltip) {
      newData.tooltip.datasetKey = datasetKey;
    }
    return newData;
  });
  return {
    borderColor: "#4e98e2",
    label: `/topic${num}`,
    key: datasetKey,
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
  const datasetKey = `dataset-${num}`;
  const numData = data.map((perData) => {
    const newData = cloneDeep(perData);
    newData.x = perData.x + num;
    newData.y = perData.y + num;
    if (newData.tooltip && newData.tooltip.item.headerStamp) {
      newData.tooltip.item.headerStamp.sec = perData.tooltip.item.headerStamp.sec + num;
      newData.tooltip.datasetKey = datasetKey;
    }
    return newData;
  });
  return {
    borderColor: "#4e98e2",
    label: `/topic${num}`,
    key: datasetKey,
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

function getTooltips(datasets: DataSet[]): TimeBasedChartTooltipData[] {
  return flatten(datasets.map((dataset) => dataset.data))
    .map(({ tooltip }) => tooltip)
    .filter(Boolean);
}

describe("PlotMenu", () => {
  it("Single topic", () => {
    expect(getCSVData(datasets_single_topic, getTooltips(datasets_single_topic))).toMatchSnapshot();
  });

  it("Multiple topics", () => {
    expect(getCSVData(datasets_multiple_topics, getTooltips(datasets_multiple_topics))).toMatchSnapshot();
  });

  it("Multiple topics with one topic don't have header.stamp", () => {
    expect(getCSVData(datasets_no_header, getTooltips(datasets_no_header))).toMatchSnapshot();
  });

  it("Multiple topics with different header.stamp", () => {
    expect(getCSVData(datasets_diff_timestamp, getTooltips(datasets_diff_timestamp))).toMatchSnapshot();
  });

  it("works with data directly from getDatasetsAndTooltips", () => {
    expect(getCSVData(trackedObjectsDatasets, trackedObjectsTooltips)).toMatchSnapshot();
  });
});
