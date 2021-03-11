// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import ServerLogger, { type LogObject } from "./ServerLogger";

// Acts like a ServerLogger, but allows setting a "context" object
// that will get merged into the moreData object every time something is logged.
// This allows logging to include extra contextual information without passing
// around cross-cutting data.
export default class ContextServerLogger {
  _logger: ServerLogger;
  _moreContextData: any;

  constructor(scope: string) {
    this._logger = new ServerLogger(scope);
  }

  setContext(moreContextData: any) {
    this._moreContextData = moreContextData;
  }

  debug(message: string, moreData?: LogObject | Error) {
    this._logger.debug(message, { ...this._moreContextData, ...moreData });
  }

  info(message: string, moreData?: LogObject | Error) {
    this._logger.info(message, { ...this._moreContextData, ...moreData });
  }

  warn(message: string, moreData?: LogObject | Error) {
    this._logger.warn(message, { ...this._moreContextData, ...moreData });
  }

  error(message: string, moreData?: LogObject | Error) {
    this._logger.error(message, { ...this._moreContextData, ...moreData });
  }
}
