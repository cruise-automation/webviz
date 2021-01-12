#  Copyright (c) 2018-present, Cruise LLC
#
#  This source code is licensed under the Apache License, Version 2.0,
#  found in the LICENSE file in the root directory of this source tree.
#  You may not use this file except in compliance with the License.

# This grammar matches topic/message paths like this:
#
# /some/topic.sub_msgs[0].some_field
#
# The part with slashes is the topic name, and the part after that is the
# message path. This is a slight break from ROS convention, but makes it
# easier for both humans and computers to understand what's going on.
#
# For more examples, please see parseRosPath.test.js
main -> topicName messagePath:? modifier:?
  {% (d) => ({ topicName: d[0], messagePath: d[1] || [], modifier: d[2] }) %}

## Primitives

# A typical id like `some_thing_123`.
id -> [a-zA-Z0-9_]:+
  {% (d) => d[0].join("") %}

# Integer.
integer
   -> [0-9]:+      {% (d) => ({ value: parseInt(d[0].join("")), repr: d[0].join("") }) %}
    | "-" [0-9]:+  {% (d) => ({ value: -parseInt(d[1].join("")), repr: `-${d[1].join("")}` }) %}

# String of the form 'hi' or "hi". No escaping supported.
string
   -> "'" [^']:* "'"   {% (d) => ({ value: d[1].join(""), repr: `'${d[1].join("")}'` }) %}
    | "\"" [^"]:* "\"" {% (d) => ({ value: d[1].join(""), repr: `"${d[1].join("")}"` }) %}

variable -> "$" id:? {% (d, loc) => ({ value: {variableName: d[1] || "", startLoc: loc }, repr: `$${d[1] || ""}` }) %}

# An integer, string, or boolean.
value -> integer  {% (d) => d[0] %}
       | string  {% (d) => d[0] %}
       | "true"  {% (d) => ({ value: true, repr: "true" }) %}
       | "false" {% (d) => ({ value: false, repr: "false" }) %}
	   | variable {% (d) => d[0] %}

## Topic part. Basically an id but with slashes.
topicName -> slashID:+
  {% (d) => d[0].join("") %}
slashID -> "/" id:?
  {% (d) => d.join("") %}

## `messagePath` part.

# Multiple `messagePathElements`, optionally with an additional dot for autocomplete. When that
# extra dot is given, make sure to add an empty name field so the path will be marked as invalid,
# and the autocomplete is actually shown.
# Return type: `MessagePathPart[]`.
messagePath -> messagePathElement:* ".":?
  {% (d) => d[0].reduce((acc, arr) => acc.concat(arr), []).concat(d[1] ? [{ type: "name", name: "" }] : []) %}

# An element of the `messagePart`, of the form `field[10:20]{some_id==10}`.
# Multiple slices are not allowed (no 2d arrays in ROS).
# Return type: `MessagePathPart`.
messagePathElement ->
  "." name slice:? filter:? {% (d) => [d[1], d[2], d[3]].filter(x => x !== null) %}
  | filter {% id %}

# Name part is just an id, e.g. `field`.
name -> id
  {% (d) => ({ type: "name", name: d[0] }) %}

# Slice part; can be a single array index `[0]` or multiple `[0:10]`, or even infinite `[:]`.
sliceVal -> integer {% (d) => (d[0].value) %} | variable {% (d) => (d[0].value) %}
slice -> "[" sliceVal "]"
            {% (d) => ({ type: "slice", start: d[1], end: d[1] }) %}
       | "[" sliceVal:? ":" sliceVal:? "]"
            {% (d) => ({ type: "slice", start: d[1] === null ? 0 : d[1], end: d[3] === null ? Infinity : d[3] }) %}

# For now, filters only support simple "foo.bar.baz" paths, so we need a separate rule for this.
# TODO: it would be nice if filters supported arbitrary sub-paths, such as "/diagnostics{status[0].hardware_id=='bar'}".
simplePath -> id ("." id):* {% (d) => [d[0]].concat(d[1].map((d) => d[1])) %}

# Filter part; can be empty `{}` to allow for autocomplete. Can also be half-empty,
# like `{==0}`, also to allow for autocomplete.
filter -> "{" simplePath:? "}"
            {%
              (d, loc) => ({
                type: "filter",
                path: d[1] || [],
                value: undefined,
                nameLoc: loc+1,
                valueLoc: loc+1,
                repr: (d[1] || []).join("."),
              })
            %}
        | "{" simplePath:? "==" value "}"
            {%
              (d, loc) => ({
                type: "filter",
                path: d[1] || [],
                value: d[3].value,
                nameLoc: loc+1,
                valueLoc: loc+1+(d[1] || []).join(".").length+d[2].length,
                repr: `${(d[1] || []).join(".")}==${d[3].repr}`,
              })
            %}

## Modifier.
# Optional modifier at the end of a path, e.g. `.@derivative` or Math modifiers. Currently only used by the Plot
# panel, and we should either deprecate this or actually support it properly.
modifier -> ".@" id:?
  {% (d) => d[1] || "" %}
