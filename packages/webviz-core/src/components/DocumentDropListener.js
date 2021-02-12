// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";

type Props = {
  children: React.Node, // Shown when dragging in a file.
  filesSelected: ({
    files: FileList | File[],
    shiftPressed: boolean,
    onConfirmLocalFilesModalClose?: () => void,
  }) => any,
};

type State = {
  hovering: boolean,
};

export default class DocumentDropListener extends React.PureComponent<Props, State> {
  state = { hovering: false };

  componentDidMount() {
    document.addEventListener("dragover", this._onDragOver);
    document.addEventListener("drop", this._onDrop);
    document.addEventListener("dragleave", this._onDragLeave);
  }

  componentWillUnmount() {
    document.removeEventListener("dragover", this._onDragOver);
    document.removeEventListener("drop", this._onDrop);
    document.removeEventListener("dragleave", this._onDragLeave);
  }

  _onDrop = async (ev: DragEvent) => {
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
    filesSelected({ files, shiftPressed: ev.shiftKey });
    this.setState({ hovering: false });
  };

  _onDragOver = (ev: DragEvent) => {
    const { dataTransfer } = ev;
    // dataTransfer isn't guaranteed to exist by spec, so it must be checked
    if (dataTransfer && dataTransfer.types.length === 1 && dataTransfer.types[0] === "Files") {
      ev.stopPropagation();
      ev.preventDefault();
      dataTransfer.dropEffect = "copy";
      this.setState({ hovering: true });
    }
  };

  _onDragLeave = () => {
    this.setState({ hovering: false });
  };

  render() {
    return (
      <>
        <input
          // Expose a hidden input for Puppeteer to use to drop a file in.
          type="file"
          style={{ display: "none" }}
          onChange={(event) => this.props.filesSelected({ files: event.target.files, shiftPressed: false })}
          data-puppeteer-file-upload
          multiple
        />
        {this.state.hovering && this.props.children}
      </>
    );
  }
}
