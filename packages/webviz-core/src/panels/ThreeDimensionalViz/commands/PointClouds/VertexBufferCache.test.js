// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { VertexBuffer, MemoizedVertexBuffer } from "./types";
import VertexBufferCache from "./VertexBufferCache";

function reglBuffer(data: Float32Array) {
  const buffer: {|
    data?: ?Float32Array,
  |} = {
    data,
  };
  return {
    buffer,
    destroy: () => {
      buffer.data = null;
    },
  };
}

const makeVertexBuffer = () => {
  return {
    buffer: new Float32Array([1, 2, 3, 4]),
    offset: 0,
    stride: 4,
  };
};

const makeMemoizedVertexBuffer = (vertexBuffer: VertexBuffer): MemoizedVertexBuffer => {
  const { buffer, offset, stride } = vertexBuffer;
  return {
    vertexBuffer,
    buffer: reglBuffer(buffer),
    offset,
    stride,
    divisor: 0,
  };
};

describe("VertexBufferCache", () => {
  it("memoizes a vertex buffer", () => {
    const cache = new VertexBufferCache();

    const vertexBuffer = makeVertexBuffer();
    const memoized = makeMemoizedVertexBuffer(vertexBuffer);

    expect(cache.get(vertexBuffer)).toBeNull();
    cache.set(vertexBuffer, memoized);
    expect(cache.get(vertexBuffer)).toBe(memoized);
  });

  it("does not delete data if setting same value twice", () => {
    const cache = new VertexBufferCache();

    const vertexBuffer = makeVertexBuffer();
    const memoized = makeMemoizedVertexBuffer(vertexBuffer);

    expect(cache.get(vertexBuffer)).toBeNull();
    cache.set(vertexBuffer, memoized);
    expect(cache.get(vertexBuffer)).toBe(memoized);

    // Set same value again
    cache.set(vertexBuffer, memoized);
    expect(memoized.buffer.buffer.data).not.toBeNull();
  });

  it("overrides a vertex buffer and destroys data", () => {
    const cache = new VertexBufferCache();

    const vertexBuffer = makeVertexBuffer();
    const memo1 = makeMemoizedVertexBuffer(vertexBuffer);
    const memo2 = makeMemoizedVertexBuffer(vertexBuffer);

    expect(cache.get(vertexBuffer)).toBeNull();
    cache.set(vertexBuffer, memo1);
    expect(cache.get(vertexBuffer)).toBe(memo1);
    cache.set(vertexBuffer, memo2);
    expect(cache.get(vertexBuffer)).toBe(memo2);

    // Destroys memo1 data since it's no longer cached
    expect(memo1.buffer.buffer.data).toBeNull();
  });

  it("persists vertex buffers in between frames", () => {
    const cache = new VertexBufferCache();

    const vertexBuffer = makeVertexBuffer();
    const memoized = makeMemoizedVertexBuffer(vertexBuffer);

    // Frame 0: VB does not exist
    cache.onPreRender();
    expect(cache.get(vertexBuffer)).toBeNull();
    cache.onPostRender();

    // Frame 1: VB is created
    cache.onPreRender();
    cache.set(vertexBuffer, memoized);
    cache.onPostRender();

    // Frame 2: VB is read
    cache.onPreRender();
    expect(cache.get(vertexBuffer)).toBe(memoized);
    expect(memoized.buffer.buffer.data).not.toBeNull();
    cache.onPostRender();

    // Frame 3: VB is read
    cache.onPreRender();
    expect(cache.get(vertexBuffer)).toBe(memoized);
    expect(memoized.buffer.buffer.data).not.toBeNull();
    cache.onPostRender();
  });

  it("removes vertex buffer from cache when it's no longer used and destroys its regl buffer", () => {
    const cache = new VertexBufferCache();

    const vertexBuffer = makeVertexBuffer();
    const memoized = makeMemoizedVertexBuffer(vertexBuffer);

    // Frame 0: VB does not exist
    cache.onPreRender();
    expect(cache.get(vertexBuffer)).toBeNull();
    cache.onPostRender();

    // Frame 1: VB is created
    cache.onPreRender();
    cache.set(vertexBuffer, memoized);
    cache.onPostRender();

    // Frame 2: VB is read
    cache.onPreRender();
    expect(cache.get(vertexBuffer)).toBe(memoized);
    expect(memoized.buffer.data).not.toBeNull();
    cache.onPostRender();

    // Frame 3: VB is not read
    cache.onPreRender();
    cache.onPostRender();

    // Frame 4: VB is no longer cached and it's data has been erased
    cache.onPreRender();
    expect(cache.get(vertexBuffer)).toBeNull();
    expect(memoized.buffer.buffer.data).toBeNull();
    cache.onPostRender();
  });

  it("handles different instances with same content", () => {
    const cache = new VertexBufferCache();

    const vb1 = makeVertexBuffer();
    const vb2 = makeVertexBuffer();
    expect(vb1).not.toBe(vb2);

    const memoVB1 = makeMemoizedVertexBuffer(vb1);
    const memoVB2 = makeMemoizedVertexBuffer(vb2);
    expect(memoVB1).not.toBe(memoVB2);

    cache.onPreRender();
    cache.set(vb1, memoVB1);
    cache.set(vb2, memoVB2);
    cache.onPostRender();

    cache.onPreRender();
    expect(cache.get(vb1)).toBe(memoVB1);
    expect(cache.get(vb2)).toBe(memoVB2);
    cache.onPostRender();
  });

  it("overrides when vertex buffer changes", () => {
    const cache = new VertexBufferCache();

    const vb = makeVertexBuffer();
    const vbMemo1 = makeMemoizedVertexBuffer(vb);

    cache.onPreRender();
    cache.set(vb, vbMemo1);
    cache.onPostRender();

    // change data
    vb.buffer = new Float32Array([1, 2, 3, 4, 5]);
    const vbMemo2 = makeMemoizedVertexBuffer(vb);
    expect(vbMemo2).not.toBe(vbMemo1);

    cache.onPreRender();
    expect(cache.get(vb)).toBeNull();
    cache.set(vb, vbMemo2);
    cache.onPostRender();

    expect(vbMemo1.buffer.buffer.data).toBeNull();
  });
});
