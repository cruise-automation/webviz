// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useEffect } from "react";

// A small React hook to fire the cleanup callback when the component unmounts.
export default function useCleanup(teardown: () => void): void {
  useEffect(() => {
    return () => {
      teardown();
    };
  }, []);
}
