# @cruise-automation/hooks

A set of resusable React Hooks.

## Usage

```bash
npm install --save @cruise-automation/hooks
```

### useAbortable

```js
import { useAbortable, useConstant, useEventListener, useRequestAnimationFrame } from "@cruise-automation/hooks";

// Abort an fetchData action
const [remoteData] = useAbortable(
  [], // default value
  async () => fetchDataFromRemote(props), // action to perform
  () => {}, // clean up work if there is any
  ["some dependencies"] // remount when dependencies change
);

// Create an instance variable to be shared across component life cycles
const audioContext = useConstant(
  () => new (window.AudioContext || window.webkitAudioContext)(),
  (audioContext) => audioContext.close() // cleanup work before the component unmounts
);

// Add an event listener to the target with option to disable it
useEventListener(
  window, // event target
  "mousemove", // event name
  !!isDragging, // disabled or enable
  (event) => {
    // do something here...
  },
  ["some dependencies"]
);

// A count state that gets updated in every requestAnimationFrame
const [count, setCount] = React.useState(0);
useRequestAnimationFrame(
  (timestamp) => {
    setCount(count + 1);
  },
  false, // disable or enable
  ["some dependencies"]
);
```
