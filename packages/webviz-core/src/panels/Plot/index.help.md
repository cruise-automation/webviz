# Plot

Plots arbitrary values from topics, similar to [rqt_plot](http://wiki.ros.org/rqt_plot).

The values plotted are specified through Webviz's [message path syntax](/help/message-path-syntax).

In the options menu, you can set a minimum and maximum Y-value. By default, the plot will use those bounds unless the data you're looking at extends above the max Y-value or below the min Y-value; in those cases it will automatically expand. If you want to disable this behavior and force the plot to use the exact minimum and maximum Y-values entered, you can "lock" the y-axis in the options menu as well.

There are 2 possible values for the x-axis - by the message's timestamp or by the message values' respective array indices.

## Timestamp as X-Axis

When you select to plot against a timestamp x-axis (default), you can specify whether the timestamp is taken from either the time the message was received, or the `message.header.stamp` field of the topic, in the dropdown displayed next to each line topic. All Plot panels' timestamped x-axes are kept in sync for easy comparison.

When you select multiple values (by using a slice) the plot turns into a scatter plot at each timestamp tick.

You can also enter an arbitrary number, which will add a horizontal line at that y-value.

To take the derivative of a value (change per second), use the special `.@derivative` modifier. This does not work with scatter plots (when using slices).

To plot the length of an array, use the `.@length` modifier at the end of the queried array.

To switch the sign of a value, use the special `.@negative` modifier at the end of the topic path syntax. The following math functions are also available: `.@abs`, `.@acos`, `.@asin`, `.@atan`, `.@ceil`, `.@cos`, `.@log`, `.@log1p`, `.@log2`, `.@log10`, `.@round`, `.@sign`, `.@sin`, `.@sqrt`, `.@tan`, and `.@trunc`. See the [Javascript Math documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math) for details on each one. Unit conversions `@rad2deg`, `@kph2mph`, `@mps2mph` and other orders/combinations are also available.

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
