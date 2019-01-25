# @cruise-automation/rpc

An RPC layer to make it easier to communicate between a WebWorker and the main thread.  Has support for sending and responding with [transferable](https://developer.mozilla.org/en-US/docs/Web/API/Transferable) objects to avoid structured cloning of large array buffers.  It also propagates errors thrown in receivers back to the calling thread.

## Example

```js
// worker.js
import Rpc from '@cruise-automation/rpc'

const rpc = new Rpc(global);

rpc.receive('message', async ({ url }) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Bad response ' + res.status);
  }
  const json = await res.json()
  return { body: json }
});

```

```js
// ui-thread.js
const worker = new WebWorker('./worker.js')
const rpc = new Rpc(worker);
rpc.send('message', { url }).then(({ body }) => {
  console.log('I got a response', body);
});

```

## API

The `Rpc` constructor takes a [`MessagePort`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort) as its constructor argument.  In a `WebWorker` you generally would use `global` and on the UI thread you would use the instance of the `WebWorker` as the `MessagePort`.

### `rpc.send<TResult>(topic: string, data: any, transferables: Transferable[]): Promise<TResult>`

The `send` method takes a topic name and any data.  This data is sent over the `MessagePort` and can be received on the other end with a registered `rpc.receive()` receiver on the same topic.  You may also specify an optional array of [transferable](https://developer.mozilla.org/en-US/docs/Web/API/Transferable) objects.  This returns a promise which resolves with whatever the handler registered on `rpc.receive` returns.

```js
const rpc = new Rpc(new WebWorker('/worker-script.js'))

rpc.send('fetch-and-parse', { url: '/lots-of-binary-data' }).then(({ result }) => {
  console.log(result);
});
```

### `rpc.receive<T, TOut>(topic: string, handler: (T) => TOut): void`

The `receive` method registers a function to be called whenever a message is received on the specified topic.  This function's return value can be waited on by a promise from the caller.  To return an object with a list of [transferable](https://developer.mozilla.org/en-US/docs/Web/API/Transferable) objects in the graph you can add the list with a special key to the response from your receiver.

```js
// worker-script.js
rpc.receive('fetch-and-parse', async ({ url }) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Bad response ' + res.status);
  }
  const arrayBuffer = await res.arrayBuffer();
  const result = doLongRunningParseOperation(arrayBuffer);
  return {
    result,
    [Rpc.transferables]: [result]
  }
});
```

If the `handler` throws or rejects the error message will be sent through the `MessagePort` and calling thread's promise will reject.

### `Rpc.transferable`

This is a static property on the `Rpc` class that contains the magic string you must use as a key when responding to a message in a receiver and attaching transferables to the response.
