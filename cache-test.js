/* Copyright (c) 2014-2026 Richard Rodger and other contributors, MIT License */
'use strict'

// Standard test cases for Seneca cache plugins.
//
// Each exported function receives a Seneca instance (`si`) on which the cache
// plugin under test is loaded, and a completion callback `done(err)`. The
// cases send `role:cache` messages and assert on the replies. The instance is
// not closed; the caller closes it.

var Assert = require('assert')

var Async = require('async')

// The basic cache contract: set, get, add, delete, incr, decr, clear and
// get:native. Keys are random so that the cases can run against a shared
// cache server.
exports.basictest = function (si, done) {
  si.ready(function () {
    Assert.ok(si)

    var ka = 'a-' + Math.random()
    var kb = 'b-' + Math.random()
    var kc = 'c-' + Math.random()
    var kq = 'q-' + Math.random()
    var kz = 'z-' + Math.random()

    Async.series(
      cases('basictest', {
        // Start from a clean state: deleting an unknown key is not an error.
        init0: function (fin) {
          si.act('role:cache,cmd:delete', { key: ka }, function (err, out) {
            if (err) return fin(err)

            si.act('role:cache,cmd:delete', { key: kb }, function (err, out) {
              if (err) return fin(err)

              si.act('role:cache,cmd:delete', { key: kc }, function (err, out) {
                if (err) return fin(err)
                fin()
              })
            })
          })
        },

        set0: function (fin) {
          si.act(
            'role:cache,cmd:set',
            { key: ka, val: '1' },
            function (err, out) {
              if (err) return fin(err)
              check(fin, function () {
                Assert.equal(out.key, ka)
              })
            },
          )
        },

        set_c: function (fin) {
          si.act(
            'role:cache,cmd:set',
            { key: kc, val: '3' },
            function (err, out) {
              if (err) return fin(err)
              check(fin, function () {
                Assert.equal(out.key, kc)
              })
            },
          )
        },

        get0: function (fin) {
          si.act('role:cache,cmd:get', { key: ka }, function (err, out) {
            if (err) return fin(err)
            check(fin, function () {
              Assert.equal(out.value, '1')
            })
          })
        },

        add0: function (fin) {
          si.act(
            'role:cache,cmd:add',
            { key: kb, val: 2 },
            function (err, out) {
              if (err) return fin(err)
              check(fin, function () {
                Assert.equal(out.key, kb)
              })
            },
          )
        },

        // add must refuse an existing key with an error and leave the value alone
        refuse_existing0: function (fin) {
          si.act(
            'role:cache,cmd:add',
            { key: kb, val: 'something' },
            function (err, out) {
              if (!err) {
                return fin(
                  new Error(
                    'cmd:add replied without an error for an existing key',
                  ),
                )
              }

              si.act('role:cache,cmd:get', { key: kb }, function (err, out) {
                if (err) return fin(err)
                check(fin, function () {
                  Assert.equal(out.value, 2)
                })
              })
            },
          )
        },

        incr0: function (fin) {
          si.act(
            'role:cache,cmd:incr',
            { key: kb, val: 4 },
            function (err, out) {
              if (err) return fin(err)
              check(fin, function () {
                Assert.equal(out.value, 6)
              })
            },
          )
        },

        // key does not exist
        incr1: function (fin) {
          si.act(
            'role:cache,cmd:incr',
            { key: kq, val: 1 },
            function (err, out) {
              if (err) return fin(err)
              check(fin, function () {
                Assert.equal(out.value, false)
              })
            },
          )
        },

        decr0: function (fin) {
          si.act(
            'role:cache,cmd:decr',
            { key: kb, val: 3 },
            function (err, out) {
              if (err) return fin(err)
              check(fin, function () {
                Assert.equal(out.value, 3)
              })
            },
          )
        },

        // zero is a valid value
        val0: function (fin) {
          si.act(
            'role:cache,cmd:set',
            { key: kz, val: 0 },
            function (err, out) {
              if (err) return fin(err)
              check(
                fin,
                function () {
                  Assert.ok(out)
                },
                function () {
                  si.act(
                    'role:cache,cmd:incr',
                    { key: kz, val: 1 },
                    function (err, out) {
                      if (err) return fin(err)
                      check(fin, function () {
                        Assert.ok(out)
                      })
                    },
                  )
                },
              )
            },
          )
        },

        delete0: function (fin) {
          si.act('role:cache,cmd:delete', { key: ka }, function (err, out) {
            if (err) return fin(err)
            check(
              fin,
              function () {
                Assert.ok(out)
              },
              function () {
                si.act('role:cache,cmd:get', { key: ka }, function (err, out) {
                  if (err) return fin(err)
                  check(fin, function () {
                    Assert.ok(!out.value)
                  })
                })
              },
            )
          })
        },

        delete1: function (fin) {
          si.act('role:cache,cmd:delete', { key: kb }, function (err, out) {
            if (err) return fin(err)
            check(
              fin,
              function () {
                Assert.ok(out)
              },
              function () {
                si.act('role:cache,cmd:get', { key: kb }, function (err, out) {
                  if (err) return fin(err)
                  check(fin, function () {
                    Assert.ok(!out.value)
                  })
                })
              },
            )
          })
        },

        delete3: function (fin) {
          si.act('role:cache,cmd:delete', { key: kz }, function (err, out) {
            if (err) return fin(err)
            check(
              fin,
              function () {
                Assert.ok(out)
              },
              function () {
                si.act('role:cache,cmd:get', { key: kz }, function (err, out) {
                  if (err) return fin(err)
                  check(fin, function () {
                    Assert.ok(null == out.value)
                  })
                })
              },
            )
          })
        },

        clear: function (fin) {
          si.act('role:cache,cmd:clear', function (err, out) {
            if (err) return fin(err)

            si.act('role:cache,cmd:get', { key: kc }, function (err, out) {
              if (err) return fin(err)
              check(fin, function () {
                Assert.ok(null == out.value)
              })
            })
          })
        },

        native0: function (fin) {
          si.act('role:cache,get:native', function (err, native) {
            if (err) return fin(err)
            check(fin, function () {
              Assert.ok(native)
            })
          })
        },
      }),
      function (err, results) {
        // Leave the Seneca callback context before calling back, so that an
        // exception thrown by `done` is not swallowed by Seneca.
        setImmediate(done, err, results)
      },
    )
  })
}

// Run the assertions of a case inside a try/catch and finish the case:
// fin(err) when an assertion fails, otherwise next() when given, or fin().
// Seneca (3 and 4) catches an exception thrown inside an action callback,
// logs it as an act_callback error and does not call the callback again, so
// an assertion thrown there would never reach `done`: the test would only
// time out.
function check(fin, assertions, next) {
  var err = null
  try {
    assertions()
  } catch (e) {
    err = e
  }
  if (err) return fin(err)
  return next ? next() : fin()
}

// Name each case so that a failure reports which case failed:
// err.cache_test_case is '<suite>/<case>', and the message (and the first
// line of the stack) is prefixed with it.
function cases(suite, steps) {
  var named = {}
  Object.keys(steps).forEach(function (name) {
    named[name] = function (fin) {
      steps[name](function (err) {
        if (err && null == err.cache_test_case) {
          var original = err.message
          err.cache_test_case = suite + '/' + name
          err.message = 'cache-test ' + err.cache_test_case + ': ' + original

          // Test runners print the stack, which holds the original message.
          if ('string' === typeof err.stack && original) {
            err.stack = err.stack.replace(original, function () {
              return err.message
            })
          }
        }
        fin(err)
      })
    }
  })
  return named
}
