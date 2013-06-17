"use strict";

// For the mapping.coffee template
require('coffee-script')

var request = require('request')
  , im = require('imagemagick')
  , url = require('url')
  , async = require('async')
  , crypto = require('crypto')
  , mapping = require('../mapping')
  , util = require('./util')
  , cache = util.cache
  , cv = {}// require('opencv')

var mashapeAuth = Buffer(process.env.MASHAPE_API_KEY).toString()

var queue = []
  , inUse = false
function cvLock(callback) {
  if (inUse) {
    queue.push(arguments)
  } else {
    inUse = true
    callback(function() {
      inUse = false
      queue.forEach(function(args) {
        process.nextTick(function() {
          cvLock.apply(this, args)
        })
      })
      queue = []
    })
  }
}

function cvDetect(im, name, callback) {
  cvLock(function(done) {
    im.detectObject('./cv/'+name+'.xml', {min: [20, 20]}, function(err, faces) {
      done()
      callback(err, faces)
    })
  })
}

function cvDetectSub(im, rect, name, callback) {
  var x = Math.max(0, rect.x)
    , y = Math.max(0, rect.y)
    , w = Math.min(im.width() - x, rect.width)
    , h = Math.min(im.height() - y, rect.height)
  var sub = new cv.Matrix(im, x, y, w, h)
  console.log(cvDetect, sub, name)
  cvDetect(sub, name, function(err, faces) {
    if (err) return callback(err)

    faces.forEach(function(face) {
      face.x += rect.x
      face.y += rect.y
    })

    callback(null, faces)
  })
}

// Cut the rectangle by percentages
function cut(rect, mod) {
  return {
    x: (mod.x ? rect.x + (mod.x * rect.width) : rect.x),
    y: (mod.y ? rect.y + (mod.y * rect.height) : rect.y),
    width: (mod.width ? mod.width * rect.width : rect.width),
    height: (mod.height ? mod.height * rect.height : rect.height),
  }
}

// Assumes biggest is the best...
function best(features) {
  var best = null;
  features.forEach(function(feature) {
    if (best == null || feature.x * feature.y > best.x * best.y) {
      best = feature
    }
  })
  return best
}

var faceApis = {
  cv: function(url, callback) {
    fetchImage(url, function(err, image) {
      if (err) return callback(err)
      cv.readImage(image, function(err, im) {
        console.log(im)
        var tags = []
        var photo = {
          url: url,
          width: im.width(),
          height: im.height(),
          tags: tags
        }
        var dectected = false
        function px(i) { return (i / photo.width) * 100 }
        function py(i) { return (i / photo.height) * 100 }
        function center(f) { return f && {x: px(f.x + (f.width / 2)), y: py(f.y + (f.height / 2))} }

        var imScaleMap = {}
        function imScale(i) {
          if (!imScaleMap[i]) {
            imScaleMap[i] = im.copy()
            imScaleMap[i].resize(im.width() * i, im.height() * i)
          }
          return imScaleMap[i]
        }

        cvDetect(im, 'FA2', function(err, faces) {
          console.log(faces)
          if (faces.length > 0) dectected = true
          async.forEach(faces, function(face, callback) {
            var scale = 1
            while (face.width * scale < 100 || face.height * scale < 100) {
              scale += 1
            }
            console.log("scale:", scale)
            var fim = imScale(scale)
            face.x *= scale
            face.y *= scale
            face.width *= scale
            face.height *= scale
            // var face2 = cut(face, {x: 0.0, y: 0.0, width: 1.0, height: 1.2})
            var face2 = face
            async.parallel(
              {
                // eyeglasses: async.apply(cvDetectSub, fim, cut(face2, {height: 0.5}), 'haarcascade_eye_tree_eyeglasses'),
                eyepair: async.apply(cvDetectSub, fim, cut(face2, {height: 0.6}), 'EP3'),
                eye_left: async.apply(cvDetectSub, fim, cut(face2, {height: 0.5, width: 0.6}), 'LE'),
                eye_right: async.apply(cvDetectSub, fim, cut(face2, {height: 0.5, x: 0.4, width: 0.6}), 'RE'),
                mouth: async.apply(cvDetectSub, fim, cut(face2, {x: 0.3, width: 0.4, y:0.5, height: 0.8}), 'M1'),
                nose: async.apply(cvDetectSub, fim, cut(face2, {x: 0.2, width: 0.6, y: 0.2, height: 0.6}), 'N2'),
              },
              function(err, results) {
                if (err) return callback("Failed for: + face: " + (err.stack || err))

                // TODO abstract this
                face.x /= scale
                face.y /= scale
                face.width /= scale
                face.height /= scale
                Object.keys(results).forEach(function(k) {
                  (results[k] || []).forEach(function(r) {
                    r.x /= scale
                    r.y /= scale
                    r.width /= scale
                    r.height /= scale
                  })
                })
                console.log(results)

                var roll = 0
                if (results.eye_left[0] && results.eye_right[0]) {
                  roll = util.angle(results.eye_left[0], results.eye_right[0])
                }

                if (results.eyepair[0] && !results.eye_left[0]) {
                  results.eye_left[0] = cut(results.eyepair[0], {width: 0.25})
                }

                if (results.eyepair[0] && !results.eye_right[0]) {
                  results.eye_right[0] = cut(results.eyepair[0], {x: 0.75, width: 0.25})
                }

                if (results.eye_left[0] && results.eye_right[0]) {
                  tags.push({
                    width: px(face.width),
                    height: py(face.height),
                    roll: roll,
                    center: center(face),
                    eye_left: center(results.eye_left[0]),
                    eye_right: center(results.eye_right[0]),
                    mouth_center: center(best(results.mouth)),
                    nose: center(best(results.nose)),
                  })
                }

                callback()
              }
            )
          }, function(err) {
            if (err) return callback(err)

            console.log(tags)
            callback(null, {photos: [photo], detected: dectected})
          })
        })
      })
    })
  },

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
    request({uri: image, encoding: null}, function(err, res, body) {
      if (err) return callback(err)
      callback(null, body)
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

  var w,h
  if (options.method == 'lambda') {
    var w = function(x) { return Math.floor(x) }
    var h = function(y) { return Math.floor(y) }
  } else {
    var w = function(x) { return x * photo.width * 0.01 }
    var h = function(y) { return y * photo.height * 0.01 }
  }

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

        if (results.face.photos == null || results.face.detected == false) return callback(null, null)

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
