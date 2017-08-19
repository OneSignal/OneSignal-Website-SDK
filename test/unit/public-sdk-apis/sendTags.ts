import "../../support/polyfills/polyfills";
import test from "ava";

test.beforeEach(t => {
  t.context.sentTags = {
    'null': null,
    'undefined': undefined,
    'true': true,
    'false': false,
    'string': 'This is a string.',
    'number': 123456789,
    'decimal': 123456789.987654321,
    'array.empty': [],
    'array.one': [1],
    'array.multi': [1, 2, 3],
    'array.nested': [0, [1], [[2]]],
    'object.empty': {},
    'object.one': JSON.stringify({key: 'value'}),
    'object.multi': JSON.stringify({a: 1, b: 2, c: 3}),
    'object.nested': JSON.stringify({a0: 1, b0: {a1: 1, b1: 1}, c0: {a1: 1, b1: {a2: 1, b2: {a3: 1}}}})
  };

  t.context.expectedTags = {
    "number": "123456789",
    "true": "true",
    "false": "false",
    "string": "This is a string.",
    "decimal": "123456789.98765433",
    "array.one": "[1]",
    "array.multi": "[1, 2, 3]",
    "array.nested": "[0, [1], [[2]]]",
    "object.one": '{"key":"value"}',
    "object.multi": '{"a":1,"b":2,"c":3}',
    "object.nested": '{"a0":1,"b0":{"a1":1,"b1":1},"c0":{"a1":1,"b1":{"a2":1,"b2":{"a3":1}}}}'
  };

  t.context.expectedTagsUnsent = ['null', 'undefined', 'array.empty', 'object.empty'];

  t.context.tagsToCheckDeepEqual = Object.keys(t.context.sentTags).filter(x => t.context.expectedTagsUnsent.concat(['string', 'false']).indexOf(x) < 0);
});

test.todo("todo later");
