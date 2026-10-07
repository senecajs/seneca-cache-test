/* Copyright (c) 2019-2026 Richard Rodger and other contributors, MIT License */
'use strict'

const { describe, test } = require('node:test')
const Assert = require('node:assert')

const Seneca = require('seneca')

const CacheTest = require('..')
const MemCache = require('./mem-cache')

// The expected error from the refuse_existing0 case is logged at level
// error; quiet() keeps it out of the test output.
function make_seneca() {
  return Seneca().test().quiet().use(MemCache)
}

describe('cache-test', function () {
  test('exports', function () {
    Assert.deepEqual(Object.keys(CacheTest), ['basictest'])
    Assert.equal(typeof CacheTest.basictest, 'function')
    Assert.equal(CacheTest.basictest.length, 2)
  })

  test('basictest passes for a conforming cache plugin', function (t, done) {
    const seneca = make_seneca()

    CacheTest.basictest(seneca, function (err, results) {
      if (err) return done(err)
      Assert.equal(typeof results, 'object')
      seneca.close(done)
    })
  })

  test('basictest runs once per instance on a shared cache', function (t, done) {
    // Two runs against the same cache must not interfere: keys are random.
    const seneca = make_seneca()

    CacheTest.basictest(seneca, function (err) {
      if (err) return done(err)
      CacheTest.basictest(seneca, function (err) {
        if (err) return done(err)
        seneca.close(done)
      })
    })
  })

  test('basictest names the case that fails', function (t, done) {
    // A broken cache: add overwrites existing keys instead of refusing them.
    const seneca = make_seneca().use(function broken_add() {
      this.add('role:cache,cmd:add', function (msg, reply) {
        this.act('role:cache,cmd:set', { key: msg.key, val: msg.val }, reply)
      })
    })

    CacheTest.basictest(seneca, function (err) {
      Assert.ok(err)
      Assert.equal(err.cache_test_case, 'basictest/refuse_existing0')
      Assert.match(err.message, /^cache-test basictest\/refuse_existing0: /)
      Assert.match(err.message, /existing key/)
      seneca.close(done)
    })
  })

  test('basictest reports assertion failures through the callback', function (t, done) {
    // A broken cache: get replies with the wrong value.
    const seneca = make_seneca().use(function broken_get() {
      this.add('role:cache,cmd:get', function (msg, reply) {
        reply({ value: 'wrong' })
      })
    })

    CacheTest.basictest(seneca, function (err) {
      Assert.ok(err)
      Assert.equal(err.code, 'ERR_ASSERTION')
      Assert.equal(err.cache_test_case, 'basictest/get0')
      Assert.match(err.message, /^cache-test basictest\/get0: /)
      Assert.ok(err.stack.includes('cache-test basictest/get0: '))
      seneca.close(done)
    })
  })

  test('basictest passes plugin errors through', function (t, done) {
    // A broken cache: set fails with the plugin's own error.
    const seneca = make_seneca().use(function broken_set() {
      this.add('role:cache,cmd:set', function (msg, reply) {
        reply(new Error('disk full'))
      })
    })

    CacheTest.basictest(seneca, function (err) {
      Assert.ok(err)
      Assert.equal(err.cache_test_case, 'basictest/set0')
      Assert.match(err.message, /disk full/)
      seneca.close(done)
    })
  })

  test('basictest reports a missing pattern', function (t, done) {
    // A cache plugin without clear.
    const seneca = Seneca()
      .test()
      .quiet()
      .use(function partial_cache() {
        const store = new Map()
        this.add('role:cache,cmd:set', function (msg, reply) {
          store.set(msg.key, msg.val)
          reply({ key: msg.key })
        })
          .add('role:cache,cmd:get', function (msg, reply) {
            reply({ value: store.get(msg.key) })
          })
          .add('role:cache,cmd:add', function (msg, reply) {
            if (store.has(msg.key)) return reply(new Error('exists'))
            store.set(msg.key, msg.val)
            reply({ key: msg.key })
          })
          .add('role:cache,cmd:delete', function (msg, reply) {
            store.delete(msg.key)
            reply({ key: msg.key })
          })
          .add('role:cache,cmd:incr', function (msg, reply) {
            const v = store.get(msg.key)
            if (null == v) return reply({ value: false })
            store.set(msg.key, v + msg.val)
            reply({ value: v + msg.val })
          })
          .add('role:cache,cmd:decr', function (msg, reply) {
            const v = store.get(msg.key)
            if (null == v) return reply({ value: false })
            store.set(msg.key, v - msg.val)
            reply({ value: v - msg.val })
          })
          .add('role:cache,get:native', function (msg, reply) {
            reply(store)
          })
      })

    CacheTest.basictest(seneca, function (err) {
      Assert.ok(err)
      Assert.equal(err.cache_test_case, 'basictest/clear')
      Assert.equal(err.code, 'act_not_found')
      seneca.close(done)
    })
  })
})
