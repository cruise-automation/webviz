# @cruise-automation/tooltip

React component that uses [popper.js](https://popper.js.org/) to add rich, customizable tooltips to DOM elements.

## Usage

```bash
npm install --save @cruise-automation/tooltip
```

It can render any `React.Node` within itself. It comes with a wrapper component you can use to add tooltips to existing html elements, and an imperative API to absolutely position the tooltip for interacting with non-element based things (image hitmaps, charts, webgl).

The tooltip container element has basic css applied for absolute positioning.  It also has an unused global className of `tooltip` so you can apply custom styles globally in your application. e.g. `.tooltip { border-radius: 5px, padding: 10px, border: 1px solid pink }` in your css.

The React "wrapper" component API looks like this:

```js
<Tooltip contents="This is the tooltip contents" fixed delay>
  <div>Mouse over this and after 500 milliseconds a tooltip will show</div>
</Tooltip>
```

The imperative API looks like this:

```js
const MyComponent = (props) => {
  const showTip = (e) => {
    Tooltip.show(
      e.clientX,
      e.clientY,
      <div>
        `Your mouse is at ${e.clientX}, ${e.clientY}
      </div>,
      { offset: 20 }
    );
  };

  return (
    <div onMouseMove={showTip} onMouseLeave={Tooltip.hide}>
      Mouse over to show a tooltip
    </div>
  );
};
```

## API

### Tooltip.show(x: number, y: number, contents: React.Node, options: { offset: number })

Shows the tooltip at `x, y` with the `contents` rendered into the body of the tooltip. An optional offset can be supplied to move the tooltip `offset`px away from the mouse. The tooltip will attempt to render within the viewport, so if it is rendered near the bottom edge of the screen it will shift to the left / top of the mouse (plus the offset) accordingly.

### Tooltip.hide()

Hides the tooltip.

## Props

| Name     | Type              | Description                                                                                                                      |
| -------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| children | React.Node        | The element to wrap and add mouse listeners to                                                                                   |
| contents | React.Node        | This will rendered into the body of the tooltip when the tooltip is shown                                                        |
| fixed?   | boolean           | `true` will make the tooltip fixed to the bottom / right edge of the wrapped component                                           |
| delay?   | boolean or number | The delay to wait before displaying a fixed tooltip. Setting to `true` will use the default delay of 500ms                       |
| offset?  | number            | The pixel offset from `x, y` - the default value is `14px`. This helps the tooltip not be partially covered by the mouse pointer |
