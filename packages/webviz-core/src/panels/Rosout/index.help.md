# rosout

Displays messages from the `/rosout` topic. The messages can be filtered using the filter dropdowns at the top of the panel. These hide away when unused, so you need to hover over the top section of the panel to reveal them. There are two filtering options:

- Minimum Severity: The left dropdown lets you choose a severity below which to hide messages.
- Node Name/Message: The text field lets you add search terms by which to filter the log messages. The filter applies to both node names and message text.

Node name and message filters are "OR"ed, so if you have two, it'll show messages that meet either. The severity is an "AND" with the node names / messages &mdash; if a message is below the minimum severity, it won't show up regardless of matching the name or content.
