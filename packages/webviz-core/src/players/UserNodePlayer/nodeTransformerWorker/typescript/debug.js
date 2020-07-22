// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

/*
  THIS IS DEAD CODE!!!

  Kept in for utility purposes, e.g. when creating new test cases.

  Other debugging resources:

  - AST Explorer: https://astexplorer.net/
  - Typescript Architecture: https://github.com/Microsoft/TypeScript/wiki/Architectural-Overview#overview-of-the-compilation-process
  - Good article on custom AST transformer: https://levelup.gitconnected.com/writing-a-custom-typescript-ast-transformer-731e2b0b66e6

  NOTE: When cross-referencing Typescript source-code, make sure you have checked
  out the respective version used here.
*/

// Typescript is required since the `import` syntax breaks VSCode, presumably
// because VSCode has Typescript built in and our import is conflicting with
// some model of theirs. We could just manually insert the entire TS
// source code.
const ts = require("typescript/lib/typescript");

export const visitEachChild = (node: ?ts.Node, cb: (ts.Node) => void) => {
  if (!node) {
    throw new Error("Node not defined.");
  }
  ts.forEachChild(node, (_n) => {
    cb(node);
  });
};

// Useful for understanding where you are in the AST. e.g. if you are looking at
// 'function myFunc() { ... }', this will log 'FunctionDeclaration'.
export const logKind = (node: ?ts.Node, logText?: boolean = false) => {
  if (!node) {
    throw new Error("Node not defined.");
  }
  console.log(`${ts.SyntaxKind[node.kind]}${logText ? ` - ${node.getText()}` : ""}`);
};

// Can be used independently of 'logAllChildren' when you have depth.
export const logFormattedDepth = (node: ts.Node, depth: number, logText?: boolean = false) => {
  console.log(new Array(depth + 1).join("----"), `${ts.SyntaxKind[node.kind]}${logText ? ` - ${node.getText()}` : ""}`);
};

// Gives you a prettified view of all the children in the AST with depth
// formatting. Useful for getting a quick snapshot of the AST you need to parse
// through.
export const logAllChildren = (node: ts.Node, depth: number = 0, maxDepth?: number) => {
  if (maxDepth && depth > maxDepth) {
    return;
  }
  logFormattedDepth(node, depth);
  depth++;
  node.getChildren().forEach((c) => logAllChildren(c, depth, maxDepth));
};

// This is a laundry list of useful properties in a ts.Node. The reason you
// don't typically want to log the entire node is that there's a lot of cirular
// references to other nodes and other fluff you likely do not want to see. This
// utility trims down the fluff. It would be good to break this function down by
// node at some point though.
const formatDetails = (node: ts.Node) => ({
  kind: ts.SyntaxKind[node.kind],
  pos: node.pos,
  end: node.end,
  transformFlags: ts.TransformFlags[node.transformFlags],
  id: node.id,
  flags: ts.NodeFlags[node.flags],
  type: node.type,
  typeName: node.typeName,
  literal: node.literal,
  name: node.name,
  members: node.members && node.members.map(formatDetails),
  exprName: node.exprName && formatDetails(node.exprName),
  constraint: node.constraint,
  default: node.default,
  target: node.target,
  mapper: node.mapper,
  resolvedDefaultType: node.resolvedDefaultType,
});

export const logDetails = (node: ?ts.Node) => {
  if (!node) {
    throw new Error("Node not defined.");
  }
  console.log(formatDetails(node));
};

// Every node in the AST has associated source text from which it came. E.g.
// 'StringKeyword' might refer to 'hello webviz'. It can be very useful to see
// what's what when you're traversing the AST.
export const logNodeText = (node: ?ts.Node) => {
  if (!node) {
    throw new Error("Node not defined.");
  }
  console.log(node.getText());
};
