## 3.0.0 2026-11-20

* Seneca 4: the peer dependency is `seneca` `^4.0.0`. Seneca 3 users stay
  on `@seneca/cache-test@2`. The test cases are unchanged.
* Node.js 24 or later (`engines.node` `>=24`).
* 2.1.0 was not published. Its changes, listed in the 2.1.0 entry below,
  are part of 3.0.0, among them failures reported through the completion
  callback with the case name in `err.cache_test_case`.
* The development dependency is `seneca` `^4.0.0` (was `^4.0.0-rc5`).
  `package-lock.json` is no longer committed. `CHANGES.md` is published.
* Documentation: the guide "Test a cache plugin on Seneca 3 and 4" is
  replaced by "Upgrade a cache plugin to Seneca 4", which covers the
  peer range, closed option defaults, close hooks with `this.destroy`
  and the `SENECA_DEP_*` warnings. The 4.0.0-rc5 work-arounds are
  removed, and the examples use `await seneca.ready()`.

## 2.1.0 2026-10-07

* Seneca 4 prerelease support: the test cases run on `seneca@4.0.0-rc5`
  and on the unreleased Seneca 4.0.0, and still run on Seneca 3.x. The
  cases wait for `ready` with the callback form, which works on every
  version (on 4.0.0-rc5 `await seneca.ready()` does not resolve on an idle
  instance). `seneca` is a development dependency only; the instance under
  test comes from the caller.
* Failures are reported through the completion callback. Assertions now
  run inside a `try`/`catch`, so a failing check calls `done(err)` with the
  `AssertionError`. Before, the assertion threw inside a Seneca action
  callback; Seneca 3 and 4 catch such exceptions, log them as
  `act_callback` errors and never call the callback, so the test only
  timed out.
* Every reported error names the failing case: `err.cache_test_case` is
  `basictest/<case>` (for example `basictest/incr1`), and the message and
  the first line of the stack are prefixed with `cache-test basictest/<case>: `.
* `done` is called on a fresh tick (`setImmediate`), outside Seneca's
  callback context, so an exception thrown by `done` reaches the test
  runner.
* The truthiness checks written as `Assert(out, 0)`, `Assert(out, 1)` and
  `Assert(out, key)` are now `Assert.ok(out)`; the second argument was only
  the assertion message. The contract is unchanged.
* The error for `cmd:add` not refusing an existing key reads
  `cmd:add replied without an error for an existing key` (was
  `refuse_existing0`).
* Node.js 24 is the default target and Node.js 22 is supported.
* The repository's own tests run on the Node.js built-in test runner
  (`node --test`) against an in-memory cache plugin fixture
  (`test/mem-cache.js`), and check that a conforming plugin passes and
  that broken plugins are reported with the right case name and error.
  `@hapi/lab` 19 and `lab` 18 are removed; `prettier` is 3.x.
* Documentation reorganized under `docs/` following the Diátaxis structure
  (tutorial, how-to guides, reference, explanation), with the complete
  `role:cache` message contract and runnable examples in `docs/examples/`.
* `.travis.yml` and the `coveralls` script are removed; the GitHub Actions
  `build` workflow (Node.js 24 and 22) is provided as a patch in
  `.patches/` (see `.patches/README.md`). `package-lock.json` is
  regenerated and no longer listed in `.gitignore`. Both license files are
  published.

## 2.0.0

* Published as `@seneca/cache-test` (previously `seneca-cache-test` 1.0.0);
  `async` 3.x.
