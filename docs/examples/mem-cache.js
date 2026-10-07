/* Copyright (c) 2026 Richard Rodger and other contributors, MIT License */
'use strict'

// An in-memory cache plugin for Seneca that satisfies the standard cache
// tests (@seneca/cache-test). Companion to docs/tutorials/add-the-standard-tests.md.
//
// Run this file directly for a short demonstration:
//
//   node docs/examples/mem-cache.js

module.exports = mem_cache

mem_cache.errors = {
  key_exists: 'Key <%=key%> exists.',
  not_a_number: 'Value for key <%=key%> is not a number: <%=value%>.',
}

function mem_cache(options) {
  const seneca = this
  const store = new Map()

  seneca
    .add('role:cache,cmd:set', function (msg, reply) {
      store.set(msg.key, msg.val)
      reply({ key: msg.key })
    })

    .add('role:cache,cmd:get', function (msg, reply) {
      reply({ value: store.get(msg.key) })
    })

    .add('role:cache,cmd:add', function (msg, reply) {
      if (store.has(msg.key)) {
        return this.fail('key_exists', { key: msg.key })
      }
      store.set(msg.key, msg.val)
      reply({ key: msg.key })
    })

    .add('role:cache,cmd:delete', function (msg, reply) {
      store.delete(msg.key)
      reply({ key: msg.key })
    })

    .add('role:cache,cmd:incr', incrdecr(1))
    .add('role:cache,cmd:decr', incrdecr(-1))

    .add('role:cache,cmd:clear', function (msg, reply) {
      store.clear()
      reply()
    })

    .add('role:cache,get:native', function (msg, reply) {
      reply(store)
    })

  function incrdecr(direction) {
    return function (msg, reply) {
      const current = store.get(msg.key)

      // An unknown key is not an error: the reply says the value is false.
      if (null == current) return reply({ value: false })

      if ('number' !== typeof current) {
        return this.fail('not_a_number', { key: msg.key, value: current })
      }

      const value = current + direction * msg.val
      store.set(msg.key, value)
      reply({ value: value })
    }
  }

  return { name: 'mem-cache' }
}

if (require.main === module) {
  const Seneca = require('seneca')

  demo().catch(function (err) {
    console.error(err)
    process.exit(1)
  })

  async function demo() {
    // quiet(): the refused add below is logged at level error otherwise
    const seneca = Seneca().test().quiet().use(mem_cache)

    // Callback form: `await seneca.ready()` hangs on an idle 4.0.0-rc5 instance
    await new Promise(function (resolve) {
      seneca.ready(resolve)
    })

    console.log(
      await seneca.post('role:cache,cmd:set', { key: 'color', val: 'red' }),
    )
    console.log(await seneca.post('role:cache,cmd:get', { key: 'color' }))
    console.log(
      await seneca.post('role:cache,cmd:add', { key: 'count', val: 1 }),
    )
    console.log(
      await seneca.post('role:cache,cmd:incr', { key: 'count', val: 2 }),
    )
    console.log(
      await seneca.post('role:cache,cmd:incr', { key: 'unknown', val: 1 }),
    )

    try {
      await seneca.post('role:cache,cmd:add', { key: 'color', val: 'blue' })
    } catch (err) {
      console.log(err.code, '->', err.message)
    }

    await seneca.close()
  }
}
