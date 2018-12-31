// @flow
//
//  Copyright (c) 2018-present, GM Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

type Props = {
  filesSelected: (FileList) => any,
};

export default class DocumentDropListener extends React.PureComponent<Props> {
  componentDidMount() {
    document.addEventListener("dragover", this.onDragOver);
    document.addEventListener("drop", this.onDrop);
  }

  componentWillUnmount() {
    document.removeEventListener("dragover", this.onDragOver);
    document.removeEventListener("drop", this.onDrop);
  }

  onDrop = async (ev: DragEvent) => {
    const { filesSelected } = this.props;
    if (!ev.dataTransfer) {
      return;
    }
    const { files } = ev.dataTransfer;
    // allow event to bubble for non-file based drag and drop
    if (!files.length) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    filesSelected(files);
  };

  onDragOver = (ev: DragEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    // dataTransfer isn't guaranteed to exist by spec, so must be checked
    if (ev.dataTransfer) {
      ev.dataTransfer.dropEffect = "copy";
    }
  };

  render() {
    // Expose a hidden input for Puppeteer to use to drop a file in.
    return (
      <input
        type="file"
        style={{ display: "none" }}
        onChange={(event) => this.props.filesSelected(event.target.files)}
        data-puppeteer-file-upload
        multiple
      />
    );
  }
}
