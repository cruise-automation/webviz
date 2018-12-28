// flow-typed signature: 3062f7aa14a5184b59450ae0a632f210
// flow-typed version: 149b8d2e6d/react-copy-to-clipboard_v5.x.x/flow_>=v0.25.x

// @flow

declare module 'react-copy-to-clipboard' {
  declare export type CopyToClipboardOptions = {
    debug: boolean,
    message: string
  };

  declare export type CopyToClipboardProps = {
    text: string,
    onCopy?: (text: string, result: boolean) => void,
    options?: CopyToClipboardOptions,
    children?: React$Node
  };

  declare export class CopyToClipboard extends React$Component<CopyToClipboardProps> {}
  declare export default class CopyToClipboard extends React$Component<CopyToClipboardProps> {}
}
