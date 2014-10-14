/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


var assert = require('assert')

var async = require('async')


exports.basictest = function(si,done) {

  si.ready(function(){
    console.log('BASIC')
    assert.ok( si )

    var cache = si.pin({role: 'cache', cmd: '*'});

    async.series(
      {
        set0: function(fin) {
          cache.set({key: 'a', val: '1'}, function(err, out) {
            if(err) return fin(err);
            assert(out, 'a');
            fin();
          });
        },

        get0: function(fin) {
          cache.get({key: 'a'}, function(err, out) {
            if(err) return fin(err);
            assert.equal(out, '1');
            fin();
          });
        },


        add0: function(fin) {
          cache.add({key: 'b', val: 1}, function(err, out) {
            if(err) return fin(err);
            assert.equal(out, 'b');
            fin();
          });
        },

        refuse_existing0: function(fin) {
          cache.add({key: 'b', val: 'something'}, function(err, out) {
            if(err) return fin(err);

            cache.get({key: 'b'}, function(err, out) {
              if(err) return fin(err);
              assert.equal(out, 1);
              fin();
            });
          });
        },

        incr0: function(fin) {
          cache.incr({key: 'b', val: 4}, function(err, out) {
            if(err) return fin(err);

            assert.equal(out, 5);
            fin();
          });
        },

        decr0: function(fin) {
          cache.decr({key: 'b', val: 3}, function(err, out) {
            if(err) return fin(err);

            assert.equal(out, 2);
            fin();
          });
        },

        only_incr_int0: function(fin) {
          cache.incr({key: 'a', val: 1}, function(err, out) {
            assert.ok(err)
            fin();
          });
        },


        only_decr_int0: function(fin) {
          cache.decr({key: 'a', val: 1}, function(err, out) {
            assert.ok(err)
            fin();
          });
        },

        delete0: function(fin) {
          cache.delete({key: 'a'}, function(err, out) {
            if(err) return fin(err);
            assert(out, 'a');

            cache.has({key: 'a'}, function(err, out) {
              if(err) return fin(err);
              assert.equal(out, false);
              fin();
            });
          });
        },

        delete1: function(fin) {
          cache.delete({key: 'b'}, function(err, out) {
            if(err) return fin(err);
            assert(out, 'a');

            cache.has({key: 'b'}, function(err, out) {
              if(err) return fin(err);
              assert.equal(out, false);
              fin();
            });
          });
        },

        native0: function(fin){
          si.act('role:cache,get:native',function(err,native){
            if(err) return fin(err);
            assert.ok(native)
            fin()
          })
        }

      },
      done)
  })
}

