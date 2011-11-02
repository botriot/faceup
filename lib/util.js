"use strict";

var LRU = require("lru-cache")
  , lru = LRU(100)

var loading = {}

exports.cache = function(data, loader, callback) {
  var key = JSON.stringify(data)

  var result = lru.get(key)
  if (result) {
    return callback.apply(null, result)
  }

  if (loading[key]) {
    loading[key].push(callback)
  } else {
    loading[key] = [callback]
    loader(data, function(err) {
      var args = arguments
        , callbacks = loading[key]

      delete loading[key]

      if (!err) {
        lru.set(key, args)
      }

      callbacks.forEach(function(callback) {
        callback.apply(null, args)
      })
    })
  }
}

