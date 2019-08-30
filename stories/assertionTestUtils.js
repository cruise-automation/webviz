// @flow

//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/* eslint-disable react/display-name */

import isEqual from "lodash/isEqual";
import React, { useLayoutEffect, useState } from "react";

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
        await assertions(getTestData);
      };
      let errorCallback;
      let consoleErrorCallback;
      const errorPromise = new Promise((resolve, reject) => {
        errorCallback = (event) => reject(event);
        window.addEventListener("error", errorCallback);
      });
      const consoleErrorPromise = new Promise((resolve, reject) => {
        consoleErrorCallback = (...data) => reject(data);
        addConsoleErrorListener(consoleErrorCallback);
      });
      const resultPromise = Promise.race([assertionPromise(), errorPromise, consoleErrorPromise])
        .catch((err) => setError(err))
        .then(() => {
          window.removeEventListener("error", errorCallback);
          removeConsoleErrorListener(consoleErrorCallback);
        });
      window.waitFor = () => resultPromise;
    }, []);

    if (error) {
      console.error(error);
    }
    return error ? (
      <div>
        {error.message}
        <br />
        {error.stack}
      </div>
    ) : (
      story(setTestData)
    );
  }
  return () => <Component />;
}

type Expectations = {|
  toEqual: (any) => void,
|};

export function expect(obj: any): Expectations {
  return {
    toEqual: (compareObj) => {
      if (obj !== compareObj && !isEqual(obj, compareObj)) {
        throw new Error(
          `isEqual failed: \noriginal: ${JSON.stringify(obj)}\ncomparison: ${JSON.stringify(compareObj)}`
        );
      }
    },
  };
}
