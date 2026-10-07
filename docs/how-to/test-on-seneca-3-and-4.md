# Test a cache plugin on Seneca 3 and 4

How to run the standard cache tests against both Seneca major versions,
and what to change in a cache plugin written for Seneca 3 so that it
passes on Seneca 4. The cases themselves need no change: `basictest`
uses only `seneca.ready(callback)` and `seneca.act`, which behave the
same on Seneca 3.x, 4.0.0-rc5 and later.

## 1. Declare the versions

In the plugin's `package.json`:

```json
{
  "peerDependencies": {
    "seneca": ">=3 || >=4.0.0-rc5"
  },
  "devDependencies": {
    "seneca": "^4.0.0-rc5",
    "@seneca/cache-test": "^2.1.0"
  }
}
```

A bare `>=3` does not match the prerelease and makes `npm install` fail
with `ERESOLVE` for users of `seneca@4.0.0-rc5`. If a dependency of your
plugin declares `peer seneca >=3`, add an `.npmrc` with
`legacy-peer-deps=true` until Seneca 4.0.0 is published, and make every
peer the tests need an explicit development dependency.

## 2. Run against the other version locally

```sh
npm install --no-save seneca@3
npm test
npm install   # restores the version from package.json
```

`--no-save` leaves `package.json` and the lockfile alone.

## 3. Run both in CI

A GitHub Actions matrix over Node.js and Seneca versions:

```yaml
strategy:
  matrix:
    node-version: [24.x, 22.x]
    seneca-version: ['3', '4.0.0-rc5']
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
  - run: npm install
  - run: npm install --no-save seneca@${{ matrix.seneca-version }}
  - run: npm test
```

## 4. Update the plugin for Seneca 4

### Definition function

Only `function cache(options) { const seneca = this }` is supported. A
definition function with two parameters fails with
`unsupported_legacy_plugin`.

### Options

Plugin options come from `seneca.use(plugin, options)` and from
`options.plugin.<name>` only. Seneca 3 also merged a top level
`options.<pluginname>` block; Seneca 4 does not. Carry complete defaults
in the plugin (`seneca.util.deepextend(defaults, options)` still works,
or set `plugin.defaults`). Joi schemas in `defaults` are not understood;
use plain default values or Gubu shapes.

### Errors

On Seneca 4 an error replied by an action reaches the `act` callback as
the original error: `err.message` is your message and `err.orig` does
not exist. On Seneca 3 (default `legacy.error: true`) the callback
receives a wrapper whose message is
`seneca: Action <pattern> failed: <message>.`, with the original in
`err.orig`. The standard cases only require that `cmd:add` on an
existing key replies with an error, so they pass on both. In your own
tests use `(err.orig || err).message` when they must run on both
versions.

### Close hooks

A plugin for a cache server releases its connection when the instance
closes. Seneca 3 runs close hooks added to `role:seneca,cmd:close`;
Seneca 4 closes through `sys:seneca,cmd:close`. On 4.0.0-rc5 a hook on
the Seneca 3 pattern is never called, so the connection stays open and
the test process does not exit (4.0.0 final calls it for compatibility).
Register the hook on the pattern of the running version:

```js
// Seneca 3 closes via role:seneca,cmd:close; Seneca 4 via sys:seneca,cmd:close.
const close_pattern = seneca.version.startsWith('3.')
  ? 'role:seneca,cmd:close'
  : 'sys:seneca,cmd:close'

seneca.add(close_pattern, function (msg, reply) {
  client.quit(() => this.prior(msg, reply))
})
```

`seneca.has('sys:seneca,cmd:close')` cannot be used to tell the versions
apart, because Seneca 3 translates `sys:seneca` to `role:seneca`. A
plugin written with promises can use `seneca.destroy(async () => {...})`
on Seneca 4, and on Seneca 3 with `seneca-promisify`.

### `ready`

In 4.0.0-rc5, `await seneca.ready()` on an instance that is already idle
does not resolve (fixed in 4.0.0). In code that may run on rc5 use the
callback form, `seneca.ready(callback)`, or
`await new Promise((resolve) => seneca.ready(resolve))`. The standard
cases use the callback form.

### The `legacy` option

Seneca 4 accepts only `legacy: true|false` or
`legacy: { error, meta, builtin_actions }`. Remove `legacy.transport`,
`legacy.error_codes`, `legacy.validate` and similar flags from
instances created in tests; they are rejected by option validation.

### Dependencies

Seneca 4 does not depend on `lodash`, `optioner`, `@hapi/joi`, `norma`
or `eraro@2`. A plugin that requires one of them needs its own
dependency. `seneca.util` still provides `clean`, `pattern`,
`deepextend`, `Jsonic`, `Gubu` and `print`.

### Promises

`seneca.post`, `seneca.message`, promise returning `ready()` and
`close()` are built into Seneca 4. `seneca-promisify` does nothing on
Seneca 4; keep it only while the plugin must also run on Seneca 3.

## 5. Check

1. `npm test` passes with the development dependency (Seneca 4).
2. `npm install --no-save seneca@3 && npm test` passes; `npm install`
   restores Seneca 4.
3. The test process exits by itself after each run. If it does not, the
   close hook is not running: see [Close hooks](#close-hooks).
