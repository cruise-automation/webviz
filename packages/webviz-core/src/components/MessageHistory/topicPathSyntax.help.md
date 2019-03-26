# Topic path syntax

The topic path syntax can be used in several panels to find the exact messages in topics that you need.

- First you specify the topic name: `/some/topic`
- Then you point to the value within that topic, using dots: `/some/topic.some.deep.value`
- You can also index into an array, like this: `/some/topic.many.values[0].x`
- Slices are also allowed, and will return an array of values: `/some/topic.many.values[1:3].x` or even `/some/topic.many.values[:].x` to get all values.
- Filter on particular values, usually in combination with slices: `/some/topic.many.values[:]{some_id==123}.x` — for now only equality is supported.
- You can also filter on a global variable, which you can set in the Global Variables Panel: `/some/topic.many.values[:]{some_id==$my_custom_id}`

When filtering, you can use booleans: `{value==true}`; numbers: `{value==123}`; and strings `{value="foo"}`.

We don't support escaping quotation marks in strings, but you can use either single or double quotes, which should allow you to express most strings: `{value='string which has "some" double quotes'}`.
