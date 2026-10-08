# Functions

The module exports and the behaviour of each exported function. The
messages the cases send are in the [Messages reference](messages.md).

## The module

```js
const CacheTest = require('@seneca/cache-test')
// { basictest: [Function] }
```

The module exports one function. It has no options, defines no error
codes and has no command line. It does not create a Seneca instance and
does not depend on the `seneca` package: the instance comes from the
caller, so the Seneca version under test is whatever the caller
installed.

## `basictest`

```js
CacheTest.basictest(seneca, done)
```

Runs the basic cache contract against the cache plugin loaded on
`seneca`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `seneca` | Seneca instance | The plugin under test must be loaded on it (`seneca.use(plugin)`). Test mode (`seneca.test()`) is optional. Do not pass the test's completion callback to `seneca.test()`: see [the expected error](#the-expected-error). |
| `done` | `function (err, results)` | Called once, when a case fails or when all cases have passed. See [the completion callback](#the-completion-callback). |

What it does, in order:

1. Waits for `seneca.ready(callback)`, so that plugin loading and
   initialization have finished. The callback form works on Seneca 3,
   on Seneca 4.0.0-rc5 (where `await seneca.ready()` on an idle instance
   does not resolve) and on later versions.
2. Generates five random keys for the values it sets, so that leftovers
   from an earlier run do not break the cases. The random keys do not
   make parallel runs safe: the `clear` case sends an unscoped
   `role:cache,cmd:clear`, which removes every key in the cache. Run the
   suite against a dedicated, empty cache, one run at a time.
3. Runs the fifteen cases listed in [Cases in order](messages.md#cases-in-order)
   one after the other, with `async.series`. Each case sends one or more
   `role:cache` messages with `seneca.act` and checks the replies with
   the Node.js `assert` module. The first failing case stops the run.
4. Calls `done`.

It does not close the instance. The caller closes it, usually in the
completion callback (`seneca.close(done)`).

A run against an in-memory cache takes about 0.3 seconds. Against a
cache server it takes as long as some twenty round trips.

### The completion callback

```js
function done(err, results) {}
```

| Argument | Description |
| -------- | ----------- |
| `err` | `null` when every case passed; otherwise the error of the first failing case, see [the reported error](#the-reported-error). |
| `results` | The `async.series` results object: one key per completed case, each with the value `undefined`. It carries no information beyond which cases ran, and is present for compatibility. |

`done` is called exactly once, on a fresh tick (`setImmediate`), outside
any Seneca callback. An exception thrown by `done` therefore reaches the
test runner as an uncaught exception instead of being caught by Seneca.

### The reported error

Every error passed to `done` has these properties:

| Property | Description |
| -------- | ----------- |
| `cache_test_case` | `'basictest/<case>'`, for example `'basictest/incr1'`. The case names are in [Cases in order](messages.md#cases-in-order). |
| `message` | The original message prefixed with `cache-test basictest/<case>: `. The first line of `stack` carries the same prefix, so test runners that print the stack show the case name. |

The error itself is one of three kinds:

| Kind | How to recognize it | Cause |
| ---- | ------------------- | ----- |
| Assertion failure | `err.code === 'ERR_ASSERTION'`, with `actual`, `expected` and `operator` | A reply did not have the expected shape or value. |
| Error replied by the plugin | `err.code` is the plugin's own code (for example `key_exists`), or the error has no code | An action replied with an error in a case that expects a result. On Seneca 4 this is the plugin's original error object; on Seneca 3 it is the Seneca wrapper, with the original in `err.orig`. |
| Error raised by Seneca | `err.code` is a Seneca code: `act_not_found` (no action for the pattern), `result_not_objarr` (the action replied with a scalar), `action_timeout` (no reply within the `timeout` option, 22222 milliseconds by default) | The plugin is missing a pattern, replies with the wrong kind of value, or does not reply. |

A reply of `null` where an object is expected fails the case with a
`TypeError` (`Cannot read properties of null (reading 'value')`), which
is reported in the same way.

The harness runs its assertions inside a `try`/`catch` and passes
failures to `done`. Without this, a failing assertion would throw inside
a Seneca action callback; Seneca 3 and 4 catch such exceptions, log them
as `act_callback` errors and do not call the callback again, so the test
would only time out. See [How the suite is built](../explanation/conformance-suite.md#how-the-suite-is-built).

### The expected error

The case `refuse_existing0` sends `role:cache,cmd:add` for a key that
already exists and expects the plugin to reply with an error. Seneca
logs that error at level `error` and passes it to the instance's error
handler (`seneca.test(errhandler)` or `seneca.error(errhandler)`) as
well as to the harness. Consequences:

* Use `seneca.quiet()` to keep the log entry out of the test output.
* Do not install the test's completion callback as the error handler
  (`Seneca().test(done)`): it would be called with the expected error
  and fail the test, while the harness continues and calls `done` again.

## Dependencies

| Package | Used for |
| ------- | -------- |
| `async` (3.x) | `async.series` runs the cases one after the other. |
| `assert` (Node.js core) | The assertions. |
