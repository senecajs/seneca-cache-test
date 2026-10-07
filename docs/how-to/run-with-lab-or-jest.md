# Run the tests with lab, jest or mocha

How to run the standard cache tests from a test framework other than
`node:test`. `basictest(seneca, done)` is a plain function with a
completion callback, so any framework that can wait for a callback or a
promise can run it. The examples below were run with `@hapi/lab` 26.0.1,
`jest` 29.7.0 and `mocha` 11.8.0 on Node.js 24 with `seneca@4.0.0-rc5`.

## @hapi/lab

Lab tests return a promise, so wrap the callback:

```js
const Lab = require('@hapi/lab')
const lab = (exports.lab = Lab.script())
const { it } = lab

const Seneca = require('seneca')
const CacheTest = require('@seneca/cache-test')

const my_cache = require('..')

it('standard cache tests', async () => {
  const seneca = Seneca().test().quiet().use(my_cache)

  await new Promise((resolve, reject) => {
    CacheTest.basictest(seneca, (err) => (err ? reject(err) : resolve()))
  })

  await seneca.close()
})
```

```sh
lab test/cache.test.js
```

Notes:

* Lab's default per test timeout is 2 seconds. An in-memory cache
  finishes in about 0.3 seconds; a cache server may need more. Raise
  it with `lab -m 10000`.
* Lab 26 recognizes the Node.js 24 globals, so its leak detection
  passes without flags. If an older lab reports Node.js globals as
  leaks, add `-l`.
* `await seneca.close()` needs Seneca 4 (or Seneca 3 with
  `seneca-promisify`). For plain Seneca 3 use
  `await new Promise((resolve) => seneca.close(resolve))`.

## jest

Jest supports the callback form directly:

```js
const Seneca = require('seneca')
const CacheTest = require('@seneca/cache-test')

const my_cache = require('..')

test('standard cache tests', (done) => {
  const seneca = Seneca().test().quiet().use(my_cache)

  CacheTest.basictest(seneca, (err) => {
    if (err) return done(err)
    seneca.close(done)
  })
})
```

```sh
jest test/cache.test.js
```

Jest's default `testEnvironment` is `node`, which Seneca needs. If jest
reports that the process did not exit, run it with
`--detectOpenHandles` to find the connection the plugin left open.

## mocha

Mocha also supports the callback form:

```js
const Seneca = require('seneca')
const CacheTest = require('@seneca/cache-test')

const my_cache = require('..')

describe('cache', function () {
  this.timeout(10000)

  it('standard cache tests', function (done) {
    const seneca = Seneca().test().quiet().use(my_cache)

    CacheTest.basictest(seneca, function (err) {
      if (err) return done(err)
      seneca.close(done)
    })
  })
})
```

```sh
mocha test/cache.test.js
```

Mocha's default timeout is 2 seconds; `this.timeout(10000)` leaves room
for a cache server.

## In every framework

* Use `Seneca().test().quiet()`: `quiet()` hides the log entry for the
  error that the case `refuse_existing0` expects.
* Do not register the framework's completion callback as the Seneca
  error handler (`Seneca().test(done)`). The expected error would fail
  the test. See [The expected error](../reference/functions.md#the-expected-error).
* Close the instance when the run completes, so that the process exits.
