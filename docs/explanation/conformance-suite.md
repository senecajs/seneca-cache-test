# Why a shared conformance suite

Why the Seneca cache plugins share one set of test cases, what the
`role:cache` protocol is and why its rules are what they are, how the
suite is built, and what it leaves out.

## Interchangeable caches

Seneca application code does not call a cache library. It sends
messages: `role:cache,cmd:get` with a key, and acts on the reply. Which
plugin answers is decided by pattern matching at run time, so the same
code runs against an in-memory cache during development, against Redis
or memcached in production, and against a stub in a unit test. That only
works if every cache plugin gives the same answers to the same messages.

A written protocol alone does not keep plugins aligned; each author
reads it differently, and plugins drift as they are maintained. A shared
test suite is the protocol in executable form. When a plugin passes
`basictest`, an application that works with one conforming plugin works
with another. When the protocol changes, the suite changes, and every
plugin's tests say what needs updating.

The suite is deliberately small. It contains the operations an
application can rely on from any cache: store, read, add if absent,
delete, count up and down, clear, and access to the native client for
anything beyond that.

## The role:cache protocol

Eight messages, all with `role:cache`:

| Message | Reply |
| ------- | ----- |
| `cmd:set {key, val}` | `{ key }` |
| `cmd:get {key}` | `{ value }` |
| `cmd:add {key, val}` | `{ key }`, or an error if the key exists |
| `cmd:delete {key}` | `{ key }` |
| `cmd:incr {key, val}` | `{ value }`, `{ value: false }` if the key is unknown |
| `cmd:decr {key, val}` | `{ value }` |
| `cmd:clear` | nothing |
| `get:native` | the native cache object or client |

The exact checks are in the [Messages reference](../reference/messages.md).

## Design choices

**Replies are objects.** `{ key }` and `{ value }` rather than the bare
key or value. Seneca rejects scalar replies by default
(`result_not_objarr`), and an object reply can grow (a `ttl`, a `found`
flag) without breaking callers. The 1.x suite accepted scalar replies;
the memcached plugin still has a `legacy.scalar_results` option from
that time.

**`add` refuses an existing key with an error.** This follows the
memcached `add` command, which the operation was modelled on. An error
rather than a flag in the reply because the caller's code path is
different: a failed `add` usually means another process got there first.

**`incr` on an unknown key is not an error.** It replies
`{ value: false }`. A counter that does not exist yet is an ordinary
state for a cache, where keys expire; the caller decides whether to
create it. Redis increments from zero and memcached fails; the protocol
chooses a reply that every backend can produce.

**`get` of a missing key replies with no value, not `false`.** `value`
is `null` or `undefined`, so that `false` remains a storable value. The
cases `delete3` and `clear` check this precisely; `delete0` and
`delete1` only require a falsy value, which is why a plugin can pass the
early cases and fail the later ones.

**Loose equality.** The checks use `assert.equal`, which compares with
`==`. A backend that stores everything as strings (Redis) replies `'6'`
where an in-memory cache replies `6`; both are correct for a cache, and
both pass.

**Random keys.** Each run generates its own keys, so the cases can run
against a shared cache server and two runs do not interfere, except
through `cmd:clear`, which removes everything.

**`get:native` is part of the contract.** Plugin specific tests (peek,
keys, statistics, expiry) need the underlying client. Making it
available through a message keeps those tests inside Seneca's message
model.

## How the suite is built

`basictest(seneca, done)` is one function with a completion callback.
It creates no Seneca instance and does not close the one it is given:
the test that calls it controls the instance's configuration, the
plugin's options and when it closes. For the same reason the package has
no dependency on `seneca`; the version under test is whatever the
caller installed.

The function waits for `seneca.ready(callback)`, then runs fifteen named
cases in sequence with `async.series`. Each case sends one or more
messages with `seneca.act` and checks the replies with Node.js `assert`.
The first failure ends the run.

Three details make failures diagnosable:

* **Assertions run inside a `try`/`catch`.** A check runs inside a
  Seneca action callback. Seneca 3 and 4 catch an exception thrown
  there, log it as an `act_callback` error, and do not call the callback
  again. An assertion that simply threw would never reach `done`; the
  test would wait for its timeout with only a log entry as a clue. The
  suite catches the `AssertionError` and passes it to `done`.
* **Every error names its case.** `err.cache_test_case` is
  `basictest/<case>`, and the message and the first line of the stack
  are prefixed with it. Test runners print the stack, so the case name
  is visible without inspecting the error.
* **`done` is called on a fresh tick** (`setImmediate`), outside Seneca's
  callback context, so an exception thrown by the test's own callback is
  not swallowed either.

## Seneca 3 and Seneca 4

The suite runs unchanged on Seneca 3.x, 4.0.0-rc5 and 4.0.0, because it
uses only behaviour that is the same in all of them. The differences
that matter to cache plugin authors:

| Topic | Seneca 3 | Seneca 4 | Effect on the suite |
| ----- | -------- | -------- | ------------------- |
| `ready` | callback or (with `seneca-promisify`) promise | callback or promise; on 4.0.0-rc5 the promise does not resolve on an idle instance | The suite uses the callback form. |
| Error replies | wrapped by default (`legacy.error: true`): message `seneca: Action ... failed: ...`, original in `err.orig` | the original error | The suite only requires that `cmd:add` on an existing key replies with an error. |
| Exceptions in callbacks | caught by Seneca, logged as `act_callback`, callback not called again | the same | The reason for the `try`/`catch` and for calling `done` on a fresh tick. |
| Close hooks | `role:seneca,cmd:close` | `sys:seneca,cmd:close`; on 4.0.0-rc5 `role:seneca` hooks are not called | Plugins holding connections must register the right pattern, or the test process does not exit. |
| Error handler | `seneca.test(errhandler)` receives action errors | the same | Do not pass the test's `done` to `seneca.test()`: the expected error would fail the test. |

The [Test a cache plugin on Seneca 3 and 4](../how-to/test-on-seneca-3-and-4.md)
guide has the code for each point.

## What the suite does not cover

* Expiry and eviction: no case waits for a value to disappear.
* Value types beyond strings and numbers: objects, arrays, booleans and
  binary data are not stored or compared.
* Concurrency: messages are sent one at a time.
* Large values, many keys, or performance.
* Plugin specific messages: `peek`, `has`, `keys`, `stats`, micro
  caching and others are tested by each plugin.
* Transport: the cases run in process. The messages are plain objects,
  so the same cases pass through a transport if the instance is a
  client of a remote cache service.

A plugin's own tests cover these for its backend, usually through
`get:native`.

## History

* `seneca-cache-test` 1.0.0: the original suite, run from mocha and lab
  by the first cache plugins (Seneca 0.5 era), with `async` 2.
* `@seneca/cache-test` 2.0.0: renamed into the `@seneca` scope, `async`
  3.
* 2.1.0: Seneca 4 prerelease support, failures reported through the
  callback with the case name, the repository's own tests on `node:test`
  against an in-memory fixture, and this documentation. See
  [CHANGES.md](../../CHANGES.md).
