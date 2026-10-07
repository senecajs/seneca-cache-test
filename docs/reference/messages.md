# Messages

Every message that `basictest` sends to the plugin under test, the reply
it expects, and every case in the order it runs. The function that runs
them is described in the [Functions reference](functions.md).

All messages have `role:cache`. The plugin must add an action for each
of the eight patterns below; a missing pattern fails the first case that
uses it with Seneca's `act_not_found` error.

## How replies are checked

The cases use the Node.js `assert` module:

| Check | Meaning |
| ----- | ------- |
| `assert.equal(a, b)` | loose equality (`==`): `'1' == 1` passes, `null == false` fails, `null == undefined` passes |
| `assert.ok(x)` | `x` is truthy |
| `assert.ok(!x)` | `x` is falsy (`false`, `0`, `''`, `null`, `undefined`) |
| `assert.ok(null == x)` | `x` is `null` or `undefined` |

Replies must be objects. Seneca itself rejects a scalar reply (a string
or a number) with the error `result_not_objarr` unless the instance is
configured with `strict: { result: false }`; the official plugins reply
with objects.

## Keys and values

Each run generates five random keys: `a-<random>`, `b-<random>`,
`c-<random>`, `q-<random>` and `z-<random>`, where `<random>` is a
`Math.random()` number. `q-` is never set, so that `cmd:incr` on an
unknown key can be tested. Values are the strings `'1'` and `'3'`, the
numbers `0`, `2`, and the string `'something'`.

## `role:cache,cmd:set`

Store a value under a key, replacing any existing value.

| | |
| - | - |
| Parameters | `key` (string), `val` (any JSON value; the cases use strings and numbers) |
| Expected reply | an object whose `key` property equals `key`; for `val: 0` the cases only require a truthy reply |
| Cases | `set0`, `set_c`, `val0` |

## `role:cache,cmd:get`

Read a value.

| | |
| - | - |
| Parameters | `key` (string) |
| Expected reply | an object whose `value` property is the stored value. For an unknown or deleted key, `value` must be `null` or `undefined` (the cases `delete3` and `clear` check `null == value`; `{ value: false }` fails them). |
| Cases | `get0`, `refuse_existing0`, `delete0`, `delete1`, `delete3`, `clear` |

## `role:cache,cmd:add`

Store a value only if the key does not exist.

| | |
| - | - |
| Parameters | `key` (string), `val` (any JSON value) |
| Expected reply | an object whose `key` property equals `key` when the key was new. When the key exists: an error reply (any error; the official plugins use the code `key_exists`), and the stored value must not change. |
| Cases | `add0`, `refuse_existing0` |

## `role:cache,cmd:delete`

Remove a key. Deleting an unknown key is not an error.

| | |
| - | - |
| Parameters | `key` (string) |
| Expected reply | no error; a truthy reply such as `{ key }` where the cases check it (`delete0`, `delete1`, `delete3`); `init0` ignores the reply |
| Cases | `init0`, `delete0`, `delete1`, `delete3` |

## `role:cache,cmd:incr`

Add `val` to a numeric value.

| | |
| - | - |
| Parameters | `key` (string), `val` (number) |
| Expected reply | an object whose `value` property is the new value (`2 + 4` gives `{ value: 6 }`). For an unknown key, `{ value: false }` (loose equality with `false`: `0` would also pass, `null` and `undefined` do not). For `0 + 1` the case only requires a truthy reply. |
| Cases | `incr0`, `incr1`, `val0` |

## `role:cache,cmd:decr`

Subtract `val` from a numeric value.

| | |
| - | - |
| Parameters | `key` (string), `val` (number) |
| Expected reply | an object whose `value` property is the new value (`6 - 3` gives `{ value: 3 }`) |
| Cases | `decr0` |

## `role:cache,cmd:clear`

Remove every key.

| | |
| - | - |
| Parameters | none (the message is `{ role: 'cache', cmd: 'clear' }`) |
| Expected reply | no error; the reply value is ignored. Afterwards `cmd:get` for a key set earlier must reply with `value` `null` or `undefined`. |
| Cases | `clear` |

## `role:cache,get:native`

Expose the underlying cache object or client, for plugin specific tests.

| | |
| - | - |
| Parameters | none |
| Expected reply | any truthy value (an object: a `Map`, an LRU cache, a Redis client) |
| Cases | `native0` |

## Cases in order

`ka`, `kb`, `kc`, `kq` and `kz` are the five random keys. A case fails
when a message replies with an error (except where an error is
expected) or when a check fails; the run stops at the first failure.

| Case | Messages sent | Checks |
| ---- | ------------- | ------ |
| `init0` | `cmd:delete {key: ka}`, `cmd:delete {key: kb}`, `cmd:delete {key: kc}` | no error |
| `set0` | `cmd:set {key: ka, val: '1'}` | `reply.key == ka` |
| `set_c` | `cmd:set {key: kc, val: '3'}` | `reply.key == kc` |
| `get0` | `cmd:get {key: ka}` | `reply.value == '1'` |
| `add0` | `cmd:add {key: kb, val: 2}` | `reply.key == kb` |
| `refuse_existing0` | `cmd:add {key: kb, val: 'something'}`, then `cmd:get {key: kb}` | the add replies with an error; `reply.value == 2` |
| `incr0` | `cmd:incr {key: kb, val: 4}` | `reply.value == 6` |
| `incr1` | `cmd:incr {key: kq, val: 1}` (unknown key) | `reply.value == false` |
| `decr0` | `cmd:decr {key: kb, val: 3}` | `reply.value == 3` |
| `val0` | `cmd:set {key: kz, val: 0}`, then `cmd:incr {key: kz, val: 1}` | both replies truthy |
| `delete0` | `cmd:delete {key: ka}`, then `cmd:get {key: ka}` | delete reply truthy; `!reply.value` |
| `delete1` | `cmd:delete {key: kb}`, then `cmd:get {key: kb}` | delete reply truthy; `!reply.value` |
| `delete3` | `cmd:delete {key: kz}`, then `cmd:get {key: kz}` | delete reply truthy; `null == reply.value` |
| `clear` | `cmd:clear`, then `cmd:get {key: kc}` | no error; `null == reply.value` |
| `native0` | `get:native` | reply truthy |

State at the end of a run: `ka`, `kb`, `kc` and `kz` are deleted and the
cache has been cleared. A run clears the whole cache, so do not run the
cases against a cache server that holds data you need.
