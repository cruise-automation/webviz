// @flow
//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { isEqual } from "lodash";
import React, {
  useCallback,
  useRef,
  useLayoutEffect,
  useState,
  useContext,
  createContext,
  type ComponentType,
  type Context,
  type Node,
} from "react";
import shallowequal from "shallowequal";

export function usePreviousValue<T>(nextValue: T): ?T {
  const ref = useRef(undefined);
  const previous = ref.current;
  ref.current = nextValue;
  return previous;
}

// used to force a component to update
export function useForceUpdate() {
  const [, setTick] = useState(0);
  const update = useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);
  return update;
}

// Return initiallyTrue the first time, and again if any of the given deps have changed.
export function useChangeDetector(deps: any[], initiallyTrue: boolean) {
  const ref = useRef(initiallyTrue ? undefined : deps);
  const changed = !shallowequal(ref.current, deps);
  ref.current = deps;
  return changed;
}

// Similar to useChangeDetector, but using deep equality check
export function useDeepChangeDetector(deps: any[], initiallyTrue: boolean) {
  const ref = useRef(initiallyTrue ? undefined : deps);
  const changed = !isEqual(ref.current, deps);
  ref.current = deps;
  return changed;
}

// Continues to return the same instance as long as shallow equality is maintained.
export function useShallowMemo<T>(value: T): T {
  const ref = useRef(value);
  if (shallowequal(value, ref.current)) {
    return ref.current;
  }
  ref.current = value;
  return value;
}

// Continues to return the same instance as long as deep equality is maintained.
export function useDeepMemo<T>(value: T): T {
  const ref = useRef(value);
  if (isEqual(value, ref.current)) {
    return ref.current;
  }
  ref.current = value;
  return value;
}

function format(value: any): string {
  try {
    return JSON.stringify(value);
  } catch (err) {
    return "<unknown object>";
  }
}

// Throw an error if the given value changes between renders.
export function useMustNotChange<T>(value: T, message: string): T {
  const ref = useRef(value);
  if (value !== ref.current) {
    throw new Error(`${message}\nOld: ${format(ref.current)}\nNew: ${format(value)}`);
  }
  return value;
}

export function useGuaranteedContext<T>(contextType: Context<T>, debugContextName?: string): $NonMaybeType<T> {
  const context = useContext(contextType);
  if (context === null) {
    throw new Error(
      `useGuaranteedContext got null for contextType${debugContextName ? `: '${debugContextName}'` : ""}`
    );
  }
  return context;
}

// Log a warning if the given value changes twice in a row.
export function useShouldNotChangeOften<T>(value: T, warn: () => void): T {
  const prev = useRef(value);
  const prevPrev = useRef(value);
  const lastTime = useRef<number>(Date.now());
  if (value !== prev.current && prev.current !== prevPrev.current && Date.now() - lastTime.current < 200) {
    warn();
  }
  prevPrev.current = prev.current;
  prev.current = value;
  lastTime.current = Date.now();
  return value;
}

type SelectableContextHandle<T> = {
  currentValue(): T,
  publish(value: T): void,
  addSubscriber((T) => void): void,
  removeSubscriber((T) => void): void,
};

export type SelectableContext<T> = {|
  +Provider: ComponentType<{| value: T, children: ?Node |}>,
  +_ctx: Context<?SelectableContextHandle<T>>,
|};

// Create a context for use with useContextSelector
export function createSelectableContext<T>(): SelectableContext<T> {
  // Use a regular React context whose value never changes to provide access to the handle
  // from nested components' calls to useContextSelector.
  const ctx = createContext();

  function Provider({ value, children }) {
    const [handle] = useState(() => {
      let currentValue = value;
      const subscribers = new Set();
      return {
        publish(val) {
          currentValue = val;
          for (const sub of subscribers) {
            sub(currentValue);
          }
        },
        currentValue() {
          return currentValue;
        },
        addSubscriber(sub) {
          subscribers.add(sub);
        },
        removeSubscriber(sub) {
          subscribers.delete(sub);
        },
      };
    });

    const valueChanged = useChangeDetector([value], false);
    if (valueChanged) {
      handle.publish(value);
    }

    return <ctx.Provider value={handle}>{children}</ctx.Provider>;
  }

  return {
    Provider,
    _ctx: ctx,
  };
}

export opaque type BailoutToken = Symbol;
const BAILOUT: BailoutToken = Symbol("BAILOUT");

function isBailout(value: mixed): boolean %checks {
  // The opaque type above isn't enough to convince Flow that `=== BAILOUT` is a type check for
  // BailoutToken, so we have to lie and say that we check for any Symbol.
  return (value === useContextSelector.BAILOUT /*:: || value instanceof Symbol */);
}

// `useContextSelector(context, selector)` behaves like `selector(useContext(context))`, but
// only triggers a re-render when the selected value actually changes.
//
// Changing the selector will not cause the context to be re-processed, so the selector must
// not have external dependencies that change over time.
//
// `useContextSelector.BAILOUT` can be returned from the selector as a special sentinel that indicates
// no update should occur. (Returning BAILOUT from the first call to selector is not allowed.)
export function useContextSelector<T, U>(context: SelectableContext<T>, selector: (T) => U | BailoutToken): U {
  // eslint-disable-next-line no-underscore-dangle
  const handle = useContext(context._ctx);
  if (!handle) {
    throw new Error(`useContextSelector was used outside a corresponding <Provider />.`);
  }

  useShouldNotChangeOften(selector, () =>
    console.warn(
      "useContextSelector() selector is changing frequently. " +
        "Changing the selector will not cause the current context to be re-processed, " +
        "so you may have a bug if the selector depends on external state. " +
        "Wrap your selector in a useCallback() to silence this warning."
    )
  );

  const [selectedValue, setSelectedValue] = useState(() => {
    const value = selector(handle.currentValue());
    if (isBailout(value)) {
      throw new Error("Initial selector call must not return BAILOUT");
    }
    return value;
  });

  const latestSelectedValue = useRef();
  useLayoutEffect(() => {
    latestSelectedValue.current = selectedValue;
  });

  // Subscribe to context updates, and setSelectedValue() only when the selected value changes.
  useLayoutEffect(
    () => {
      const sub = (newValue) => {
        const newSelectedValue = selector(newValue);
        if (isBailout(newSelectedValue)) {
          return;
        }
        if (newSelectedValue !== latestSelectedValue.current) {
          // Because newSelectedValue might be a function, we have to always use the reducer form of setState.
          setSelectedValue(() => newSelectedValue);
        }
      };
      handle.addSubscriber(sub);
      return () => {
        handle.removeSubscriber(sub);
      };
    },
    [handle, selector]
  );

  return selectedValue;
}

useContextSelector.BAILOUT = BAILOUT;

// TODO(Audrey): move the hook to npm package
// `useReducedValue` produces a new state based on the previous state and new inputs.
// the new state is only set when inputs have changed based on deep comparison.
export function useReducedValue<Inputs: any[], State>(
  initialState: State,
  currentInputs: Inputs,
  reducer: (State, Inputs) => State
): State {
  useMustNotChange(reducer, "reducer for useReducedValue should never change");
  const prevStateRef = useRef(initialState);
  const inputChanged = useDeepChangeDetector(currentInputs, false);
  if (inputChanged) {
    prevStateRef.current = reducer(prevStateRef.current, currentInputs);
  }
  return prevStateRef.current;
}
