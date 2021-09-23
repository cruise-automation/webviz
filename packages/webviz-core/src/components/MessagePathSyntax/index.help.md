# Message path syntax

The message path syntax can be used in several panels to find the exact messages in topics that you need.

- First you specify the topic name: `/some/topic`
- Then you point to the value within that topic, using dots: `/some/topic.some.deep.value`
- You can also index into an array, like this: `/some/topic.many.values[0].x`
- Slices are also allowed, and will return an array of values: `/some/topic.many.values[1:3].x` or even `/some/topic.many.values[:].x` to get all values.
- Negative slices are allowed, and work backwards from the end of the array, e.g. `[-1]` to get the last element, or `[-2:-1]` to get the last two elements.
- You can also slice on a global variable, which you can set in the Global Variables Panel: `/some/topic.many.values[$my_custom_start_idx:$my_custom_end_idx]`
- Filter on particular values, usually in combination with slices: `/some/topic.many.values[:]{some_id==123}.x` — for now only equality is supported.
- You can also filter on a global variable, which you can set in the Global Variables Panel: `/some/topic.many.values[:]{some_id==$my_custom_id}`
- Filters can be applied to fields in the top-level message, in which case entire messages that don't match the filter will be skipped: `/some/topic{foo.bar==123}`
- You can use multiple filters at once, in which case only messages that satisfy all filters will be returned (like an "and" expression): `/some/topic.many.values[:]{a==1}{b==2}.x`

When filtering, you can use booleans `{value==true}`; numbers `{value==123}`; and strings `{value=="foo"}`.

We don't support escaping quotation marks in strings, but you can use either single or double quotes, which should allow you to express most strings: `{value='string which has "some" double quotes'}`.

The message path algorithm will return values when messages' structure disagrees with the message definitions associated with their topics. This can happen for a couple of reasons:

- Webviz often indexes datatypes by name, and different datatypes can have the same name.
- Webviz flattens out the ROS "connection" concept, so messages on the same topic can technically have different definitions (and even different datatype names.)
