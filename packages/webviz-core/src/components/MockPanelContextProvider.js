// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { type Node } from "react";

import PanelContext, { type PanelContextType } from "webviz-core/src/components/PanelContext";

type MockProps = $Rest<PanelContextType<any>, {}>;
const DEFAULT_MOCK_PANEL_CONTEXT: PanelContextType<any> = {
  type: "foo",
  id: "bar",
  title: "Foo Panel",
  config: {},
  saveConfig: () => {},
  updatePanelConfig: () => {},
  openSiblingPanel: () => {},
  enterFullscreen: () => {},
  isHovered: false,
  isFocused: false,
};
function MockPanelContextProvider({ children, ...rest }: { ...MockProps, children: Node }) {
  return (
    <PanelContext.Provider
      value={{
        ...DEFAULT_MOCK_PANEL_CONTEXT,
        ...rest,
      }}>
      {children}
    </PanelContext.Provider>
  );
}

export default MockPanelContextProvider;
