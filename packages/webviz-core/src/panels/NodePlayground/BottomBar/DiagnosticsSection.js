// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import AlertCircleIcon from "@mdi/svg/svg/alert-circle.svg";
import AlertIcon from "@mdi/svg/svg/alert.svg";
import HelpCircleIcon from "@mdi/svg/svg/help-circle.svg";
import InformationIcon from "@mdi/svg/svg/information.svg";
import { invert } from "lodash";
import React from "react";

import Icon from "webviz-core/src/components/Icon";
import type { Diagnostic } from "webviz-core/src/players/UserNodePlayer/types";
import { DiagnosticSeverity } from "webviz-core/src/players/UserNodePlayer/types";
import { colors } from "webviz-core/src/util/sharedStyleConstants";

const severityColors = {
  Hint: colors.YELLOWL1,
  Info: colors.BLUEL1,
  Warning: colors.ORANGEL1,
  Error: colors.REDL1,
};

const severityIcons = {
  Hint: <HelpCircleIcon />,
  Info: <InformationIcon />,
  Warning: <AlertIcon />,
  Error: <AlertCircleIcon />,
};

type Props = {
  diagnostics: Diagnostic[],
};

const DiagnosticsSection = ({ diagnostics }: Props) => {
  return diagnostics.length ? (
    <ul>
      {diagnostics.map(({ severity, message, source, startColumn = null, startLineNumber = null }, i) => {
        const severityLabel = invert(DiagnosticSeverity)[severity];
        const errorLoc =
          startLineNumber != null && startColumn != null ? `[${startLineNumber + 1},${startColumn + 1}]` : null;
        return (
          <li key={`${message}_${i}`}>
            <Icon tooltip="Severity" small style={{ color: severityColors[severityLabel] }} active>
              {severityIcons[severityLabel]}
            </Icon>
            <span style={{ padding: "5px" }}>{message}</span>
            <span style={{ color: colors.GRAY }}>
              {source} {errorLoc}
            </span>
          </li>
        );
      })}
    </ul>
  ) : (
    <p>No problems to display.</p>
  );
};

export default DiagnosticsSection;
