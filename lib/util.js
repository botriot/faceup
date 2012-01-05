"use strict";

var LRU = require("lru-cache")
  , lru = LRU(100)

var loading = {}

var x = exports.x = function(e) {
  return e.x || e[0]
}

var y = exports.y = function(e) {
  return e.y || e[1]
}

exports.distance = function(a, b) {
  return Math.sqrt(
    Math.pow(Math.abs(x(a) - x(b)), 2) +
    Math.pow(Math.abs(y(a) - y(b)), 2)
  )
}

exports.angle = function(a, b) {
  return Math.atan(
    (y(b) - y(a)) /
    (x(b) - x(a))
  ) / Math.PI * 180
}

exports.middle = function(a, b) {
  return [
    (x(b) - x(a)) * 0.5 + x(a),
    (y(b) - y(a)) * 0.5 + y(a)
  ]
}

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

