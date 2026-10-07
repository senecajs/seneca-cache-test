# @seneca/cache-test documentation

The documentation follows the [Diátaxis](https://diataxis.fr/) structure:
four sections with four different jobs. Start with the tutorial if you
are writing your first cache plugin; use the how-to guides for specific
tasks; look things up in the reference; read the explanation to
understand why the test cases are what they are.

## Tutorials

| Tutorial | What you build |
| -------- | -------------- |
| [Add the standard tests to your cache plugin](tutorials/add-the-standard-tests.md) | An in-memory cache plugin that passes the standard tests, its test file for `node --test`, and a look at a failing case. |

The programs from the tutorial are in [examples](examples/).

## How-to guides

| Guide | Covers |
| ----- | ------ |
| [Run the tests with node:test](how-to/run-with-node-test.md) | Test file, `npm test` script, timeouts, several configurations, a real cache server, coverage. |
| [Run the tests with lab, jest or mocha](how-to/run-with-lab-or-jest.md) | The same test for `@hapi/lab`, `jest` and `mocha`. |
| [Diagnose a failing standard case](how-to/diagnose-a-failing-case.md) | Reading the error, finding the case, reproducing one message, common causes. |
| [Test a cache plugin on Seneca 3 and 4](how-to/test-on-seneca-3-and-4.md) | Dependency ranges, running against both versions, what differs in plugin code. |

## Reference

| Reference | Describes |
| --------- | --------- |
| [Functions](reference/functions.md) | The module exports, `basictest`, the completion callback and the error it reports. |
| [Messages](reference/messages.md) | Every `role:cache` message the cases send, with parameters, the expected reply, and every case in order. |

## Explanation

| Explanation | Topic |
| ----------- | ----- |
| [Why a shared conformance suite](explanation/conformance-suite.md) | Interchangeable caches, the `role:cache` protocol and its design choices, how the suite is built, Seneca 3 versus 4, limits, history. |

## Feature index

Everything the package provides or requires, with the page that
documents it. The package has no options, no error codes of its own and
no command line.

| Feature | Kind | Documented in |
| ------- | ---- | ------------- |
| `require('@seneca/cache-test')` | module, exports `{ basictest }` | [Functions](reference/functions.md#the-module) |
| `basictest(seneca, done)` | exported function | [Functions](reference/functions.md#basictest), [tutorial](tutorials/add-the-standard-tests.md) |
| `done(err, results)` | completion callback | [Functions](reference/functions.md#the-completion-callback) |
| `err.cache_test_case` | property of a reported error, `basictest/<case>` | [Functions](reference/functions.md#the-reported-error), [Diagnose a failing standard case](how-to/diagnose-a-failing-case.md) |
| `cache-test basictest/<case>: ` | prefix of a reported error's message and stack | [Functions](reference/functions.md#the-reported-error) |
| `role:cache,cmd:set` | message sent to the plugin | [Messages](reference/messages.md#rolecachecmdset) |
| `role:cache,cmd:get` | message sent to the plugin | [Messages](reference/messages.md#rolecachecmdget) |
| `role:cache,cmd:add` | message sent to the plugin | [Messages](reference/messages.md#rolecachecmdadd) |
| `role:cache,cmd:delete` | message sent to the plugin | [Messages](reference/messages.md#rolecachecmddelete) |
| `role:cache,cmd:incr` | message sent to the plugin | [Messages](reference/messages.md#rolecachecmdincr) |
| `role:cache,cmd:decr` | message sent to the plugin | [Messages](reference/messages.md#rolecachecmddecr) |
| `role:cache,cmd:clear` | message sent to the plugin | [Messages](reference/messages.md#rolecachecmdclear) |
| `role:cache,get:native` | message sent to the plugin | [Messages](reference/messages.md#rolecachegetnative) |
| `init0` to `native0` | the fifteen cases of `basictest`, in order | [Messages](reference/messages.md#cases-in-order) |
| Random keys (`a-`, `b-`, `c-`, `q-`, `z-` prefixes) | test data | [Messages](reference/messages.md#keys-and-values), [explanation](explanation/conformance-suite.md#design-choices) |
| Seneca 3.x and 4.x (from 4.0.0-rc5) | supported Seneca versions | [Test a cache plugin on Seneca 3 and 4](how-to/test-on-seneca-3-and-4.md), [explanation](explanation/conformance-suite.md#seneca-3-and-seneca-4) |
| Node.js 24 and 22 | tested Node.js versions | [README](../README.md#background) |
| `async` | runtime dependency (runs the cases in series) | [Functions](reference/functions.md#dependencies) |

## Other documents

* [Change log](../CHANGES.md)
* [Code of conduct](../CODE_OF_CONDUCT.md)
* [License](../LICENSE)
* [Workflow patches](../.patches/README.md)
