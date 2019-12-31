// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React from "react";

import imageSrc from "./WssErrorModal.png";
import HelpModal from "webviz-core/src/components/HelpModal";

export default function WssErrorModal(props: {| onRequestClose: () => void |}) {
  return (
    <HelpModal onRequestClose={props.onRequestClose}>
      <h1>WebSocket SSL Error</h1>
      <p>
        Chrome prevents connecting to a websocket which is not served over TLS/SSL. For now you can circumvent this by
        enabling &quot;unsafe&quot; scripts for this page.
      </p>
      <p>Click the shield icon at the end of your address bar, and then click &quot;Load unsafe scripts.&quot;</p>
      <img width="450px" src={imageSrc} alt="wss error fix" />
    </HelpModal>
  );
}
