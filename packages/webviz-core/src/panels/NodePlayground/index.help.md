# Node Playground

Node Playground is a code editor sandbox in which you can write pseudo-ROS topics that get published within Webviz. Node Playground allows you to manipulate, reduce, and filter existing ROS messages and output them in a way that is useful to you.

## Getting Started

Node Playground uses TypeScript to typecheck messages coming in and out of your nodes. If you are already familiar with TypeScript, skip the "Learning TypeScript" section below.

### Learning TypeScript

TypeScript is a superset of JavaScript, so Google syntactic questions (e.g. how to manipulate arrays, or access object properties) using JavaScript terms, and semantic questions (e.g. how to make an object property optional) using TypeScript terms.

Here are some resources to get yourself ramped up:

- [Basic Types](https://www.typescriptlang.org/docs/handbook/basic-types.html)
- [Gitbook](https://basarat.gitbooks.io/typescript/content/docs/why-typescript.html)

Post in #stay-typesafe for TypeScript questions.

### Writing Your First Webviz Node

Every Webviz node must declare 3 exports that determine how it should execute:

- An inputs array of topic names.
- An output topic with an enforced prefix: `/webviz_node/`.
- A publisher function that takes messages from input topics and publishes messages under your output topic.

Here is a basic node that echoes its input:

```typescript
import { Message } from "ros";

type RosOutMsg = {
  level: number,
  name: string,
  msg: string,
  file: string,
  function: string,
  line: number,
  topics: string[],
};

export const inputs = [ "/rosout" ];
export const output = "/webviz_node/echo";

const publisher = (message: Message<RosOutMsg>): RosOutMsg => {
  return message.message;
};

export default publisher;
```

If you drag in a bag, you should now be able to subscribe to the “/webviz_node/echo” topic in the Raw Messages panel.

But let’s say you want to render some markers in the 3D panel. When you create a new node, you’ll be presented with some boilerplate:

```typescript
import { Message } from "ros";

type InputTopicMsg = { /* YOUR INPUT TOPIC TYPE HERE */ };
type Output = { /* DEFINED YOUR OUTPUT HERE */ };

export const inputs = [];
export const output = "/webviz_node/";

const publisher = (message: Message<InputTopicMsg>): Output => {
  return {};
};

export default publisher;
```

You’ll notice a few things:

- The type `Message` is being imported from a custom library called `ros`. For more information on these type definitions and where they come from, refer to the [Important Types to Know](#important-types-to-know) section below.

- The type `InputTopicMsg` has no properties.

You'll need to define your own types here from your input topics.

- The type `Output` has no properties.

You will need to fill in this type's definition to include the output properties you care about. For markers, you _must_ return a type of the form `{ markers: MarkerType[] }`. Reference the Markers section below for example types.

Strictly typing your nodes will help you debug issues at compile time rather than at runtime. It's not always obvious in Webviz how message properties are affecting the visualized output, and so the more you strictly type your nodes, the less likely you will make mistakes.

With that said, you can disable Typescript checks while getting a rough draft of your node working by adding `// @ts-ignore` on the line above the one you want to ignore.

#### Using Multiple Input Topics

In some cases, you will want to define multiple input topics:

```typescript
import { Time, Message, Header, Pose, LineStripMarker } from "ros";

type BaseMessage<Topic, Msg> = Message<Msg> & {
  topic: Topic
}

type RosOutMsg = {
  header: Header,
  pose: Pose
};
type RosOut = BaseMessage<"/rosout", RosOutMsg>;

type Transform = {
  translation: number[],
  rotation: number[]
}
type TransformMsg = {
  header: Header,
  child_frame_id: string,
  transform: Transform
}
type TransformMsgArray = {
  transforms: TransformMsg[]
};
type Tf = BaseMessage<"/tf", TransformMsgArray>;

type Marker = LineStripMarker;
type MarkerArray = {
  markers: Marker[]
}

export const inputs = [ "/rosout", "/tf" ];
export const output = "/webviz_node/echo";

const publisher = (message: RosOut | Tf): MarkerArray => {

  if (message.topic === "/rosout") {
    // type is now refined to `/rosout` -- you can use `message.message.pose` safely
  } else {
    // type is now refined to `/tf` -- you can use `message.message.transforms` safely
  }

  return { markers: [] };
};

export default publisher;
```

This snippet uses [union types](https://www.typescriptlang.org/docs/handbook/advanced-types.html#union-types) to assert that the message in the publisher function can take either a `/rosout` or `/tf` topic. Use an `if`/`else` clause to differentiate between incoming topic datatypes when manipulating messages.

To combine messages from multiple topics, create a variable in your node's global scope to reference every time your publisher function is invoked. Check timestamps to make sure you are not publishing out-of-sync data.

```typescript
let lastReceiveTime: Time | null = null;
const myScope: { tf: TfMsg, rosout: RosOutMsg } = { 'tf': null, 'rosout': null };

const publisher = (message: RosOut | Tf): MarkerArray => {
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
    return { markers: [] };
  }
  ... rest of publishing logic...
```

## Important Types to Know

By using types to publish your node messages, you can catch errors at compile time, rather than at runtime.

The type definitions below are provided in the Node Playground environment by default, via Webviz's `ros` library.

```typescript
// RGBA
type RGBA = { // all values are scaled between 0-1 instead of 0-255
    r: number,
    g: number,
    b: number,
    a: number // opacity -- typically you should set this to 1.
};

// Time
type Time = {
    sec: number,
    nsec: number
};

// Message
type Message<T> = {
  topic: string,
  datatype: string,
  op: "message",
  receiveTime: Time,
  message: T,
}

// Header
type Header = {
  frame_id: string,
  stamp: Time,
};

// Point
type Point = {
  x: number,
  y: number,
  z: number
};

// Scale
type Scale = {
  x: number,
  y: number,
  z: number
};

// Orientation
type Orientation = {
  x: number,
  y: number,
  z: number,
  w: number
};

// Pose
type Pose = {
  position: Point,
  orientation: Orientation
};

// Markers
// All marker types build on this base marker type.
/**
 * For publishing markers, every other marker is built up on this base type.
 * The 'id' property has to be unique, as duplicate ids will cause markers to
 * be overwritten. The 'ns' property corresponds to namespace under which your
 * marker is published. In most cases, you will just want to set the 'action'
 * property to '0'.
  */
type BaseMarker = {
  header: Header,
  ns: string, // namespace that your marker is published under.
  id: string | number, // IMPORTANT: Needs to be unique. Duplicate ids will overwrite other markers.
  action: 0 | 1 | 2 | 3, // In most cases, you will want to use '0' here.
  pose: Pose,
  scale: Scale,
  color?: RGBA,
  customMetadata?: { [key: string]: any }
};

// MultiPointMarker
/**
 * When publishing markers with a 'points' array, the 'color' field takes 1 RGBA object to apply to all points,
 * while the 'colors' field takes in an array of RGBA objects to apply to each point. When both are present,
 * the 'colors' field overrides the 'color' field.
  */
type MultiPointMarker = BaseMarker & {
  points: Point[],
  color?: RGBA,
  colors?: RGBA[]
};

// ArrowMarker
/**
 * When publishing markers with a 'points' array, the 'color' field takes 1 RGBA object to apply to all points,
 * while the 'colors' field takes in an array of RGBA objects to apply to each point. When both are present,
 * the 'colors' field overrides the 'color' field.
  */
export declare type ArrowMarker = MultiPointMarker & {
  type: 0,
  size?: ArrowSize,
}

type ArrowSize = {
  shaftWidth: number,
  headLength: number,
  headWidth: number
};

// CubeMarker
type CubeMarker = BaseMarker & {
  type: 1
};

// CubeListMarker
type CubeListMarker = MultiPointMarker & {
  type: 6
};

// SphereMarker
type SphereMarker = BaseMarker & {
  type: 2
};

// SphereListMarker
type SphereListMarker = MultiPointMarker & {
  type: 7
};

// CylinderMarker
type CylinderMarker = BaseMarker & {
  type: 3
};

// LineStripMarker
type LineStripMarker = MultiPointMarker & {
  type: 4
};

// LineListMarker
type LineListMarker = MultiPointMarker & {
  type: 5
};

// PointsMarker
type PointsMarker = MultiPointMarker & {
  type: 8
};

// TextMarker
type TextMarker = BaseMarker & {
  type: 9,
  text: string
};

// TriangleListMarker
type TriangleListMarker = MultiPointMarker & {
  type: 11
};

// MeshMarker
type MeshMarker = MultiPointMarker & {
  type: 10
};

// FilledPolygonMarker
type FilledPolygonMarker = MultiPointMarker & {
  type: 107
};
```

To use these predefined type definitions in your Webviz node code, import them from the `ros` library at the top of your code.

```typescript
import { RGBA, Header, Message } from 'ros';

type MyCustomMsg = { header: Header, color: RGBA };

export const inputs = ["/some_input"];
export const output = "/webviz_node/";

type Marker = {};
type MarkerArray = {
  markers: Marker[]
};

const publisher = (message: Message<MyCustomMsg>): MarkerArray => {
  return { markers: [] };
};

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

## FAQ

> What if I don't want to produce a message every time `publish` is called?

All you need to do is do an early (or late) return in your function body that is hit when you don't want to publish. For instance, let's say you only wanted to publish messages when a constant in the input is _not_ `3`:

```typescript
import { Message } from "ros";

export const inputs = ["/state"];
export const output = "/webviz_node/manual_metrics";

const publisher = (msg: Message<{ constant: number }>): { metrics: number } | undefined => {
  if (msg.message.constant === 3) {
    return;
  }
  return { /* YOUR DATA HERE */ };
};

export default publisher;
```

Note the union return type in the `publisher` definition. We've indicated to Typescript that this function can return `undefined`, and we do so within the conditional block (In Typescript, if you `return` without a value, it will implicitly return `undefined`). When this code path is hit, we don't publish any message.
