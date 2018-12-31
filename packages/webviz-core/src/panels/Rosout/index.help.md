# Ros Out

The rosout panel prints out messages from the `/rosout` topic.  It keeps an internal scrollback buffer of the last 1000 messages.  Scrolling to the end of the panel will cause the panel to tail the output.  If you scroll back up, the tailing stops.

The content of the scrollback buffer can be filtered using the filter dropdowns at the top of the panel. These hide away when unused, so you need to hover over the top section of the panel to reveal them. There are three filtering options:
 - Minimum Severity: The left dropdown lets you set the minimum severity you care about in the logs (e.g minimum WARN)
 - Node Name: The right dropdown lets you select nodenames. If used, only messages from nodes that match one of the selected names will be shown. You can pick from the list or type free-form. The filter is a prefix filter, so for example, you can use `foo_` to show messages from both `/foo_0` and `/foo_1` topics.
 - Message: Using the node name filter, you can also prefix the name with `msg:` to filter by message content instead of node names. So for example: `msg:download` will filter messages that have the word "download" in them.

 Node name and message filters are "OR"s, so if you have two, it'll show messages that meet either. The severity is an "AND" with the node names / messages - I.e if a message is below the severity, it won't show up regardless of matching the name or content.
