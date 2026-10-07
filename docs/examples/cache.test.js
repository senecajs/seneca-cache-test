/* Copyright (c) 2026 Richard Rodger and other contributors, MIT License */
'use strict'

// The standard cache tests, run against the in-memory plugin with the
// Node.js test runner. Companion to docs/tutorials/add-the-standard-tests.md.
//
//   node --test docs/examples/cache.test.js

const { test } = require('node:test')

const Seneca = require('seneca')
const CacheTest = require('../..') // in your plugin: require('@seneca/cache-test')

const mem_cache = require('./mem-cache')

test('standard cache tests', function (t, done) {
  // quiet(): the refuse_existing0 case provokes one error, which test mode
  // would otherwise log. Do not pass `done` to test(): that would turn the
  // expected error into a test failure.
  const seneca = Seneca().test().quiet().use(mem_cache)

  CacheTest.basictest(seneca, function (err) {
    if (err) return done(err)
    seneca.close(done)
  })
})
