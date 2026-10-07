# Diagnose a failing standard case

How to find out why a case of `basictest` fails and what to change in
the plugin. The cases and their checks are listed in
[Cases in order](../reference/messages.md#cases-in-order); the error
object is described in
[The reported error](../reference/functions.md#the-reported-error).

## 1. Read the reported error

The error passed to the completion callback names the failing case in
`err.cache_test_case` and at the start of its message. It is one of
four kinds. The examples are real output from Seneca 4.0.0-rc5.

A check failed (`code: 'ERR_ASSERTION'`, with `actual` and `expected`):

```
AssertionError [ERR_ASSERTION]: cache-test basictest/incr1: null == false
    ...
  code: 'ERR_ASSERTION',
  actual: null,
  expected: false,
  operator: '==',
  cache_test_case: 'basictest/incr1'
```

The plugin replied with an error where a result was expected (`code` is
the plugin's own code, or absent):

```
cache-test basictest/set0: seneca: Key a-0.4316403329213036 exists.
  code: 'key_exists'
```

Seneca raised an error about the plugin's behaviour (`code` is a Seneca
code):

| Code | Message (shortened) | Meaning |
| ---- | ------------------- | ------- |
| `act_not_found` | `No matching action pattern found for { key: 'a-0.48', role: 'cache', cmd: 'delete' }, and no default result provided` | The plugin has no action for that pattern, or was not loaded. |
| `result_not_objarr` | `Action cmd:set,role:cache responded with result that was not an object or array: a-0.43; Use option strict:{result:false} to allow` | The action replied with a string or number instead of an object. |
| `action_timeout` | `Action cmd:clear,role:cache timed out. Timeout was: 22222` | The action never called `reply`. |

A reply was `null` where an object was expected:

```
cache-test basictest/get0: Cannot read properties of null (reading 'value')
```

## 2. Find the case

Look the case up in [Cases in order](../reference/messages.md#cases-in-order).
The table gives the messages the case sends, in order, and the exact
check. The message pages above it give the full contract for each
pattern.

## 3. Reproduce the message on its own

Send the same message from a small script, with every message logged:

```js
const Seneca = require('seneca')
const my_cache = require('..')

const seneca = Seneca().test('print').use(my_cache)

seneca.ready(function () {
  const key = 'q-' + Math.random() // never set, as in case incr1
  seneca.act('role:cache,cmd:incr', { key: key, val: 1 }, function (err, out) {
    console.log('err:', err && err.message)
    console.log('out:', out)
    seneca.close()
  })
})
```

`test('print')` logs each message as it goes in and each reply as it
comes out, so you can see what the action received and what it replied.

## 4. Common causes

| Case | Symptom | Cause and fix |
| ---- | ------- | ------------- |
| `init0`, `act_not_found` | no action for `cmd:delete` | The plugin is not loaded on the instance passed to `basictest`, or a pattern is missing. Load it with `seneca.use(plugin)` before calling `basictest`; add all eight patterns. |
| `set0`, `result_not_objarr` | `responded with result that was not an object` | `cmd:set` replies with the key as a string. Reply `{ key: msg.key }`. |
| `get0`, `TypeError` | `Cannot read properties of null` | `cmd:get` replies `null`. Reply `{ value: undefined }` (or `{}`) for a missing key. |
| `get0`, `'1' == 1` style mismatch | `actual` has the right digits but a different type | Passes: the checks use loose equality, so a cache that stores strings is fine. If it fails, the value was transformed (for example JSON encoded twice). |
| `refuse_existing0` | `cmd:add replied without an error for an existing key` | `cmd:add` overwrote or ignored the existing key. Reply with an error when the key exists, and leave the value unchanged. |
| `refuse_existing0`, `2 == 'something'` | the add was refused but the value changed | The error was replied after the write. Check existence before writing. |
| `incr1`, `null == false` | `cmd:incr` on an unknown key replies `null` or `undefined` | Reply `{ value: false }` when the key does not exist. |
| `incr0`, `'24' == 6` | string concatenation | The stored value is a string and `+` concatenated. Convert to a number before adding. |
| `delete3` or `clear`, `null == false` fails | `cmd:get` replies `{ value: false }` for a missing key | After `delete` and after `clear`, `get` must reply `value` `null` or `undefined`. |
| `clear`, `action_timeout` | the run stalls for 22 seconds, then fails | `cmd:clear` never calls `reply()`. Call `reply()` when the flush completes. |
| `native0` | `undefined` or `null` reply | `get:native` must reply with the cache object or client (truthy). |

## 5. The run stalls

`node:test`, `jest` and `mocha` wait as long as their own timeout
allows; `node:test` has none by default. An action that never replies is
failed by Seneca after its `timeout` option, 22222 milliseconds by
default, with `action_timeout`, and the run then reports that case. To
fail faster while debugging:

```js
const seneca = Seneca({ timeout: 2000 }).test().quiet().use(my_cache)
```

Check that every code path in the action calls `reply`, including error
paths of the underlying client, and that the cache server is reachable.

## 6. The process does not exit

The run passed but the test process stays alive: the plugin holds a
connection that is not released on `seneca.close()`.

* Close the instance in the completion callback: `seneca.close(done)`.
* Release the client in a close hook. Seneca 4 closes through
  `sys:seneca,cmd:close`; a hook on the Seneca 3 pattern
  `role:seneca,cmd:close` is not called on Seneca 4.0.0-rc5. See
  [Close hooks](test-on-seneca-3-and-4.md#close-hooks).

## Seneca 3 differences

On Seneca 3 (default `legacy.error: true`) an error replied by the
plugin reaches the callback wrapped: the message reads
`seneca: Action role:cache,cmd:add failed: Key x exists.` and the
plugin's error is `err.orig`. On Seneca 4 the plugin's error arrives as
it is. The cases do not depend on this, since they only require that an
error is replied; your own assertions on messages should use
`(err.orig || err).message` when they must run on both versions.
