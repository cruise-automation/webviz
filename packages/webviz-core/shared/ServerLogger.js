// @flow
//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import globalEnvVars from "./globalEnvVars";

// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
type LogSeverity = "DEFAULT" | "DEBUG" | "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL" | "ALERT" | "EMERGENCY";

type LogObject = $ReadOnly<{ [key: string]: string | number }> | Error;

let log = (severity: LogSeverity, scope: string, message: string, moreData?: LogObject) => {
  const domain = (process.domain: any);
  const user = domain ? domain.username : "";

  const parsedMoreData: $ReadOnly<{ [key: string]: string | number }> =
    moreData instanceof Error ? { errorStack: moreData.stack } : moreData || {};

  if (process.env.LOG_FORMAT === "json") {
    try {
      const data: any = {
        severity,
        scope,
        message,
        ...parsedMoreData,
      };
      if (user) {
        data.user = user;
      }
      if (domain && domain.httpRequest) {
        data.httpRequest = domain.httpRequest;
      }
      console.log(JSON.stringify(data));
      return;
    } catch (e) {
      // fall through to non-JSON log
    }
  }

  console.log(`${severity}:`, user, scope, message, JSON.stringify(parsedMoreData));
};

// silence logging in tests
if ((process.env.NODE_ENV === "test" || globalEnvVars.inIntegrationTestServer) && !globalEnvVars.showTestOutput) {
  log = (..._any) => {};
}

// TODO(JP): We might want to add Sentry logging for warn/error here
// as well, just like in the client side, but we have to be careful
// to not do any double logging.

export default class ServerLogger {
  scope: string;

  constructor(scope: string) {
    this.scope = scope;
  }

  debug(message: string, moreData?: LogObject) {
    log("DEBUG", this.scope, message, moreData);
  }

  info(message: string, moreData?: LogObject) {
    log("INFO", this.scope, message, moreData);
  }

  warn(message: string, moreData?: LogObject) {
    log("WARNING", this.scope, message, moreData);
  }

  error(message: string, moreData?: LogObject) {
    log("ERROR", this.scope, message, moreData);
  }
}
