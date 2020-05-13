// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { createMemoryHistory } from "history";

import { setUserNodeTrust, addUserNodeLogs, setUserNodeDiagnostics } from "webviz-core/src/actions/userNodes";
import { DiagnosticSeverity, Sources } from "webviz-core/src/players/UserNodePlayer/types";
import createRootReducer from "webviz-core/src/reducers";
import configureStore from "webviz-core/src/store/configureStore.testing";

const getStore = () => configureStore(createRootReducer(createMemoryHistory()));

describe("state.userNodes", () => {
  describe("trusted", () => {
    it("flags nodes as trusted", () => {
      const store = getStore();
      const id = "mock_id";
      store.dispatch(setUserNodeTrust({ id, trusted: true }));
      expect(store.getState().userNodes.userNodeDiagnostics).toEqual({
        [id]: { trusted: true, diagnostics: [], logs: [] },
      });
    });
    it("does not overwrite any diagnostics or logs", () => {
      const store = getStore();
      const id = "mock_id";
      const logs = [{ source: "registerNode", value: "hello" }];
      const diagnostics = [
        {
          severity: DiagnosticSeverity.Warning,
          source: Sources.Typescript,
          message: "",
          code: 0,
        },
      ];
      store.dispatch(addUserNodeLogs({ [id]: { logs } }));
      store.dispatch(setUserNodeDiagnostics({ [id]: { diagnostics } }));
      store.dispatch(setUserNodeTrust({ id, trusted: false }));
      expect(store.getState().userNodes.userNodeDiagnostics).toEqual({ [id]: { diagnostics, logs, trusted: false } });
    });
  });
});
