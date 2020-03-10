// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
export function hideLoadingLogo() {
  const loadingLogo = document.getElementById("loadingLogo");
  if (loadingLogo) {
    loadingLogo.style.opacity = "0";
    setTimeout(() => {
      const loadingLogoInSetTimeout = document.getElementById("loadingLogo");
      if (loadingLogoInSetTimeout) {
        loadingLogoInSetTimeout.remove();
      }
    }, 300);
  }
}
