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
        init0: function(fin) {
          cache.delete({key: 'a'}, function(err, out) {
            if(err) return fin(err);

            cache.delete({key: 'b'}, function(err, out) {
              if(err) return fin(err);
              fin();
            });
          });
        },

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
          cache.add({key: 'b', val: 2}, function(err, out) {
            if(err) return fin(err);
            assert.equal(out, 'b');
            fin();
          });
        },

        refuse_existing0: function(fin) {
          cache.add({key: 'b', val: 'something'}, function(err, out) {
            if(!err) return fin(new Error('refuse_existing0'));

            cache.get({key: 'b'}, function(err, out) {
              if(err) return fin(err);
              assert.equal(out, 2);
              fin();
            });
          });
        },

        incr0: function(fin) {
          cache.incr({key: 'b', val: 4}, function(err, out) {
            if(err) return fin(err);

            assert.equal(out, 6);
            fin();
          });
        },

        decr0: function(fin) {
          cache.decr({key: 'b', val: 3}, function(err, out) {
            if(err) return fin(err);

            assert.equal(out, 3);
            fin();
          });
        },

        delete0: function(fin) {
          cache.delete({key: 'a'}, function(err, out) {
            if(err) return fin(err);
            assert(out, 'a');

            cache.get({key: 'a'}, function(err, out) {
              if(err) return fin(err);
              assert.ok(!out);
              fin();
            });
          });
        },

        delete1: function(fin) {
          cache.delete({key: 'b'}, function(err, out) {
            if(err) return fin(err);
            assert(out, 'a');

            cache.get({key: 'b'}, function(err, out) {
              if(err) return fin(err);
              assert.ok(!out);
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

