# @cruise-automation/hooks

A set of resusable React Hooks.

## Usage

```bash
npm install --save @cruise-automation/hooks
```

```js
import { useAbortable, useCleanup, useEventListener, useAnimationFrame } from "@cruise-automation/hooks";

//*************** useAbortable **********************
// Abort an fetchData action
const [remoteData, abortFn] = useAbortable(
  [], // default value
  async (abortController) => fetchDataFromRemote(props, "dataName"), // action to perform
  (val) => {}, // clean up work if there is any
  ["dataName"] // remount when dependencies change
);

// call abortFn somewhere else, e.g. before component unmounts
abortFn();

//*************** useCleanup **********************
// Call a cleanup function before the component unmounts
const [audioContent] = React.useState(() => new window.AudioContext));
useCleanup(() => audioContext.close());

//*************** useEventListener **********************
// Add an event listener to the target with option to disable it
useEventListener(
  window, // event target
  "mousemove", // event type
  isDragging, // enable during mouse dragging
  (event) => {
    // do something here...
  },
  ["someDependencies"]
);

//*************** useRequestAnimationFrame **********************
// A count state that gets updated in every requestAnimationFrame
const [count, setCount] = React.useState(0);
useAnimationFrame(
  (timestamp) => {
    setCount(count + 1);
  },
  false, // disable or enable
  ["someDependencies"]
);
```
