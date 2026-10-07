# Examples

Runnable programs that accompany the
[tutorial](../tutorials/add-the-standard-tests.md). The test file
requires this package from the repository (`require('../..')`); in your
own plugin use `require('@seneca/cache-test')` instead. `seneca` is a
development dependency of this repository, so `npm install` provides it.

| File | What it is |
| ---- | ---------- |
| `mem-cache.js` | An in-memory cache plugin that passes the standard tests. Run it directly for a short demonstration. |
| `cache.test.js` | The standard tests run against `mem-cache.js` with `node --test`. |

Run them with Node.js 22 or later:

```sh
node docs/examples/mem-cache.js
node --test docs/examples/cache.test.js
```

or both at once with `npm run examples`.
