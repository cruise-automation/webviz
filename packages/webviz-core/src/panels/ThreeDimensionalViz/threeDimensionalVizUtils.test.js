// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { getNewCameraStateOnFollowChange, getUpdatedGlobalVariablesBySelectedObject } from "./threeDimensionalVizUtils";

describe("threeDimensionalVizUtils", () => {
  describe("getNewCameraStateOnFollowChange", () => {
    it("converts the camera state to use targetOffset instead of target when no longer following", () => {
      const prevFollowTf = "root";
      const prevFollowOrientation = undefined;
      const prevTargetPose = {
        target: [1322.127197265625, -1484.3931884765625, -20.19326400756836],
        targetOrientation: [-0.004656290448945672, 0.00933881579479869, 0.04371859882195202, 0.9989893841257927],
      };
      const prevCameraState = {
        perspective: false,
        target: [1322.127197265625, -1484.3931884765625, -20.19326400756836],
        distance: 75,
        phi: 0.7853981633974483,
        targetOffset: [0, 0, 0],
        targetOrientation: [0, 0, 0, 1],
        thetaOffset: 0,
      };

      const newCameraState = getNewCameraStateOnFollowChange({
        prevCameraState,
        prevTargetPose,
        prevFollowTf,
        prevFollowOrientation,
        newFollowTf: false,
        newFollowOrientation: undefined,
      });
      expect(newCameraState).toEqual({
        ...prevCameraState,
        target: [0, 0, 0],
        targetOffset: prevCameraState.target,
      });
    });
  });

  describe("getUpdatedGlobalVariablesBySelectedObject", () => {
    const linkedGlobalVariables = [
      {
        topic: "/foo/bar",
        markerKeyPath: ["name"],
        name: "linkedName",
      },
      {
        topic: "/bar/qux",
        markerKeyPath: ["age"],
        name: "linkedVarTwo",
      },
    ];

    it("returns object values", () => {
      const mouseEventObject = {
        object: {
          name: 123456,
          interactionData: {
            topic: "/foo/bar",
          },
        },
      };
      expect(getUpdatedGlobalVariablesBySelectedObject(mouseEventObject, linkedGlobalVariables)).toEqual({
        linkedName: 123456,
      });
    });

    it("returns values from instanced objects", () => {
      const mouseEventObject = {
        object: {
          interactionData: {
            topic: "/foo/bar",
          },
          metadataByIndex: [
            {
              name: 654321,
            },
          ],
        },
        instanceIndex: 0,
      };

      expect(getUpdatedGlobalVariablesBySelectedObject(mouseEventObject, linkedGlobalVariables)).toEqual({
        linkedName: 654321,
      });
    });
  });
});
