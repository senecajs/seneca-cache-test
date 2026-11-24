![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# @seneca/cache-test

[![npm version][npm-badge]][npm-url]
[![build][build-badge]][build-url]

Standard test cases for Seneca cache plugins. A cache plugin handles the
`role:cache` messages (`cmd:set`, `cmd:get`, `cmd:add`, `cmd:delete`,
`cmd:incr`, `cmd:decr`, `cmd:clear` and `get:native`). This package sends
those messages to your plugin and asserts on the replies, so that every
cache plugin behaves in the same way. It works with Seneca 4 on Node.js
24 or later. For Seneca 3 use `@seneca/cache-test` 2.

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install --save-dev seneca@^4 @seneca/cache-test
```

The test cases receive a Seneca instance from your test. `seneca`
`^4.0.0` is a peer dependency, so install it as a development dependency
of your plugin.

## Quick Example

With the Node.js test runner (`node --test`):

```js
const { test } = require('node:test')
const Seneca = require('seneca')
const CacheTest = require('@seneca/cache-test')

const my_cache = require('..') // the cache plugin under test

test('standard cache tests', function (t, done) {
  const seneca = Seneca().test().quiet().use(my_cache)

  CacheTest.basictest(seneca, function (err) {
    seneca.close(function () {
      done(err)
    })
  })
})
```

`basictest` waits for the instance to be ready, runs the cases in order
and calls back with the first failure. The error names the failing case
(`err.cache_test_case`, for example `basictest/incr1`).

## More Examples

* [Add the standard tests to your cache plugin](docs/tutorials/add-the-standard-tests.md):
  a complete in-memory cache plugin and its test, with the real output.
* [Run the tests with node:test](docs/how-to/run-with-node-test.md)
* [Run the tests with lab, jest or mocha](docs/how-to/run-with-lab-or-jest.md)
* [Diagnose a failing standard case](docs/how-to/diagnose-a-failing-case.md)
* [Upgrade a cache plugin to Seneca 4](docs/how-to/upgrade-a-cache-plugin-to-seneca-4.md)
* The runnable programs are in [docs/examples](docs/examples/).

## Motivation

Application code sends `role:cache` messages without knowing which cache
answers them, so an in-memory cache in development and Redis or memcached
in production must reply to the same messages in the same way. This
package is the executable definition of that contract, shared by the
official Seneca cache plugins. See
[Why a shared conformance suite](docs/explanation/conformance-suite.md).

## Support

If you're using this module and need help, you can:

- Post a [github issue][]
- Read the [Seneca documentation][seneca-docs]
- Tweet to [@senecajs][]
- Ask [Voxgig](https://www.voxgig.com) about commercial support

## API

| Function | Description | Reference |
| -------- | ----------- | --------- |
| `basictest(seneca, done)` | Runs the basic cache contract against the plugin loaded on `seneca`; `done(err)` receives the first failure. | [Functions](docs/reference/functions.md#basictest) |

Messages sent to the plugin under test:

| Message | Expected reply | Reference |
| ------- | -------------- | --------- |
| `role:cache,cmd:set` `{key, val}` | `{ key }` | [Messages](docs/reference/messages.md#rolecachecmdset) |
| `role:cache,cmd:get` `{key}` | `{ value }`, `value` null or undefined for an unknown key | [Messages](docs/reference/messages.md#rolecachecmdget) |
| `role:cache,cmd:add` `{key, val}` | `{ key }`; an error when the key exists | [Messages](docs/reference/messages.md#rolecachecmdadd) |
| `role:cache,cmd:delete` `{key}` | a truthy object, for example `{ key }` | [Messages](docs/reference/messages.md#rolecachecmddelete) |
| `role:cache,cmd:incr` `{key, val}` | `{ value }` with the new value; `{ value: false }` for an unknown key | [Messages](docs/reference/messages.md#rolecachecmdincr) |
| `role:cache,cmd:decr` `{key, val}` | `{ value }` with the new value | [Messages](docs/reference/messages.md#rolecachecmddecr) |
| `role:cache,cmd:clear` | no error; every key is gone afterwards | [Messages](docs/reference/messages.md#rolecachecmdclear) |
| `role:cache,get:native` | the truthy native cache object or client | [Messages](docs/reference/messages.md#rolecachegetnative) |

The [documentation index](docs/README.md) has a feature index that lists
every function, message and case with the page that documents it.

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can
help in any way, be it with documentation, examples, extra testing, or
new features please get in touch.

### Running tests

The tests use the Node.js built-in test runner on Node.js 24 or later,
with Seneca 4 installed as a development dependency (`seneca@^4.0.0`):

```sh
npm install
npm test
```

`npm run examples` runs the programs in [docs/examples](docs/examples/),
and `npm run prettier` formats the code.

Continuous integration runs the same `npm test`. The GitHub Actions
workflow is delivered as a patch in
[.patches](.patches/README.md) (see that file for how to apply it).

## Background

The package started as `seneca-cache-test` (1.x) and was renamed to
`@seneca/cache-test` in 2.0.0. It is used by the official cache plugins
([@seneca/cache](https://github.com/senecajs/seneca-cache),
[@seneca/redis-cache](https://github.com/senecajs/seneca-redis-cache) and
[@seneca/memcached-cache](https://github.com/senecajs/seneca-memcached-cache))
to verify that they implement the same `role:cache` contract.

| | Supported |
| - | --------- |
| Seneca | 4.x, peer dependency `^4.0.0` (the instance is supplied by your test). Seneca 3: `@seneca/cache-test` 2 |
| Node.js | 24 or later |
| Test runners | any; the API is a function with a completion callback (verified with node:test, @hapi/lab 26, jest 29 and mocha 11) |

See [CHANGES.md](CHANGES.md) for the change history.

Copyright (c) 2014-2026 Richard Rodger and other contributors;
Licensed under [MIT][].

[Seneca.js]: https://senecajs.org
[seneca-docs]: https://github.com/senecajs/seneca/blob/master/docs/README.md
[MIT]: ./LICENSE
[Senecajs org]: https://github.com/senecajs/
[github issue]: https://github.com/senecajs/seneca-cache-test/issues
[@senecajs]: https://twitter.com/senecajs
[npm-badge]: https://img.shields.io/npm/v/@seneca/cache-test.svg
[npm-url]: https://npmjs.com/package/@seneca/cache-test
[build-badge]: https://github.com/senecajs/seneca-cache-test/actions/workflows/build.yml/badge.svg
[build-url]: https://github.com/senecajs/seneca-cache-test/actions/workflows/build.yml
