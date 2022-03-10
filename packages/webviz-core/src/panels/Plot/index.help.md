# Plot

Plots arbitrary values from topics, similar to [rqt_plot](http://wiki.ros.org/rqt_plot).

The values plotted are specified through Webviz's [message path syntax](/help/message-path-syntax).

In the options menu, you can set a minimum and maximum Y-value. By default, the plot will use those bounds unless the data you're looking at extends above the max Y-value or below the min Y-value; in those cases it will automatically expand. If you want to disable this behavior and force the plot to use the exact minimum and maximum Y-values entered, you can "lock" the y-axis in the options menu as well.

There are 2 possible values for the x-axis - by the message's timestamp or by the message values' respective array indices.

## Timestamp as X-Axis

When you select to plot against a timestamp x-axis (default), you can specify whether the timestamp is taken from either the time the message was received, or the `message.header.stamp` field of the topic, in the dropdown displayed next to each line topic. All Plot panels' timestamped x-axes are kept in sync for easy comparison.

When you select multiple values (by using a slice) the plot turns into a scatter plot at each timestamp tick.

You can also enter an arbitrary number, which will add a horizontal line at that y-value.

You can use basic math syntax with formulas like `.@{x + 1}` or `.@{x / 1000}` or `.@{sin x + 5}`. The text will turn red if the syntax is invalid.

To take the derivative of a value (change per second), use the special `.@derivative` modifier. This does not work with scatter plots (when using slices).

To plot the length of an array, use the `.@length` modifier at the end of the queried array.

To switch the sign of a value, use the special `.@negative` modifier at the end of the topic path syntax. The following math functions are also available: `.@abs`, `.@acos`, `.@asin`, `.@atan`, `.@ceil`, `.@cos`, `.@log`, `.@log1p`, `.@log2`, `.@log10`, `.@round`, `.@sign`, `.@sin`, `.@sqrt`, `.@tan`, and `.@trunc`. See the [Javascript Math documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math) for details on each one. Unit conversions `@rad2deg`, `@kph2mph`, `@mps2mph` and other orders/combinations are also available.

`For a full list of operators, see the end of this file.`

## Array Index as X-Axis

In the legend, you can change the x-axis from being the messages' timestamps to their values' array indices. In this mode, adding message path `/some_topic.some_array` as a new line in the plot will chart that array's values against their indices. For example, if `/some_topic.some_array` contained the values `[5, 10, 15]`, the resulting points on the chart would be `[0, 5]`, `[1, 10]`, and `[2, 15]`.

This mode always plots just the data from the latest tick.

## Message Data as X-Axis

In the legend, set the x-axis mode to a "msg path" option to specify a path to the data to use for the plot's x-coordinates. For example, you could plot a line for `/some_topic.y`, with the x axis set to `/some_topic.x`.

To plot data from just the most recent tick, use the "msg path (current)" setting. To plot data from _all_ matching messages, use the "msg path (accumulated)" setting.

## User Interactions

You can zoom by scrolling, and pan by dragging. Double-click to reset.

By default, scrolling will zoom horizontally only. To zoom vertically, hold the `v` key while scrolling. To zoom both horizontally and vertically at the same time, hold the `b` key while scrolling.

Some "default zoom level" settings are available in the panel settings menu. The y-axis limits can be given fixed values for any plot type. For plots where the x-axis represents the message timestamp, you can have the plot "follow" playback by specifying the plot's "viewport" (i.e. width in seconds).

## Full list of math functionality

### Math constants

| Constants |
| --- |
| E |
| PI |

### Operator Precedence

| Operator | Associativity | Description |
| --- | --- | --- |
| (...) | None | Grouping |
| ! | Left | Factorial |
| ^ | Right | Exponentiation |
| +, -, not, sqrt, etc. | Right | Unary prefix operators (see below for the full list) |
| *, /, % | Left | Multiplication, division, remainder |
| ==, !=, >=, <=, >, <, in | Left | Equals, not equals, etc. "in" means "is the left operand included in the right array operand?" |
| and | Left | Logical AND |
| or | Left | Logical OR |
| x ? y : z | Right | Ternary conditional (if x then y else z) |

### Math operators

| Operator | Description |
| --- | --- |
| -x | Negation |
| +x | Unary plus. This converts it's operand to a number, but has no other effect. |
| x! | Factorial. gamma(x + 1) for non-integers. |
| abs x | Absolute value (magnitude) of x |
| acos x | Arc cosine of x (in radians) |
| acosh x | Hyperbolic arc cosine of x (in radians) |
| asin x | Arc sine of x (in radians) |
| asinh x | Hyperbolic arc sine of x (in radians) |
| atan x | Arc tangent of x (in radians) |
| atanh x | Hyperbolic arc tangent of x (in radians) |
| cbrt x | Cube root of x |
| ceil x | Ceiling of x — the smallest integer that’s >= x |
| cos x | Cosine of x (x is in radians) |
| cosh x | Hyperbolic cosine of x (x is in radians) |
| exp x | e^x (exponential/antilogarithm function with base e) |
| expm1 x | e^x - 1 |
| floor x | Floor of x — the largest integer that’s <= x |
| length x | String or array length of x |
| ln x | Natural logarithm of x |
| log x | Natural logarithm of x (synonym for ln, not base-10) |
| log10 x | Base-10 logarithm of x |
| log2 x | Base-2 logarithm of x |
| log1p x | Natural logarithm of (1 + x) |
| not x | Logical NOT operator |
| round x | X, rounded to the nearest integer, using "grade-school rounding" |
| sign x | Sign of x (-1, 0, or 1 for negative, zero, or positive respectively) |
| sin x | Sine of x (x is in radians) |
| sinh x | Hyperbolic sine of x (x is in radians) |
| sqrt x | Square root of x. Result is NaN (Not a Number) if x is negative. |
| tan x | Tangent of x (x is in radians) |
| tanh x | Hyperbolic tangent of x (x is in radians) |
| trunc x | Integral part of a X, looks like floor(x) unless for negative number |
