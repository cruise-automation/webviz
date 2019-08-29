// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import type { Page } from "puppeteer";
import * as React from "react";
import { Worldview, type BaseProps, type CameraState } from "regl-worldview";

import type { IntegrationTest } from "./types";

declare var page: Page;

const defaultCameraState: CameraState = {
  distance: 75,
  perspective: true,
  phi: Math.PI / 2,
  target: [0, 0, 0],
  targetOffset: [0, 0, 0],
  targetOrientation: [0, 0, 0, 1],
  thetaOffset: Math.PI,
};

export const WORLDVIEW_SIZE = 300;

// This clicks as the origin (middle) point of the worldview canvas, assuming that you're using the WorldviewWrapper.
export async function clickAtOrigin() {
  await page.mouse.click(WORLDVIEW_SIZE / 2, WORLDVIEW_SIZE / 2);
}

// Provides a convenient wrapper for Worldview with a default camera state and size limitation.
export function WorldviewWrapper(props: BaseProps) {
  return (
    <div style={{ width: WORLDVIEW_SIZE, height: WORLDVIEW_SIZE }}>
      <Worldview defaultCameraState={defaultCameraState} {...props} />
    </div>
  );
}

/*
 * Generate click tests for non-instanced commands, or commands with just one instance.
 *
 * Takes a command name, instance, and rendered objects.
 * The first object should be at the origin, and the second object should be behind it in the -y direction.
 * The rendered objects should not have multiple instances.
 */
export function generateNonInstancedClickTests<Type>(
  commandName: string,
  CommandInstance: React.ComponentType<{ children: Array<Type> }>,
  renderedObjects: Array<Type>,
  overrideOptions?: {
    overrideExpectedSingleObjects?: any,
    overrideExpectedMultipleObjects?: any,
  }
): Array<IntegrationTest> {
  const options = overrideOptions || {};
  return [
    {
      name: `Clicks on a single ${commandName} - worldview event handler`,
      story: (setTestData) => (
        <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
          <CommandInstance>{renderedObjects}</CommandInstance>
        </WorldviewWrapper>
      ),
      test: async (getTestData) => {
        await clickAtOrigin();
        const result = await getTestData();
        expect(result).toEqual(
          options.overrideExpectedSingleObjects
            ? options.overrideExpectedSingleObjects
            : [{ object: renderedObjects[0] }]
        );
      },
    },
    {
      name: `Clicks on a single ${commandName} - object event handler`,
      story: (setTestData) => (
        <WorldviewWrapper>
          <CommandInstance onClick={(_, { objects }) => setTestData(objects)}>{renderedObjects}</CommandInstance>
        </WorldviewWrapper>
      ),
      test: async (getTestData) => {
        await clickAtOrigin();
        const result = await getTestData();
        expect(result).toEqual(
          options.overrideExpectedSingleObjects
            ? options.overrideExpectedSingleObjects
            : [{ object: renderedObjects[0] }]
        );
      },
    },
    {
      name: `Clicks on multiple ${commandName}s - worldview event handler`,
      story: (setTestData) => (
        <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)} enableStackedObjectEvents>
          <CommandInstance>{renderedObjects}</CommandInstance>
        </WorldviewWrapper>
      ),
      test: async (getTestData) => {
        await clickAtOrigin();
        const result = await getTestData();
        expect(result).toEqual(
          options.overrideExpectedMultipleObjects
            ? options.overrideExpectedMultipleObjects
            : [{ object: renderedObjects[0] }, { object: renderedObjects[1] }]
        );
      },
    },
    {
      name: `Clicks on multiple ${commandName}s - object event handler`,
      story: (setTestData) => (
        <WorldviewWrapper enableStackedObjectEvents>
          <CommandInstance onClick={(_, { objects }) => setTestData(objects)}>{renderedObjects}</CommandInstance>
        </WorldviewWrapper>
      ),
      test: async (getTestData) => {
        await clickAtOrigin();
        const result = await getTestData();
        expect(result).toEqual(
          options.overrideExpectedMultipleObjects
            ? options.overrideExpectedMultipleObjects
            : [{ object: renderedObjects[0] }, { object: renderedObjects[1] }]
        );
      },
    },
  ];
}

/*
 * Generate click tests for instanced commands.
 *
 * Takes a command name, instance, and rendered objects.
 * The renderd object should have two instances: one at the origin, and the second just behind it in the -y direction.
 */
export function generateInstancedClickTests<Type>(
  commandName: string,
  CommandInstance: React.ComponentType<{ children: Array<Type> }>,
  renderedObject: Type
): Array<IntegrationTest> {
  return [
    {
      name: `Clicks on an instanced ${commandName} - worldview event handler`,
      story: (setTestData) => (
        <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)}>
          <CommandInstance>{[renderedObject]}</CommandInstance>
        </WorldviewWrapper>
      ),
      test: async (getTestData) => {
        await clickAtOrigin();
        const result = await getTestData();
        expect(result).toEqual([{ object: renderedObject, instanceIndex: 0 }]);
      },
    },
    {
      name: `Clicks on an instanced ${commandName} - object event handler`,
      story: (setTestData) => (
        <WorldviewWrapper>
          <CommandInstance onClick={(_, { objects }) => setTestData(objects)}>{[renderedObject]}</CommandInstance>
        </WorldviewWrapper>
      ),
      test: async (getTestData) => {
        await clickAtOrigin();
        const result = await getTestData();
        expect(result).toEqual([{ object: renderedObject, instanceIndex: 0 }]);
      },
    },
    {
      name: `Clicks on an instanced ${commandName} with multiple instances clicked - worldview event handler`,
      story: (setTestData) => (
        <WorldviewWrapper onClick={(_, { objects }) => setTestData(objects)} enableStackedObjectEvents>
          <CommandInstance>{[renderedObject]}</CommandInstance>
        </WorldviewWrapper>
      ),
      test: async (getTestData) => {
        await clickAtOrigin();
        const result = await getTestData();
        expect(result).toEqual([
          { object: renderedObject, instanceIndex: 0 },
          { object: renderedObject, instanceIndex: 1 },
        ]);
      },
    },
    {
      name: `Clicks on an instanced ${commandName} with multiple instances clicked - object event handler`,
      story: (setTestData) => (
        <WorldviewWrapper enableStackedObjectEvents>
          <CommandInstance onClick={(_, { objects }) => setTestData(objects)}>{[renderedObject]}</CommandInstance>
        </WorldviewWrapper>
      ),
      test: async (getTestData) => {
        await clickAtOrigin();
        const result = await getTestData();
        expect(result).toEqual([
          { object: renderedObject, instanceIndex: 0 },
          { object: renderedObject, instanceIndex: 1 },
        ]);
      },
    },
  ];
}
