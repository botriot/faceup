"use strict";

// For the mapping.coffee template
require('coffee-script')

var request = require('request')
  , Buffers = require('buffers')
  , im = require('imagemagick')
  , url = require('url')
  , async = require('async')
  , crypto = require('crypto')
  , mapping = require('../mapping')
  , util = require('./util')
  , cache = util.cache

var mashapeHash = crypto.createHmac('sha1', process.env.MASHAPE_API_SECRET)
    .update(process.env.MASHAPE_API_KEY)
    .digest('hex')

var mashapeAuth = Buffer(process.env.MASHAPE_API_KEY + ':' + mashapeHash).toString('base64')

var faceApis = {
  lambda: function(image, callback) {
    var uri = url.parse('https://lambda-face-detection-and-recognition.p.mashape.com/detect', true)
    uri.query = {
      images: image,
    }
    var options = {
        uri: url.format(uri),
        headers: {"X-Mashape-Authorization": mashapeAuth},
        json: true
    }
    request(options, function(err, response, data) {
      if (err) return callback(err)
      // console.log(JSON.stringify(data))
      if (data && data.photos && data.photos[0]) {
        // Convert the data to look like the face.com API
        data.photos[0].tags.forEach(function(face) {
          // Eyes are switched
          var eye_right = face.eye_right
          face.eye_right = face.eye_left
          face.eye_left = eye_right

          // Calculate the roll
          if (face.roll == null) {
            if (face.eye_right && face.eye_left) {
              face.roll = util.angle(face.eye_left, face.eye_right)
            } else {
              face.roll = 0
            }
          }
        })
      }
      callback(null, data)
    })
  }
}

function faceDetect(image, method, callback) {
  cache('face:' + method + ':' + image, function(i, callback) {
    if (!faceApis[method]) {
      return callback(Error('No such face api: ' + method))
    }
    faceApis[method](image, callback)
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
  var overlays = options.overlay.split(',')

  if (!photo.tags) {
    return callback(null, null)
  }

  var w = function(x) { return x }
  var h = function(y) { return y }

  photo.tags.forEach(function(face) {
    overlays.forEach(function(overlay) {
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
        var transform = mapping[overlay].call(util, face, photo)
      } catch (err) {
        // TODO Probably just missing the feature (like face.nose, etc)
        // console.log(err.stack)
        return
      }

      args = args.concat([
        '(',
        'overlays/'+overlay+'.png',
        '+distort'
      ])
      args = args.concat(transform)
      args.push(')')
    })
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
        face: async.apply(faceDetect, data.image, data.method),
        image: async.apply(fetchImage, data.image),
      },
      function(err, results) {
        if (err) return callback(err)

        if (results.face.photos == null || results.face.photos[0] == null) return callback(null, null)

        var options = {
          face: results.face,
          overlay: data.overlay,
          method: data.method
        }
        applyOverlay(results.image, options, callback)
      }
    )
  }, callback)
};
