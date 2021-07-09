// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Reconciler from "react-reconciler";

const NO_CONTEXT = {};

const hostConfig = {
  getRootHostContext() {
    return NO_CONTEXT;
  },
  getChildHostContext() {
    return NO_CONTEXT;
  },
  getPublicInstance(instance) {
    return instance;
  },
  createInstance() {
    return {};
  },
  appendInitialChild() {},
  finalizeInitialChildren() {
    return false;
  },
  prepareUpdate() {},
  shouldSetTextContent() {
    return false;
  },
  createTextInstance() {
    return {};
  },
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  prepareForCommit() {
    // Must return null here: https://github.com/facebook/react/tree/master/packages/react-reconciler#prepareforcommitcontainerinfo
    return null;
  },
  resetAfterCommit() {},
  now: Date.now,
  isPrimaryRenderer: false, // ???

  warnsIfNotActing: true, // not important?
  supportsMutation: true,
  supportsPersistence: false,

  // Mutation things?
  commitMount() {},
  commitUpdate() {},
  commitTextUpdate() {},
  appendChild() {},
  appendChildToContainer() {},
  insertBefore() {},
  insertInContainerBefore() {},
  removeChild() {},
  removeChildFromContainer() {},
  clearContainer() {},
  hideInstance() {},
  hideTextInstance() {},
  unhideInstance() {},
  unhideTextInstance() {},
  resetTextContent() {},
};

const reconcilerInstance = Reconciler(hostConfig);

// This reconciler is used by web workers that need to take advance of React hooks
// and other mechanisms without actually rendering to the DOM (such as when rendering
// 3D objects in the 3D Panel). HTML elements and events have no effect at all.
const render = (element: any, parentObject: any) => {
  // element: This is the react element for App component
  // parentObject: This is the host root element to which the rendered app will be attached.
  // callback: if specified will be called after render is done.

  const isAsync = true;
  const container = reconcilerInstance.createContainer(parentObject, isAsync); // Creates root fiber node.

  const parentComponent = null; // Since there is no parent (since this is the root fiber). We set parentComponent to null.
  reconcilerInstance.updateContainer(element, container, parentComponent);
};

export default render;
