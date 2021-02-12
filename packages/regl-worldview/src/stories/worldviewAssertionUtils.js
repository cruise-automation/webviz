// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import expect from "expect";
import React, { type ComponentType } from "react";

import type { CommonCommandProps } from "../commands/Command";
import type { CameraState } from "../types";
import Worldview, { type Props } from "../Worldview";
import { assertionTest, timeout } from "stories/assertionTestUtils";

export const defaultCameraState: $Shape<CameraState> = {
  distance: 75,
  perspective: true,
  phi: Math.PI / 2,
  target: [0, 0, 0],
  targetOffset: [0, 0, 0],
  targetOrientation: [0, 0, 0, 1],
  thetaOffset: Math.PI,
};

export const WORLDVIEW_SIZE = 300;

// Provides a convenient wrapper for Worldview with a default camera state and size limitation.
export function WorldviewWrapper(props: Props) {
  return (
    <div style={{ width: WORLDVIEW_SIZE, height: WORLDVIEW_SIZE }}>
      <Worldview defaultCameraState={defaultCameraState} {...props} />
    </div>
  );
}

export async function clickAtOrigin() {
  const [element] = document.getElementsByTagName("canvas");
  if (!element) {
    throw new Error("Could not find canvas element");
  }
  const mouseDownEvent = new MouseEvent("mousedown", {
    bubbles: true,
    clientX: WORLDVIEW_SIZE / 2,
    clientY: WORLDVIEW_SIZE / 2,
  });
  element.dispatchEvent(mouseDownEvent);
  const mouseUpEvent = new MouseEvent("mouseup", {
    bubbles: true,
    clientX: WORLDVIEW_SIZE / 2,
    clientY: WORLDVIEW_SIZE / 2,
  });
  element.dispatchEvent(mouseUpEvent);
  await timeout(100);
}

/*
 * Generate click assertions for non-instanced commands, or commands with just one instance.
 *
 * Takes a command name, instance, and rendered objects.
 * The first object should be at the origin, and the second object should be behind it in the -y direction.
 * The rendered objects should not have multiple instances.
 */
export function generateNonInstancedClickAssertions<Type>(
  commandName: string,
  CommandInstance: ComponentType<{ ...CommonCommandProps, children: Array<Type> }>,
  renderedObjects: Array<Type>,
  overrideOptions?: {
    overrideExpectedSingleObjects?: any,
    overrideExpectedMultipleObjects?: any,
  }
): Array<{ name: string, story: () => React$Element<any> }> {
  const options = overrideOptions || {};
  return [
    {
      name: `Clicks on a single ${commandName} - worldview event handler`,
      story: assertionTest({
        story: (setTestData) => (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
            <CommandInstance>{renderedObjects}</CommandInstance>
          </WorldviewWrapper>
        ),
        assertions: async (getTestData) => {
          await clickAtOrigin();
          const result = getTestData();
          expect(result).toEqual(
            options.overrideExpectedSingleObjects
              ? options.overrideExpectedSingleObjects
              : [{ object: renderedObjects[0], instanceIndex: undefined }]
          );
        },
      }),
    },
    {
      name: `Clicks on a single ${commandName} - object event handler`,
      story: assertionTest({
        story: (setTestData) => (
          <WorldviewWrapper>
            <CommandInstance onClick={(_, { objects }) => setTestData(objects)}>{renderedObjects}</CommandInstance>
          </WorldviewWrapper>
        ),
        assertions: async (getTestData) => {
          await clickAtOrigin();
          const result = getTestData();
          expect(result).toEqual(
            options.overrideExpectedSingleObjects
              ? options.overrideExpectedSingleObjects
              : [{ object: renderedObjects[0], instanceIndex: undefined }]
          );
        },
      }),
    },
    {
      name: `Clicks on multiple ${commandName}s - worldview event handler`,
      story: assertionTest({
        story: (setTestData) => (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)} enableStackedObjectEvents>
            <CommandInstance>{renderedObjects}</CommandInstance>
          </WorldviewWrapper>
        ),
        assertions: async (getTestData) => {
          await clickAtOrigin();
          const result = getTestData();
          expect(result).toEqual(
            options.overrideExpectedMultipleObjects
              ? options.overrideExpectedMultipleObjects
              : [
                  { object: renderedObjects[0], instanceIndex: undefined },
                  { object: renderedObjects[1], instanceIndex: undefined },
                ]
          );
        },
      }),
    },
    {
      name: `Clicks on multiple ${commandName}s - object event handler`,
      story: assertionTest({
        story: (setTestData) => (
          <WorldviewWrapper enableStackedObjectEvents>
            <CommandInstance onClick={(_, { objects }) => setTestData(objects)}>{renderedObjects}</CommandInstance>
          </WorldviewWrapper>
        ),
        assertions: async (getTestData) => {
          await clickAtOrigin();
          const result = getTestData();
          expect(result).toEqual(
            options.overrideExpectedMultipleObjects
              ? options.overrideExpectedMultipleObjects
              : [
                  { object: renderedObjects[0], instanceIndex: undefined },
                  { object: renderedObjects[1], instanceIndex: undefined },
                ]
          );
        },
      }),
    },
  ];
}

/*
 * Generate click assertions for instanced commands.
 *
 * Takes a command name, instance, and rendered objects.
 * The rendered object should have two instances: one at the origin, and the second just behind it in the -y direction.
 */
export function generateInstancedClickAssertions<Type>(
  commandName: string,
  CommandInstance: ComponentType<{ ...CommonCommandProps, children: Array<Type> }>,
  renderedObject: Type
): Array<{ name: string, story: () => React$Element<any> }> {
  return [
    {
      name: `Clicks on an instanced ${commandName} - worldview event handler`,
      story: assertionTest({
        story: (setTestData) => (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
            <CommandInstance>{[renderedObject]}</CommandInstance>
          </WorldviewWrapper>
        ),
        assertions: async (getTestData) => {
          await clickAtOrigin();
          const result = getTestData();
          expect(result).toEqual([{ object: renderedObject, instanceIndex: 0 }]);
        },
      }),
    },
    {
      name: `Clicks on an instanced ${commandName} - object event handler`,
      story: assertionTest({
        story: (setTestData) => (
          <WorldviewWrapper>
            <CommandInstance onClick={(_, { objects }) => setTestData(objects)}>{[renderedObject]}</CommandInstance>
          </WorldviewWrapper>
        ),
        assertions: async (getTestData) => {
          await clickAtOrigin();
          const result = getTestData();
          expect(result).toEqual([{ object: renderedObject, instanceIndex: 0 }]);
        },
      }),
    },
    {
      name: `Clicks on an instanced ${commandName} with multiple instances clicked - worldview event handler`,
      story: assertionTest({
        story: (setTestData) => (
          <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)} enableStackedObjectEvents>
            <CommandInstance>{[renderedObject]}</CommandInstance>
          </WorldviewWrapper>
        ),
        assertions: async (getTestData) => {
          await clickAtOrigin();
          const result = getTestData();
          expect(result).toEqual([
            { object: renderedObject, instanceIndex: 0 },
            { object: renderedObject, instanceIndex: 1 },
          ]);
        },
      }),
    },
    {
      name: `Clicks on an instanced ${commandName} with multiple instances clicked - object event handler`,
      story: assertionTest({
        story: (setTestData) => (
          <WorldviewWrapper enableStackedObjectEvents>
            <CommandInstance onClick={(_, { objects }) => setTestData(objects)}>{[renderedObject]}</CommandInstance>
          </WorldviewWrapper>
        ),
        assertions: async (getTestData) => {
          await clickAtOrigin();
          const result = getTestData();
          expect(result).toEqual([
            { object: renderedObject, instanceIndex: 0 },
            { object: renderedObject, instanceIndex: 1 },
          ]);
        },
      }),
    },
  ];
}
