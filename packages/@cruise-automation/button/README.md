# @cruise-automation/button

React button component that supports animated progress for destructive actions, "pulse" animation, and Bulma classes.

## Usage

```bash
npm install --save @cruise-automation/button`
```

If the button is passed an `onClick` callback the event will have its propagation stopped before the callback is called. This is because 95% of the time you don't want the event to propagate and can be the source of subtle bugs. If you want the click to propagate, do not supply an `onClick` handler and wrap the component in a container element with an `onClick` handler such as a span or div.

## Props

| Name               | Type                       | Description                                                                                                                                       |
| ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| children           | any                        | passed as the child(ren) to the `<button>` element                                                                                                |
| onClick?           | (e) => void                | click callback. The event will _not_ propagate to parent elements.                                                                                |
| primary?           | boolean                    | true to apply the `is-primary` class                                                                                                              |
| danger?            | boolean                    | true to apply the `is-danger` class                                                                                                               |
| small?             | boolean                    | true to apply the `is-small` class                                                                                                                |
| large?             | boolean                    | true to apply the `is-large` class                                                                                                                |
| primary?           | boolean                    | true to apply the `is-primary` class                                                                                                              |
| warning?           | boolean                    | true to apply the `is-warning` class                                                                                                              |
| danger?            | boolean                    | true to apply the `is-danger` class                                                                                                               |
| style?             | object                     | custom style to be applied as the `style={}` prop to the element                                                                                  |
| className?         | string                     | will be appended as a custom value to the `className=` prop                                                                                       |
| tooltip?           | string                     | will be set as the `title=` prop on the element                                                                                                   |
| delay?             | number                     | if supplied, onClick will not be called until after `delay` milliseconds have passed. A progress bar will be displayed while the button 'charges' |
| progressClassName? | string                     | optional additional css class to apply to the progress bar                                                                                        |
| progressStyle?     | { [string]: any }          | optional style properties to apply to the progress bar's style prop                                                                               |
| progressDirection? | "vertical" or "horizontal" | by default the value is "vertical", supply "horizontal" to grow the progress bar left-to-right instead of bottom-to-top                           |
