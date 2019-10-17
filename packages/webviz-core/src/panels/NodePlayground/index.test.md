# Node Playground

The code below should wrap appropriately, instead of going outside the Sidebar's visible window.

```typescript
import { RGBA, Header, Message } from 'ros';

type MyCustomMsg = { header: Header, color: RGBA };

export const inputs = ["/some_input"];
export const output = "/webviz_node/";

type Marker = {};
type MarkerArray = { markers: Marker[] };

const publisher = (message: Message<MyCustomMsg>): MarkerArray => {
  return { markers: [] };
};

export default publisher;
```
