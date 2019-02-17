'use strict'

var Assert = require('assert')

var Async = require('async')

exports.basictest = function(si, done) {
  si.ready(function() {
    Assert.ok(si)

    Async.series(
      {
        init0: function(fin) {
          si.act('role:cache,cmd:delete', { key: 'a' }, function(err, out) {
            if (err) return fin(err)

            si.act('role:cache,cmd:delete', { key: 'b' }, function(err, out) {
              if (err) return fin(err)
              fin()
            })
          })
        },

        set0: function(fin) {
          si.act('role:cache,cmd:set', { key: 'a', val: '1' }, function(
            err,
            out
          ) {
            if (err) return fin(err)
            Assert(out, 'a')
            fin()
          })
        },

        get0: function(fin) {
          si.act('role:cache,cmd:get', { key: 'a' }, function(err, out) {
            if (err) return fin(err)
            Assert.equal(out.value, '1')
            fin()
          })
        },

        add0: function(fin) {
          si.act('role:cache,cmd:add', { key: 'b', val: 2 }, function(
            err,
            out
          ) {
            if (err) return fin(err)
            Assert.equal(out.key, 'b')
            fin()
          })
        },

        refuse_existing0: function(fin) {
          si.act('role:cache,cmd:add', { key: 'b', val: 'something' }, function(
            err,
            out
          ) {
            if (!err) return fin(new Error('refuse_existing0'))

            si.act('role:cache,cmd:get', { key: 'b' }, function(err, out) {
              if (err) return fin(err)
              Assert.equal(out.value, 2)
              fin()
            })
          })
        },

        incr0: function(fin) {
          si.act('role:cache,cmd:incr', { key: 'b', val: 4 }, function(
            err,
            out
          ) {
            if (err) return fin(err)

            Assert.equal(out.value, 6)
            fin()
          })
        },

        decr0: function(fin) {
          si.act('role:cache,cmd:decr', { key: 'b', val: 3 }, function(
            err,
            out
          ) {
            if (err) return fin(err)

            Assert.equal(out.value, 3)
            fin()
          })
        },

        val0: function(fin) {
          si.act('role:cache,cmd:set', { key: 'z', val: 0 }, function(
            err,
            out
          ) {
            if (err) return fin(err)
            Assert(out, 0)

            si.act('role:cache,cmd:incr', { key: 'z', val: 1 }, function(
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
          si.act('role:cache,cmd:delete', { key: 'a' }, function(err, out) {
            if (err) return fin(err)
            Assert(out, 'a')

            si.act('role:cache,cmd:get', { key: 'a' }, function(err, out) {
              if (err) return fin(err)
              Assert.ok(!out.value)
              fin()
            })
          })
        },

        delete1: function(fin) {
          si.act('role:cache,cmd:delete', { key: 'b' }, function(err, out) {
            if (err) return fin(err)
            Assert(out, 'a')

            si.act('role:cache,cmd:get', { key: 'b' }, function(err, out) {
              if (err) return fin(err)
              Assert.ok(!out.value)
              fin()
            })
          })
        },

        delete3: function(fin) {
          si.act('role:cache,cmd:delete', { key: 'z' }, function(err, out) {
            if (err) return fin(err)
            Assert(out, 1)

            si.act('role:cache,cmd:get', { key: 'z' }, function(err, out) {
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
