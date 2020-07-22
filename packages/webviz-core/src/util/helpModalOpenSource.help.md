# Help and Resources

**Welcome to Webviz!** Use this tool to visualize a live or recorded [ROS system](https://www.ros.org/). If you're curious to see how this works, try this page with the [`?demo` parameter](?demo).

## Quick links

- [GitHub](https://github.com/cruise-automation/webviz)
- [webviz.io](http://webviz.io/)
- [Worldview](https://webviz.io/worldview/)
- [Cruise](http://getcruise.com/)

## Websocket

By default we try connect to a [rosbridge_server](http://wiki.ros.org/rosbridge_suite/Tutorials/RunningRosbridge) using a WebSocket on `ws://localhost:9090`. If you want to use a different URL, use the `?rosbridge-websocket-url=…` parameter. For example, to connect to `ws://localhost:4321`, use [this URL](?rosbridge-websocket-url=ws://localhost:4321). If you're using a more complex URL, it'd be good to [url-encode](https://www.urlencoder.io/) it, for example [like this](?rosbridge-websocket-url=ws%3A%2F%2Flocalhost%3A4321). This also applies to other parameters mentioned below.

At the time of writing we're testing our Websocket implementation against version 0.11.8 of the rosbridge server, using [ROS Melodic](http://wiki.ros.org/melodic).

## Local bag

If no WebSocket is found, you can instead drag and drop a bag into the page. You can drag a second bag while holding the `SHIFT` key. The topics of the second bag will be prefixed with `/webviz_source_2`.

## Remote bag

To stream in a bag, use the `?remote-bag-url=…` parameter, [like this](?remote-bag-url=https%3A%2F%2Fopen-source-webviz-ui.s3.amazonaws.com%2Fdemo.bag). To stream in a second bag (similar to the SHIFT-drag from above), use `?remote-bag-url-2=…`. To navigate to a particular point in the bag on load, add in `&seek-to=12345` (in milliseconds since the [Unix epoch](https://en.wikipedia.org/wiki/Unix_time)).

## Layouts

You can also load a layout from a URL. This can be useful when you have a system that links to Webviz pages, and you know what kind of layout is useful for each link. You can even have a server that dynamically generates a layout based on the URL. Use the `?layout-url=` parameter, for example [like this](?layout-url=https%3A%2F%2Fopen-source-webviz-ui.s3.amazonaws.com%2FdemoLayout.json).

If you just want to set some global variables from the URL, then use the `?global-variables=…` with URL-encoded JSON. Create a variable in the Global Variables panel to see an example URL.

Be sure to set the right [CORS headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) on remote bags and layouts, so Webviz is actually allowed to read them. For remote bags we also require the server to support [range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests) (which should be supported by all major cloud providers). If the headers are not properly configured you might encounter an error, which should have more details on how to fix things.
