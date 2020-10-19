// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { flatten } from "lodash";

import { getCSVData } from "./PlotMenu";
import { getDatasetsAndTooltips } from "webviz-core/src/panels/Plot/PlotChart";

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
      [
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

const tooltips = [
  {
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
  {
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
];
const data = tooltips.map(({ x, y }) => ({ x, y }));

const datasetsSingleTopic = [
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

const datasetsMultipleTopics = [1, 2, 3].map((num) => ({
  borderColor: "#4e98e2",
  label: `/topic${num}`,
  key: `dataset-${num}`,
  showLine: true,
  fill: false,
  borderWidth: 1,
  pointRadius: 1.5,
  pointHoverRadius: 3,
  pointBackgroundColor: "#74beff",
  pointBorderColor: "transparent",
  data: data.map(({ x, y }) => ({ x: x + num, y: y + num })),
}));

const tooltipsMultipleTopics = flatten(
  [1, 2, 3].map((num) =>
    tooltips.map((tooltip) => ({
      ...tooltip,
      datasetKey: `dataset-${num}`,
    }))
  )
);

const tooltipsNoHeader = flatten(
  [1, 2, 3].map((num) =>
    tooltips.map((tooltip) => ({
      ...tooltip,
      datasetKey: `dataset-${num}`,
      item: {
        ...tooltip.item,
        headerStamp: num === 3 ? undefined : tooltip.item.headerStamp,
      },
    }))
  )
);

const tooltipsDiffTimestamp = flatten(
  [1, 2, 3].map((num) =>
    tooltips.map((tooltip) => ({
      ...tooltip,
      datasetKey: `dataset-${num}`,
      item: {
        ...tooltip.item,
        headerStamp: tooltip.item.headerStamp && {
          ...tooltip.item.headerStamp,
          sec: tooltip.item.headerStamp.sec + num,
        },
      },
    }))
  )
);

describe("PlotMenu", () => {
  it("Single topic", () => {
    expect(getCSVData(datasetsSingleTopic, tooltips, "timestamp")).toMatchSnapshot();
  });

  it("Multiple topics", () => {
    expect(getCSVData(datasetsMultipleTopics, tooltipsMultipleTopics, "timestamp")).toMatchSnapshot();
  });

  it("Multiple topics with one topic don't have header.stamp", () => {
    expect(getCSVData(datasetsMultipleTopics, tooltipsNoHeader, "timestamp")).toMatchSnapshot();
  });

  it("Multiple topics with different header.stamp", () => {
    expect(getCSVData(datasetsMultipleTopics, tooltipsDiffTimestamp, "timestamp")).toMatchSnapshot();
  });

  it("works with data directly from getDatasetsAndTooltips", () => {
    expect(getCSVData(trackedObjectsDatasets, trackedObjectsTooltips, "timestamp")).toMatchSnapshot();
  });
});
