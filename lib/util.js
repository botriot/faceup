"use strict";

var loading = {}

exports.cache = function(data, loader, callback) {
  var key = JSON.stringify(data)
  if (loading[key]) {
    loading[key].push(callback)
    console.log('added to queue: ' + key)
  } else {
    console.log('starting: ' + key)
    loading[key] = [callback]
    loader(data, function() {
      var args = arguments
        , callbacks = loading[key]

      delete loading[key]

      callbacks.forEach(function(callback) {
        callback.apply(null, args)
      })
    })
  }
}

