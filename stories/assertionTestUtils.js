// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import diffLinesUnified from "jest-diff";
import React, { useLayoutEffect, useState } from "react";
import stripAnsi from "strip-ansi";

import { addConsoleErrorListener, removeConsoleErrorListener } from "./wrapConsoleError";

export async function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Story = (setTestData: (any) => void) => React$Element<any>;
type Assertion = (getTestData: () => any) => Promise<void>;
type AssertionTest = {|
  story: Story,
  assertions: Assertion,
|};

/*
 * This function takes a storybook story and some assertions about it and runs those assertions in the browser as the
 * storybook test is running. It enables treating our storybook stories as tests.
 *
 * This function has an integration with the storybook-chrome-screenshot package that we use to generate screenshots:
 * it adds a `window.waitFor` function that returns a promise that only resolves once the assertions have run.
 *
 * Usage:
 * storiesOf("SomeModule", module).add(
 *   "Some test",
 *   assertionTest({
 *     story: (setTestData) => { .. },
 *     assertions: async (getTestData) => { ... },
 *   })
 * );
 */
export function assertionTest({ story, assertions }: AssertionTest): () => React$Element<any> {
  let testData: any = null;
  function setTestData(data: any) {
    // Set the testData on window for debugging purposes.
    const windowObject = window.parent ? window.parent : window;
    // eslint-disable-next-line no-console
    console.log("Set the following test data. See window.testData to access it.", data);
    windowObject.testData = data;
    testData = data;
  }
  function getTestData(): any {
    return testData;
  }

  function Component() {
    const [error, setError] = useState<any>();
    useLayoutEffect(() => {
      const assertionPromise = async () => {
        await timeout(100);
        try {
          await assertions(getTestData);
        } catch (error) {
          console.warn(error);
          throw error;
        }
      };

      let errorCallback;
      let consoleErrorCallback;
      const errorPromise = new Promise((resolve, reject) => {
        errorCallback = (event) => {
          console.warn(error);
          reject(event);
        };
        window.addEventListener("error", errorCallback);
      });
      const consoleErrorPromise = new Promise((resolve, reject) => {
        consoleErrorCallback = (...data) => reject(new Error(data));
        addConsoleErrorListener(consoleErrorCallback);
      });
      const resultPromise = Promise.race([assertionPromise(), errorPromise, consoleErrorPromise])
        .catch((err) => setError(err))
        .then(() => {
          window.removeEventListener("error", errorCallback);
          removeConsoleErrorListener(consoleErrorCallback);
          // eslint-disable-next-line no-console
          console.log("TEST FINISHED");
        });
      window.waitFor = () => resultPromise;
    }, []);

    return error ? (
      <div style={{ height: "100%", width: "100%", overflow: "scroll" }}>
        <pre>{error.stack}</pre>
      </div>
    ) : (
      story(setTestData)
    );
  }
  return () => <Component />;
}

type Expectations = {|
  toEqual: (any) => void,
  toBeCloseTo: (number, ?number) => void,
|};

// A custom expect tool, used to replace jest matchers that we don't have access to in the browser.
export function expect(obj: any): Expectations {
  return {
    toEqual: (compareObj) => {
      const diff = diffLinesUnified(obj, compareObj);
      if (stripAnsi(diff).trim() !== "Compared values have no visual difference.") {
        throw new Error(diff);
      }
    },
    toBeCloseTo: (compareNumber, digits) => {
      if (typeof compareNumber !== "number") {
        throw new Error("toBeCloseTo takes a number as an argument.");
      }
      if (typeof obj !== "number") {
        throw new Error("Expect should be passed a number.");
      }
      const numDigits = digits || 2;
      const allowedDifference = 10 ** -numDigits / numDigits;
      if (compareNumber - allowedDifference > obj || compareNumber + allowedDifference < obj) {
        throw new Error(`toBeCloseTo: expected ${obj}, got ${compareNumber}`);
      }
    },
  };
}