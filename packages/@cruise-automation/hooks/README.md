# @cruise-automation/hooks

A list of resusable React hooks.

## Install

```bash
npm install --save @cruise-automation/hooks
```

## Hooks

### `useAbortable`

A React hook to load async, disposable resources and fire the cleanup callback when the component unmountts. If the component unmounts before the async operation completes, the resource will still be cleaned up once it finishes loading and an abort signal will be issued to the async load operation.

```js
// types
 useAbortable<T>(
  defaultValue: T,  // default value, will be set to the actual value if action is performed successfully
  action: (AbortController) => Promise<T>, // async action to perform
  cleanup: (?T) => void, // clean up work if thtere is any
  args: any // dependencies
): [T, () => void] // result value and abort function
```

```js
// sample usage
import { useAbortable } from "@cruise-automation/hooks";

function Example(props) {
  const [data, setData] = useState(null);
  const dateName = 'foo';
  // fetch data from remote when the component is mounted
  const [remoteData, abortFn] = useAbortable(
    null,
    async (abortController) =>  {
      if (dataName) {
        fetchDataFromRemote(props, dataName)
      }
    }
    (val) => {},
    [dataName]
  );

  // abort is usually called automatically when the component unmounts, but it can also be called manually
  function abortManually() {
    abortFn();
  }

  return (
    <div>
      <button onClick={abortManually}>Stop Loading</button>
    </div>
  );
}
```

### `useCleanup`

A small React hook to fire the cleanup callback when the component unmounts. Equivalent to `useEffect(() => () => { teardown(); }, [])`.

```js
// types
 useCleanup(teardown: () => void): void
```

```js
// sample usage
function Example() {
  const [audioContext] = React.useState(() => new window.AudioContext));
  // automatically close audioContext when the component unmounts
  useCleanup(() => audioContext.close());
  return null;
}
```

### `useEventListener`

A hook for conditionally adding and removing event listeners on DOM elements.

```js
// types
useEventListener<T>(
  target: Element, // event target, e.g. window
  type: string, // event type
  enable: boolean,
  handler: (any) => void,
  dependencies: any[],
): void
```

```js
// sample usage
function Example() {
  const [isDragging, setIsDragging] = useState(false);
  useEventListener(
    window,
    "mousemove",
    isDragging, // add this listener only during mouse dragging
    (event) => {
      /* do something here... */
    },
    []
  );
  return <div onMouseDown={() => setIsDragging(true)}>demo</div>;
}
```

### `useAnimationFrame`

A React hook that accepts a callback function which will be called repeatedly, synchronized with the browser's repaints via [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame).

```js
// types
useAnimationFrame(
  callback: (timestamp: number) => void,
  disable: boolean,
  dependencies: any[],
): void
```

```js
// sample usage: a count state that gets updated in every animation frame
function Example() {
  const [count, setCount] = React.useState(0);
  useAnimationFrame(
    (timestamp) => {
      setCount(count + 1);
    },
    false,
    []
  );
  return <span>{count}</span>;
}
```
