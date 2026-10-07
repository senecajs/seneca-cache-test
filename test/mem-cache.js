/* Copyright (c) 2026 Richard Rodger and other contributors, MIT License */
'use strict'

// A minimal in-memory cache plugin that satisfies the standard cache tests.
// It is the fixture for this repository's own tests. The tutorial in
// docs/tutorials/add-the-standard-tests.md builds the same plugin.

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
