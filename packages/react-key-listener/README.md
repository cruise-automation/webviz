# react-key-listener

React component for handling keyboard events, without interfering with editable fields and buttons. Use this instead of calling `addEventListener` or adding `onKeyDown` to elements manually.

## Usage

```bash
npm install --save react-key-listener
```

Example:

```jsx
class MyComponent extends React.Component {
  handleAKey = () => {
    // do something
  };

  render() {
    return (
      <div tabIndex={0 /* allow this div to be given user focus */}>
        <KeyListener keyDownHandlers={{
          a: this.handleAKey
        }} />
      </div>
    );
  }
}
```


KeyListener ignores key events when the event originated from an `<input>`, `<textarea>`, or `contenteditable` element. This prevents your key event handlers from triggering when the user expected to be typing in a text field.

The event listener is added to the `KeyEvent` component's **parent element**.

## Props

| Name               | Type                       | Description |
| ------------------ | -------------------------- | ----------- |
| `keyDownHandlers` | `{ [key: string]: (event: KeyboardEvent) => void }` | event handlers for `keydown` events. if `event.key` appears as a property on this object, the corresponding handler will be called |
| `keyPressHandlers` | `{ [key: string]: (event: KeyboardEvent) => void }` | |
| `keyUpHandlers` | `{ [key: string]: (event: KeyboardEvent) => void }` | |
| `global` | <code>true &#124; false</code> | if true, listen to events on `document`; if false, listen on the KeyListener's parent element |
