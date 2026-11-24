# Upgrade a cache plugin to Seneca 4

How to move a cache plugin and its tests to Seneca 4 and
`@seneca/cache-test` 3, and what to change in a plugin written for
Seneca 3. The cases themselves need no change: `basictest` uses only
`seneca.ready(callback)` and `seneca.act`.

`@seneca/cache-test` 3 supports Seneca 4 only. A plugin that stays on
Seneca 3 keeps `@seneca/cache-test` 2.

## 1. Declare the versions

In the plugin's `package.json`:

```json
{
  "peerDependencies": {
    "seneca": "^4.0.0"
  },
  "devDependencies": {
    "seneca": "^4.0.0",
    "@seneca/cache-test": "^3.0.0"
  },
  "engines": {
    "node": ">=24"
  }
}
```

Use `^4.0.0` and no other range. An open range such as `>=3` admits
every later major, and a dual range such as `^3.38.0 || ^4.0.0` means
testing two code paths. Dropping Seneca 3 is a breaking change for the
plugin, so it takes a new major version.

Remove `seneca-promisify`: Seneca 4 has promises built in. Move every
other in-organisation dependency to its Seneca 4 version, for example
`@seneca/entity` `^29.0.0` instead of `seneca-entity`. A dependency that
still declares a Seneca 3 peer makes `npm install` fail with
`ERESOLVE`; upgrade it rather than setting `legacy-peer-deps`.

## 2. Run the tests

```sh
npm install
npm test
```

Run them once with `node --trace-deprecation` as well (for `node:test`,
`node --trace-deprecation --test test/cache.test.js`). Seneca 4 prints
a `SENECA_DEP_*` warning, with a stack, for each Seneca 3 API that it
still supports but will remove in Seneca 5. Fix those in the plugin.

## 3. Update the plugin for Seneca 4

### Definition function

Only `function cache(options) { const seneca = this }` is supported. A
definition function with two parameters fails with
`unsupported_legacy_plugin`.

### Options

Plugin options come from `seneca.use(plugin, options)` and from
`options.plugin.<name>` only. Seneca 3 also merged a top level
`options.<pluginname>` block; Seneca 4 does not. Carry complete
defaults in the plugin, on `plugin.defaults`.

Seneca 4 validates options with `shape`. A plain object in `defaults`
is closed: a key that the defaults do not name fails the plugin with
`invalid_plugin_option`. Options that the plugin hands to a client
library, such as a Redis or memcached connection object, need an open
object. Write the defaults as a function of the `valid` builders that
Seneca passes:

```js
function my_cache(options) {
  // ...
}

my_cache.defaults = ({ valid }) => ({
  host: '127.0.0.1',
  port: 6379,
  client: valid.Open({}), // passed to the client library as it is
})
```

A Gubu shape in `defaults` fails with `plugin_gubu_shape`, and a Joi
schema is not understood: it silently becomes the option value. If the
plugin merges options by hand, use `seneca.util.deep(defaults, options)`;
`seneca.util.deepextend` is deprecated.

### Errors

An error replied by an action reaches the `act` callback, or rejects
the promise of `seneca.post`, as the original error: `err.message` is
your message, `err.code` your code, and there is no `err.orig`. Seneca 3
wrapped it by default. In your own tests assert on `err.code`. The
standard cases only require that `cmd:add` on an existing key replies
with an error.

### Close hooks

A plugin for a cache server releases its connection when the instance
closes. Seneca 4 closes through `sys:seneca,cmd:close`. Register the
hook with `this.destroy`:

```js
function my_cache(options) {
  const client = connect(options)

  this.destroy(async function () {
    await client.quit()
  })
}
```

A prior on `sys:seneca,cmd:close` works as well. A hook added to the
Seneca 3 pattern `role:seneca,cmd:close` is still called on Seneca 4,
but it prints the `SENECA_DEP_LEGACY_CLOSE_HOOK` warning and is removed
in Seneca 5.

### `ready`

`await seneca.ready()` and the callback form `seneca.ready(callback)`
both work. The standard cases use the callback form.

### The `legacy` option

Seneca 4 accepts only `legacy: true|false` or
`legacy: { error, meta, builtin_actions }`. Remove `legacy.transport`,
`legacy.error_codes`, `legacy.validate` and similar flags from
instances created in tests; they are rejected by option validation.

### Dependencies

Seneca 4 does not depend on `lodash`, `optioner`, `@hapi/joi`, `norma`,
`gubu` or `eraro@2`. A plugin that requires one of them needs its own
dependency. `seneca.util` provides `clean`, `pattern`, `deep`, `Jsonic`,
`Shape` and `print`. `seneca.util.deepextend` and `seneca.util.Gubu`
still work but are deprecated.

### Promises

`seneca.post`, `seneca.message`, and promise returning `ready()`,
`close()` and `prior()` are built into Seneca 4. Remove
`seneca-promisify` and any `use('promisify')`.

## 4. Check

1. `npm test` passes.
2. A run with `node --trace-deprecation` prints no `SENECA_DEP_*`
   warning from the plugin's own code.
3. The test process exits by itself after each run. If it does not, the
   close hook is not running: see [Close hooks](#close-hooks).
