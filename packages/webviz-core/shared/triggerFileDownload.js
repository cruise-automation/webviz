// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

export default function triggerFileDownload(url: string, filename: string) {
  const body = document.body;
  if (!body) {
    return;
  }
  const link = document.createElement("a");
  link.style.display = "none";
  link.setAttribute("download", filename);
  link.setAttribute("href", url);
  body.appendChild(link);
  link.onclick = (event) => {
    body.removeChild(event.target);
    URL.revokeObjectURL(url);
  };
  link.click();
}
