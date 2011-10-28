// For the mapping.coffee template
require('coffee-script')

var request = require('request')
  , Buffers = require('buffers')
  , im = require('imagemagick')
  , url = require('url')
  , async = require('async')
  , mapping = require('../mapping')

function faceDetect(image, callback) {
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
}

function fetchImage(image, callback) {
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
}

function applyOverlay(image, options, callback) {
  var args = [
    '-',
    '-virtual-pixel',
    'transparent',
  ]

  var photo = options.face.photos[0]

  options.face.photos[0].tags.forEach(function(face) {
    try {
      var transform = mapping[options.overlay](face, photo)
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

  var proc = im.convert(args, function(err, stdout, stdin) {
    if (err) return callback(err)

    // THIS IS STUPID, IMAGEMAGICK Y U NO OUTPUT A BUFFER?!
    stdout = Buffer(stdout, 'binary')

    callback(err, stdout)
  })
  proc.stdin.end(image)
}

exports.index = function(req, res, next){
  var image = req.param('src', 'http://www.librarising.com/astrology/celebs/images2/QR/queenelizabethii.jpg')

  // TODO CACHING!!!

  async.parallel(
    {
      face: async.apply(faceDetect, image),
      image: async.apply(fetchImage, image),
    },
    function(err, results) {
      var options = {
        face: results.face,
        overlay: req.param('overlay', 'mustache')
      }
      applyOverlay(results.image, options, function(err, image) {
        res.send(image, {'Content-Type': 'image/jpeg'}, 200)
      })
    }
  )
};
