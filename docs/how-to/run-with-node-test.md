# Run the tests with node:test

How to run the standard cache tests from the Node.js built-in test
runner. For other runners see
[Run the tests with lab, jest or mocha](run-with-lab-or-jest.md).

## 1. Install

```sh
npm install --save-dev @seneca/cache-test seneca
```

Node.js 22 or later is needed for Seneca 4; `node --test` itself exists
since Node.js 18.

## 2. Write the test

`test/cache.test.js`:

```js
const { test } = require('node:test')
const Seneca = require('seneca')
const CacheTest = require('@seneca/cache-test')

const my_cache = require('..')

test('standard cache tests', function (t, done) {
  const seneca = Seneca().test().quiet().use(my_cache)

  CacheTest.basictest(seneca, function (err) {
    seneca.close(function () {
      done(err)
    })
  })
})
```

* `test()` puts the instance in test mode (readable logs at level
  `warn`, caller locations in errors).
* `quiet()` silences the log entry for the one error the cases expect
  (`cmd:add` on an existing key).
* Do not write `Seneca().test(done)`: the expected error would reach
  `done` through the error handler and fail the test.
* Close the instance in the callback so that the process can exit.

## 3. Add the script

```json
{
  "scripts": {
    "test": "node --test test/cache.test.js"
  }
}
```

`npm test` then runs it. On Node.js 24 the output uses the `spec`
format; on Node.js 22 it is TAP when the output is not a terminal.

## Timeouts

`node:test` has no default timeout. If the plugin never replies, Seneca
fails the message after its `timeout` option (22222 milliseconds by
default) with `action_timeout`, and the run reports that error. To fail
faster, lower the Seneca timeout:

```js
const seneca = Seneca({ timeout: 5000 }).test().quiet().use(my_cache)
```

or give the test its own timeout: `test('...', { timeout: 30000 }, fn)`.

## Several configurations

Run the cases once per configuration in a loop:

```js
const configs = {
  small: { max: 10 },
  large: { max: 10000 },
}

for (const [name, options] of Object.entries(configs)) {
  test('standard cache tests: ' + name, function (t, done) {
    const seneca = Seneca().test().quiet().use(my_cache, options)
    CacheTest.basictest(seneca, function (err) {
      seneca.close(function () {
        done(err)
      })
    })
  })
}
```

Each run uses its own random keys, so several runs can share one cache.
A run ends with `cmd:clear`, so runs must not overlap in time on the
same server.

## A real cache server

For Redis, memcached and similar, take the connection details from the
environment, so that the same test runs locally and in CI:

```js
const seneca = Seneca().test().quiet().use(my_cache, {
  host: process.env.CACHE_HOST || '127.0.0.1',
  port: parseInt(process.env.CACHE_PORT || '6379', 10),
})
```

The cases clear the whole cache, so point them at a server that holds no
data you need. If the process does not exit after the test, the plugin
has not released its connection on close: see
[Test a cache plugin on Seneca 3 and 4](test-on-seneca-3-and-4.md#close-hooks).

## Coverage

```sh
node --test --experimental-test-coverage test/cache.test.js
```

prints a coverage table for your plugin after the results.
