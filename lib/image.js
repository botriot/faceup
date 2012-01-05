"use strict";

// For the mapping.coffee template
require('coffee-script')

var request = require('request')
  , Buffers = require('buffers')
  , im = require('imagemagick')
  , url = require('url')
  , async = require('async')
  , mapping = require('../mapping')
  , util = require('./util')
  , cache = util.cache

function faceDetect(image, callback) {
  cache('face:' + image, function(i, callback) {
    var uri = url.parse('http://api.face.com/faces/detect.json', true)
    uri.query = {
      api_key: process.env.FACE_API_KEY,
      api_secret: process.env.FACE_API_SECRET,
      urls: image,
    }
    request({uri: url.format(uri), json: true}, function(err, response, data) {
      if (err) return callback(err)
      callback(null, data)
    })
  }, callback)
}

function fetchImage(image, callback) {
  cache('image:' + image, function(i, callback) {
    request({uri: image, onResponse: true}, function(err, res) {
      if (err) return callback(err)
      var data = Buffers()
      res.on('data', function(chunk) {
        data.push(chunk)
      })
      res.on('end', function() {
        callback(null, data.toBuffer())
      })
    })
  }, callback)
}

function applyOverlay(image, options, callback) {
  var args = [
    '-',
    '-virtual-pixel',
    'transparent',
  ]

  var photo = options.face.photos[0]

  if (!photo.tags) {
    return callback(null, null)
  }

  var w = function(x) { return x * photo.width * 0.01 }
  var h = function(y) { return y * photo.height * 0.01 }

  photo.tags.forEach(function(face) {
    // TODO move this conversion to a better spot
    if (!face.converted) {
      face.width = w(face.width)
      face.height = h(face.height)
      Object.keys(face).forEach(function(k) {
        var v = face[k]
        if (v && v.x) v.x = w(v.x)
        if (v && v.y) v.y = h(v.y)
      })
      face.converted = true
    }

    try {
      var transform = mapping[options.overlay].call(util, face, photo)
    } catch (err) {
      // TODO Probably just missing the feature (like face.nose, etc)
      // console.log(err.stack)
      return
    }

    args = args.concat([
      '(',
      'overlays/'+options.overlay+'.png',
      '+distort'
    ])
    args = args.concat(transform)
    args.push(')')
  })

  args.push('-flatten')
  args.push('jpg:-')

  // console.log(args.join(' '))

  var proc = im.convert(args, function(err, stdout, stdin) {
    if (err) return callback(err)

    // THIS IS STUPID, IMAGEMAGICK Y U NO OUTPUT A BUFFER?!
    stdout = Buffer(stdout, 'binary')

    callback(err, stdout)
  })
  proc.stdin.end(image)
}

exports.mash = function(data, callback){
  cache(data, function(data, callback) {
    console.log('overlay:', data.overlay, 'image:', data.image)
    async.parallel(
      {
        face: async.apply(faceDetect, data.image),
        image: async.apply(fetchImage, data.image),
      },
      function(err, results) {
        if (err) return callback(err)

        if (!results.face.photos[0]) return callback(null, null)

        var options = {
          face: results.face,
          overlay: data.overlay
        }
        applyOverlay(results.image, options, callback)
      }
    )
  }, callback)
};
