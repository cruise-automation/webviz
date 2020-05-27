# Node Playground

Node Playground is a code editor sandbox in which you can write pseudo-ROS topics that get published within Webviz. Node Playground allows you to manipulate, reduce, and filter existing ROS messages and output them in a way that is useful to you.

## Getting Started

Node Playground uses TypeScript to typecheck messages coming in and out of your nodes. If you are already familiar with TypeScript, skip the "Learning TypeScript" section below.

### Learning TypeScript

TypeScript is a superset of JavaScript, so Google syntactic questions (e.g. how to manipulate arrays, or access object properties) using JavaScript terms, and semantic questions (e.g. how to make an object property optional) using TypeScript terms.

Here are some resources to get yourself ramped up:

- [Basic Types](https://www.typescriptlang.org/docs/handbook/basic-types.html)
- [Gitbook](https://basarat.gitbooks.io/typescript/content/docs/why-typescript.html)

Post in #typescript for TypeScript questions.

### Writing Your First Webviz Node

Every Webviz node must declare 3 exports that determine how it should execute:

- An inputs array of topic names.
- An output topic with an enforced prefix: `/webviz_node/`.
- A publisher function that takes messages from input topics and publishes messages under your output topic.

Here is a basic node that echoes its input:

```typescript
import { Input, Messages } from "ros";

export const inputs = [ "/rosout" ];
export const output = "/webviz_node/echo";

const publisher = (message: Input<"/rosout">): Messages.rosgraph_msgs__Log => {
  return message.message;
};

export default publisher;
```

If you drag in a bag, you should now be able to subscribe to the “/webviz_node/echo” topic in the Raw Messages panel.

But let’s say you want to render some markers in the 3D panel. When you create a new node, you’ll be presented with some boilerplate:

```typescript
import { Input, Messages } from "ros";

type Output = {};

export const inputs = [];
export const output = "/webviz_node/";

// Populate 'Input' with a parameter to properly type your inputs, e.g. 'Input<"/your_input_topic">'
const publisher = (message: Input<>): Output => {
  return {};
};

export default publisher;
```

You’ll notice a few things:

- The types `Input` and `Messages` are being imported from the `ros` module.

- The type `Output` has no properties.

`Input` is a generic type, meaning that it takes a parameter in order to be used. It is left empty on purpose as you'll need to populate it with the name of your input topic, e.g. `Input<"/rosout">`.

As for the `Output` type, you can either manually type out your output with the properties you care about or use one of the dynamically generated types from the `Messages` type imported above. For instance, if you want to publish an array of markers, you can return the type `Messages.visualization_msgs__MarkerArray`.

Strictly typing your nodes will help you debug issues at compile time rather than at runtime. It's not always obvious in Webviz how message properties are affecting the visualized output, and so the more you strictly type your nodes, the less likely you will make mistakes.

With that said, you can disable Typescript checks while getting a rough draft of your node working by adding `// @ts-ignore` on the line above the one you want to ignore.

#### Using Multiple Input Topics

In some cases, you will want to define multiple input topics:

```typescript
import { Input, Messages } from "ros";

export const inputs = [ "/rosout", "/tf" ];
export const output = "/webviz_node/echo";

const publisher = (message: Input<"/rosout"> | Input<"/tf">): { data: number[] }  => {

  if (message.topic === "/rosout") {
    // type is now refined to `/rosout` -- you can use `message.message.pose` safely
  } else {
    // type is now refined to `/tf` -- you can use `message.message.transforms` safely
  }

  return { data: [] };
};

export default publisher;
```

This snippet uses [union types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#union-types) to assert that the message in the publisher function can take either a `/rosout` or `/tf` topic. Use an `if`/`else` clause to differentiate between incoming topic datatypes when manipulating messages.

To combine messages from multiple topics, create a variable in your node's global scope to reference every time your publisher function is invoked. Check timestamps to make sure you are not publishing out-of-sync data.

```typescript
import { Input, Messages, Time } from "ros";

export const inputs = [ "/rosout", "/tf" ];
export const output = "/webviz_node/echo";

let lastReceiveTime: Time = { sec: 0, nsec: 0 };
const myScope: {
  tf: Messages.tf2_msgs__TFMessage | null,
  rosout: Messages.rosgraph_msgs__Log | null
} = { 'tf': null, 'rosout': null };

const publisher = (message: Input<"/rosout"> | Input<"/tf">): { data: number[] } | undefined => {
  const { receiveTime  } = message;
  let inSync = true;
  if (receiveTime.sec !== lastReceiveTime.sec || receiveTime.nsec !== lastReceiveTime.nsec) {
    lastReceiveTime = receiveTime;
    inSync = false;
  }

  if (message.topic === "/rosout") {
    myScope.rosout = message.message;
  } else {
    myScope.tf = message.message
  }

  if (!inSync) {
    return { data: [] };
  }
}

export default publisher;
```

## Debugging

For easier debugging, invoke `log(someValue)` anywhere in your Webviz node code to print values to the `Logs` section at the bottom of the panel. The only value you cannot `log()` is one that is, or contains, a function definition.

```typescript
const add = (a: number, b: number): number => a + b;

// NO ERRORS
log(50, "ABC", null, undefined, 5 + 5, { "abc": 2, "def": false }, add(1, 2));

// ERRORS
log(() => {});
log(add);
log({ "add": add, "subtract": (a: number, b: number): number => a - b })
```

Invoking `log()` outside your publisher function will invoke it once, when your node is registered. Invoking `log()` inside your publisher function will log that value every time your publisher function is called.

Note that if your topic publishes at a high rate (`tick_information` for instance) using `log` will significantly slow down Node Playground.

## FAQ

> What if I don't want to produce a message every time `publish` is called?

All you need to do is do an early (or late) return in your function body that is hit when you don't want to publish. For instance, let's say you only wanted to publish messages when a constant in the input is _not_ `3`:

```typescript
import { Input } from "ros";

export const inputs = ["/state"];
export const output = "/webviz_node/manual_metrics";

const publisher = (msg: Input<"/state">): { metrics: number } | undefined => {
  if (msg.message.constant === 3) {
    return;
  }
  return { /* YOUR DATA HERE */ };
};

export default publisher;
```

Note the union return type in the `publisher` definition. We've indicated to Typescript that this function can return `undefined`, and we do so within the conditional block (In Typescript, if you `return` without a value, it will implicitly return `undefined`). When this code path is hit, we don't publish any message.
