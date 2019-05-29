'use strict'

var Assert = require('assert')

var Async = require('async')

exports.basictest = function(si, done) {
  si.ready(function() {
    Assert.ok(si)

    var ka = 'a-' + Math.random()
    var kb = 'b-' + Math.random()
    var kc = 'c-' + Math.random()
    var kq = 'q-' + Math.random()
    var kz = 'z-' + Math.random()

    Async.series(
      {
        init0: function(fin) {
          si.act('role:cache,cmd:delete', { key: ka }, function(err, out) {
            if (err) return fin(err)

            si.act('role:cache,cmd:delete', { key: kb }, function(err, out) {
              if (err) return fin(err)

              si.act('role:cache,cmd:delete', { key: kc }, function(err, out) {
                if (err) return fin(err)
                fin()
              })
            })
          })
        },

        set0: function(fin) {
          si.act('role:cache,cmd:set', { key: ka, val: '1' }, function(
            err,
            out
          ) {
            if (err) return fin(err)
            Assert(out, ka)
            fin()
          })
        },

        set_c: function(fin) {
          si.act('role:cache,cmd:set', { key: kc, val: '3' }, function(
            err,
            out
          ) {
            if (err) return fin(err)
            Assert(out, kc)
            fin()
          })
        },

        get0: function(fin) {
          si.act('role:cache,cmd:get', { key: ka }, function(err, out) {
            if (err) return fin(err)
            Assert.equal(out.value, '1')
            fin()
          })
        },

        add0: function(fin) {
          si.act('role:cache,cmd:add', { key: kb, val: 2 }, function(err, out) {
            if (err) return fin(err)
            Assert.equal(out.key, kb)
            fin()
          })
        },

        refuse_existing0: function(fin) {
          si.act('role:cache,cmd:add', { key: kb, val: 'something' }, function(
            err,
            out
          ) {
            if (!err) return fin(new Error('refuse_existing0'))

            si.act('role:cache,cmd:get', { key: kb }, function(err, out) {
              if (err) return fin(err)
              Assert.equal(out.value, 2)
              fin()
            })
          })
        },

        incr0: function(fin) {
          si.act('role:cache,cmd:incr', { key: kb, val: 4 }, function(
            err,
            out
          ) {
            if (err) return fin(err)

            Assert.equal(out.value, 6)
            fin()
          })
        },

        // key does not exist
        incr1: function(fin) {
          si.act('role:cache,cmd:incr', { key: kq, val: 1 }, function(
            err,
            out
          ) {
            if (err) return fin(err)

            Assert.equal(out.value, false)
            fin()
          })
        },

        decr0: function(fin) {
          si.act('role:cache,cmd:decr', { key: kb, val: 3 }, function(
            err,
            out
          ) {
            if (err) return fin(err)

            Assert.equal(out.value, 3)
            fin()
          })
        },

        val0: function(fin) {
          si.act('role:cache,cmd:set', { key: kz, val: 0 }, function(err, out) {
            if (err) return fin(err)
            Assert(out, 0)

            si.act('role:cache,cmd:incr', { key: kz, val: 1 }, function(
              err,
              out
            ) {
              if (err) return fin(err)
              Assert(out, 1)

              fin()
            })
          })
        },

        delete0: function(fin) {
          si.act('role:cache,cmd:delete', { key: ka }, function(err, out) {
            if (err) return fin(err)
            Assert(out, ka)

            si.act('role:cache,cmd:get', { key: ka }, function(err, out) {
              if (err) return fin(err)
              Assert.ok(!out.value)
              fin()
            })
          })
        },

        delete1: function(fin) {
          si.act('role:cache,cmd:delete', { key: kb }, function(err, out) {
            if (err) return fin(err)
            Assert(out, ka)

            si.act('role:cache,cmd:get', { key: kb }, function(err, out) {
              if (err) return fin(err)
              Assert.ok(!out.value)
              fin()
            })
          })
        },

        delete3: function(fin) {
          si.act('role:cache,cmd:delete', { key: kz }, function(err, out) {
            if (err) return fin(err)
            Assert(out, 1)

            si.act('role:cache,cmd:get', { key: kz }, function(err, out) {
              if (err) return fin(err)
              Assert.ok(null == out.value)
              fin()
            })
          })
        },

        native0: function(fin) {
          si.act('role:cache,get:native', function(err, native) {
            if (err) return fin(err)
            Assert.ok(native)
            fin()
          })
        }
      },
      done
    )
  })
}
