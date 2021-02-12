// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import LoadingIcon from "@mdi/svg/svg/loading.svg";
import React, { PureComponent } from "react";

import styles from "./SpinningLoadingIcon.module.scss";

export default class SpinningLoadingIcon extends PureComponent<{}> {
  render() {
    return <LoadingIcon className={styles.spin} />;
  }
}
