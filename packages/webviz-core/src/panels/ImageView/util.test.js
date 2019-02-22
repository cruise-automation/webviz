// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getCameraInfoTopic, getMarkerOptions, getMarkerTopics, groupTopics } from "./util";

describe("ImageView", () => {
  describe("getCameraInfoTopic", () => {
    it("keeps prefix", () => {
      expect(getCameraInfoTopic("/some_camera_topic/image_rect_color")).toBe("/some_camera_topic/camera_info");
      expect(getCameraInfoTopic("/other_camera_topic/image_rect_color")).toBe("/other_camera_topic/camera_info");
    });
    it("isn't restricted to rectified images", () => {
      expect(getCameraInfoTopic("/some_camera_topic/something_else")).toBe("/some_camera_topic/camera_info");
      expect(getCameraInfoTopic("/other_camera_topic/something_else")).toBe("/other_camera_topic/camera_info");
    });
  });

  describe("getMarkerOptions", () => {
    const allMarkerTopics = [
      "/some_camera_topic/marker1",
      "/some_camera_topic/marker2",
      "/camera_rear_medium/marker3", // not included because it's for a different camera
      "/unknown_camera/marker4",
    ];
    const allCameraNamespaces = ["/some_camera_topic", "/camera_rear_medium"];
    it("filters topics relevant to this camera", () => {
      expect(getMarkerOptions("/some_camera_topic/image_rect_color", allMarkerTopics, allCameraNamespaces)).toEqual([
        { name: "marker1", topic: "/some_camera_topic/marker1" },
        { name: "marker2", topic: "/some_camera_topic/marker2" },
        { name: "/unknown_camera/marker4", topic: "/unknown_camera/marker4" },
      ]);
    });
  });

  describe("getMarkerTopics", () => {
    it("adds camera prefix to relative marker names", () => {
      expect(
        getMarkerTopics("/some_camera_topic/some_image_type", ["marker1", "marker2", "/unknown_camera/marker4"])
      ).toEqual(["/some_camera_topic/marker1", "/some_camera_topic/marker2", "/unknown_camera/marker4"]);
    });
  });

  describe("groupTopics", () => {
    const topic = (name) => ({ name, datatype: "dummy" });

    it("groups by camera name", () => {
      expect(
        groupTopics([topic("/camera_1/foo"), topic("/camera_2/foo"), topic("/camera_1/bar"), topic("/weird_topic")])
      ).toEqual(
        new Map([
          ["/camera_1", [topic("/camera_1/foo"), topic("/camera_1/bar")]],
          ["/camera_2", [topic("/camera_2/foo")]],
          ["", [topic("/weird_topic")]],
        ])
      );
    });

    it("puts /old topics under the correct camera", () => {
      expect(
        groupTopics([
          topic("/camera_1/foo"),
          topic("/old/camera_2/foo"),
          topic("/old/camera_1/bar"),
          topic("/old/weird_topic"),
        ])
      ).toEqual(
        new Map([
          ["/camera_1", [topic("/camera_1/foo"), topic("/old/camera_1/bar")]],
          ["/camera_2", [topic("/old/camera_2/foo")]],
          ["", [topic("/old/weird_topic")]],
        ])
      );
    });
  });
});
