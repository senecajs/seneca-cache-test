# Add the standard tests to your cache plugin

In this tutorial you write a small in-memory cache plugin for Seneca,
run the standard cache tests against it with the Node.js test runner,
and read the report of a failing case. At the end you have a plugin
that answers the `role:cache` messages the way the official cache
plugins do, and a test that proves it.

The finished files are in [examples](../examples/): `mem-cache.js` and
`cache.test.js`. The output shown below is from running them with
Node.js 24.21.0 and `seneca@4.0.0-rc5`.

## Before you start

You need Node.js 22 or later and an empty directory with a
`package.json` (`npm init -y`). Install Seneca and the test cases:

```sh
npm install --save-dev seneca@^4.0.0-rc5 @seneca/cache-test
```

Seneca 3 works as well; see
[Test a cache plugin on Seneca 3 and 4](../how-to/test-on-seneca-3-and-4.md).

## 1. The messages a cache plugin answers

A cache plugin adds an action for each of these eight patterns. The
standard tests send them in a fixed order and check the replies.

| Message | Reply |
| ------- | ----- |
| `role:cache,cmd:set` `{ key, val }` | `{ key }` |
| `role:cache,cmd:get` `{ key }` | `{ value }`; `value` is `undefined` for an unknown key |
| `role:cache,cmd:add` `{ key, val }` | `{ key }`, or an error if the key exists |
| `role:cache,cmd:delete` `{ key }` | `{ key }` |
| `role:cache,cmd:incr` `{ key, val }` | `{ value }` with the new number; `{ value: false }` for an unknown key |
| `role:cache,cmd:decr` `{ key, val }` | `{ value }` with the new number |
| `role:cache,cmd:clear` | nothing; every key is gone |
| `role:cache,get:native` | the underlying cache object |

The full contract, with every check, is in the
[Messages reference](../reference/messages.md).

## 2. Write the plugin

Create `mem-cache.js`:

```js
/* Copyright (c) 2026 Richard Rodger and other contributors, MIT License */
'use strict'

// An in-memory cache plugin for Seneca that satisfies the standard cache
// tests (@seneca/cache-test). Companion to docs/tutorials/add-the-standard-tests.md.
//
// Run this file directly for a short demonstration:
//
//   node docs/examples/mem-cache.js

module.exports = mem_cache

mem_cache.errors = {
  key_exists: 'Key <%=key%> exists.',
  not_a_number: 'Value for key <%=key%> is not a number: <%=value%>.',
}

function mem_cache(options) {
  const seneca = this
  const store = new Map()

  seneca
    .add('role:cache,cmd:set', function (msg, reply) {
      store.set(msg.key, msg.val)
      reply({ key: msg.key })
    })

    .add('role:cache,cmd:get', function (msg, reply) {
      reply({ value: store.get(msg.key) })
    })

    .add('role:cache,cmd:add', function (msg, reply) {
      if (store.has(msg.key)) {
        return this.fail('key_exists', { key: msg.key })
      }
      store.set(msg.key, msg.val)
      reply({ key: msg.key })
    })

    .add('role:cache,cmd:delete', function (msg, reply) {
      store.delete(msg.key)
      reply({ key: msg.key })
    })

    .add('role:cache,cmd:incr', incrdecr(1))
    .add('role:cache,cmd:decr', incrdecr(-1))

    .add('role:cache,cmd:clear', function (msg, reply) {
      store.clear()
      reply()
    })

    .add('role:cache,get:native', function (msg, reply) {
      reply(store)
    })

  function incrdecr(direction) {
    return function (msg, reply) {
      const current = store.get(msg.key)

      // An unknown key is not an error: the reply says the value is false.
      if (null == current) return reply({ value: false })

      if ('number' !== typeof current) {
        return this.fail('not_a_number', { key: msg.key, value: current })
      }

      const value = current + direction * msg.val
      store.set(msg.key, value)
      reply({ value: value })
    }
  }

  return { name: 'mem-cache' }
}
```

Points to notice:

* A Seneca plugin is a function that takes `options` and adds actions
  with `this.add`. It returns its name. It must take exactly one
  parameter: Seneca 4 rejects the older two parameter form.
* `mem_cache.errors` defines the plugin's error codes. `this.fail(code,
  details)` throws an error with that code; Seneca turns it into an
  error reply. The `<%=key%>` placeholder is filled from `details`.
* Every reply is an object: `{ key }` or `{ value }`. Seneca rejects a
  bare string or number as a reply.
* `cmd:incr` on an unknown key replies `{ value: false }` instead of an
  error. A missing counter is a normal condition for a cache.
* `cmd:get` for a missing key replies `{ value: undefined }`, which the
  tests accept as "no value". `{ value: false }` would not pass every
  case: see [`role:cache,cmd:get`](../reference/messages.md#rolecachecmdget).

## 3. Try it

Add a short demonstration at the end of `mem-cache.js`, so that the
file can be run directly:

```js
if (require.main === module) {
  const Seneca = require('seneca')

  demo().catch(function (err) {
    console.error(err)
    process.exit(1)
  })

  async function demo() {
    // quiet(): the refused add below is logged at level error otherwise
    const seneca = Seneca().test().quiet().use(mem_cache)

    // Callback form: `await seneca.ready()` hangs on an idle 4.0.0-rc5 instance
    await new Promise(function (resolve) {
      seneca.ready(resolve)
    })

    console.log(
      await seneca.post('role:cache,cmd:set', { key: 'color', val: 'red' }),
    )
    console.log(await seneca.post('role:cache,cmd:get', { key: 'color' }))
    console.log(
      await seneca.post('role:cache,cmd:add', { key: 'count', val: 1 }),
    )
    console.log(
      await seneca.post('role:cache,cmd:incr', { key: 'count', val: 2 }),
    )
    console.log(
      await seneca.post('role:cache,cmd:incr', { key: 'unknown', val: 1 }),
    )

    try {
      await seneca.post('role:cache,cmd:add', { key: 'color', val: 'blue' })
    } catch (err) {
      console.log(err.code, '->', err.message)
    }

    await seneca.close()
  }
}
```

`seneca.post` is the promise form of `act`, built into Seneca 4. Run it:

```sh
node mem-cache.js
```

```
{ key: 'color' }
{ value: 'red' }
{ key: 'count' }
{ value: 3 }
{ value: false }
key_exists -> seneca: Key color exists.
```

The first `add` stores `count`, so `incr` makes it `3`; `incr` on the
unknown key replies `false`; the second `add` on `color` is refused with
the plugin's own error code. On Seneca 4 the caller receives the
plugin's error object as it is, so `err.code` is `key_exists`.

## 4. Add the standard tests

Create `cache.test.js` next to the plugin:

```js
/* Copyright (c) 2026 Richard Rodger and other contributors, MIT License */
'use strict'

// The standard cache tests, run against the in-memory plugin with the
// Node.js test runner. Companion to docs/tutorials/add-the-standard-tests.md.
//
//   node --test docs/examples/cache.test.js

const { test } = require('node:test')

const Seneca = require('seneca')
const CacheTest = require('@seneca/cache-test')

const mem_cache = require('./mem-cache')

test('standard cache tests', function (t, done) {
  // quiet(): the refuse_existing0 case provokes one error, which test mode
  // would otherwise log. Do not pass `done` to test(): that would turn the
  // expected error into a test failure.
  const seneca = Seneca().test().quiet().use(mem_cache)

  CacheTest.basictest(seneca, function (err) {
    if (err) return done(err)
    seneca.close(done)
  })
})
```

Line by line:

* `Seneca().test()` turns on test mode: readable logs at level `warn`
  and the calling code location in errors.
* `.quiet()` turns logging off. Without it, the one error the tests
  expect (`cmd:add` on an existing key) prints a long log entry.
* `.use(mem_cache)` loads the plugin. `basictest` waits for it to be
  ready before sending the first message.
* `CacheTest.basictest(seneca, callback)` runs the cases. The callback
  receives the first failure, or `null` when all cases passed.
* `seneca.close(done)` closes the instance and ends the test. Closing
  lets the process exit; a plugin for a cache server releases its
  connection here.
* `Seneca().test(done)` would also work for most plugin tests, but not
  here: the expected error would be routed to `done` and fail the test.

## 5. Run them

```sh
node --test cache.test.js
```

```
✔ standard cache tests (272.594238ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 408.214581
```

Make it the test script of the package:

```json
{
  "scripts": {
    "test": "node --test cache.test.js"
  }
}
```

On Node.js 22 the output is in TAP format when it is not written to a
terminal; the result is the same.

## 6. Break it on purpose

Change one line in `incrdecr` in `mem-cache.js`, so that an unknown key
replies with `null` instead of `false`:

```js
if (null == current) return reply({ value: null })
```

Run the test again (paths shortened):

```
✖ standard cache tests (177.826855ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 321.593339

✖ failing tests:

test at cache.test.js:16:1
✖ standard cache tests (177.826855ms)
  AssertionError [ERR_ASSERTION]: cache-test basictest/incr1: null == false
      at node_modules/@seneca/cache-test/cache-test.js:139:24
      at check (node_modules/@seneca/cache-test/cache-test.js:287:5)
      at Seneca.<anonymous> (node_modules/@seneca/cache-test/cache-test.js:138:15)
      at Object.handle_reply (node_modules/seneca/lib/act.js:171:23)
      at Seneca.action_reply (node_modules/seneca/lib/act.js:72:28)
      at Seneca.<anonymous> (mem-cache.js:62:35)
      at Object.execute_action (node_modules/seneca/lib/act.js:241:28)
      at Object.act_fn [as fn] (node_modules/seneca/lib/act.js:77:31)
      at Immediate.processor [as _onImmediate] (node_modules/gate-executor/gate-executor.js:101:22)
      at process.processImmediate (node:internal/timers:574:21) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: null,
    expected: false,
    operator: '==',
    diff: 'simple',
    cache_test_case: 'basictest/incr1'
  }
```

How to read it:

* `cache_test_case: 'basictest/incr1'` names the failing case. The
  [Cases in order](../reference/messages.md#cases-in-order) table says
  that `incr1` sends `cmd:incr` for a key that was never set and expects
  `reply.value == false`.
* `actual: null, expected: false` is the check that failed, with the
  value your plugin replied.
* The stack frame `mem-cache.js:62:35` points at the line in your plugin
  that produced the reply.

Restore the line and the test passes again. The
[Diagnose a failing standard case](../how-to/diagnose-a-failing-case.md)
guide covers the other kinds of failure.

## What happened

`basictest` waited for the instance to be ready, generated five random
keys, and sent some twenty `role:cache` messages in a fixed order:
delete the keys, set and get, add and refuse a second add, increment and
decrement, set and increment zero, delete and check, clear and check,
and finally `get:native`. Each reply was checked; the first failing
check ended the run with an error naming its case. The test closed the
instance.

## Next steps

* [Run the tests with node:test](../how-to/run-with-node-test.md):
  timeouts, several configurations, a real cache server, coverage.
* [Run the tests with lab, jest or mocha](../how-to/run-with-lab-or-jest.md)
  if your plugin uses another test framework.
* [Test a cache plugin on Seneca 3 and 4](../how-to/test-on-seneca-3-and-4.md)
  if the plugin must support both.
* [Why a shared conformance suite](../explanation/conformance-suite.md)
  explains the design of the contract.
