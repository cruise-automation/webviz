// @flow
//
//  Copyright (c) 2021-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { logBatchedEventTotals } from "webviz-core/src/util/logBatchedEvents";
import { logEventAction, logEventPerformance, getEventTags, getEventInfos } from "webviz-core/src/util/logEvent";

jest.mock("webviz-core/src/util/logEvent", () => ({
  logEventAction: jest.fn(),
  logEventPerformance: jest.fn(),
  getEventTags: jest.fn().mockReturnValue({ TEST_TAG: "test tag", TEST_TAG2: "test tag 2", SIZE: "size" }),
  getEventInfos: jest.fn().mockReturnValue({
    TEST_EVENT: { testEventInfo: "testEventInfo" },
    TEST_EVENT2: { testEvent2Info: "testEvent2Info" },
  }),
}));

describe("logBatchedEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it("logBatchedEventTotals should log the correct number of calls", () => {
    // batch two different events and make sure the count lines up
    const mockEventInfo1 = getEventInfos().TEST_EVENT;
    const mockLogData1 = {
      [getEventTags().TEST_TAG]: "test tag data",
    };

    const mockEventInfo2 = getEventInfos().TEST_EVENT2;
    const mockLogData2 = {
      [getEventTags().TEST_TAG2]: "test tag 2 data",
    };

    logBatchedEventTotals("action", "TEST_EVENT", mockLogData1, { size: 2 });
    logBatchedEventTotals("action", "TEST_EVENT", mockLogData1, { size: 2 });

    logBatchedEventTotals("action", "TEST_EVENT2", mockLogData2, { size: 1 });

    jest.runAllTimers();

    expect(logEventAction).toHaveBeenCalledTimes(2);
    expect(logEventAction).toHaveBeenCalledWith(mockEventInfo1, { ...mockLogData1, size: 4 });
    expect(logEventAction).toHaveBeenCalledWith(mockEventInfo2, { ...mockLogData2, size: 1 });
  });

  it("logBatchedEventTotals should use unique calls for the same event with different data", () => {
    const mockEventInfo = getEventInfos().TEST_EVENT;

    const mockLogData1 = {
      [getEventTags().TEST_TAG]: "test tag data",
    };
    const mockLogData2 = {
      [getEventTags().TEST_TAG]: "different test tag data",
    };

    logBatchedEventTotals("action", "TEST_EVENT", mockLogData1, { size: 2 });
    logBatchedEventTotals("action", "TEST_EVENT", mockLogData1, { size: 2 });

    logBatchedEventTotals("action", "TEST_EVENT", mockLogData2, { size: 1 });

    jest.runAllTimers();

    expect(logEventAction).toHaveBeenCalledTimes(2);
    expect(logEventAction).toHaveBeenCalledWith(mockEventInfo, { ...mockLogData1, size: 4 });
    expect(logEventAction).toHaveBeenCalledWith(mockEventInfo, { ...mockLogData2, size: 1 });
  });

  it("logBatchedEventTotals should aggregate different properties correctly", () => {
    const mockEventInfo = getEventInfos().TEST_EVENT;

    const mockLogData1 = {
      [getEventTags().TEST_TAG]: "test tag data",
    };

    logBatchedEventTotals("action", "TEST_EVENT", mockLogData1, { size: 1 });
    logBatchedEventTotals("action", "TEST_EVENT", mockLogData1, { size: 1, sizeB: 1 });

    jest.runAllTimers();

    expect(logEventAction).toHaveBeenCalledTimes(1);
    expect(logEventAction).toHaveBeenCalledWith(mockEventInfo, { ...mockLogData1, size: 2, sizeB: 1 });
  });

  it("logBatchedEventTotals should not aggregate across event type", () => {
    const mockEventInfo = getEventInfos().TEST_EVENT;

    const mockLogData1 = {
      [getEventTags().TEST_TAG]: "test tag data",
    };

    logBatchedEventTotals("performance", "TEST_EVENT", mockLogData1, { size: 1 });
    logBatchedEventTotals("action", "TEST_EVENT", mockLogData1, { size: 1 });

    jest.runAllTimers();

    expect(logEventAction).toHaveBeenCalledTimes(1);
    expect(logEventAction).toHaveBeenCalledWith(mockEventInfo, { ...mockLogData1, size: 1 });
    expect(logEventPerformance).toHaveBeenCalledTimes(1);
    expect(logEventPerformance).toHaveBeenCalledWith(mockEventInfo, 0, { ...mockLogData1, size: 1 });
  });

  it("triggers on page unload", () => {
    const mockLogData1 = {
      [getEventTags().TEST_TAG]: "test tag data",
    };

    logBatchedEventTotals("action", "TEST_EVENT", mockLogData1, { size: 1 });
    logBatchedEventTotals("action", "TEST_EVENT", mockLogData1, { size: 1, sizeB: 1 });

    window.dispatchEvent(new Event("beforeunload"));

    expect(logEventAction).toHaveBeenCalledTimes(1);
  });
});
