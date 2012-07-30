var image = require('../lib/image')

exports.index = function(req, res, next) {
  return res.sendfile('public/index.html')
}

exports.img = function(req, res, next) {
  var data = {
    image: req.param('src', 'http://www.librarising.com/astrology/celebs/images2/QR/queenelizabethii.jpg'),
    overlay: req.param('overlay', 'mustache'),
    method: req.param('method', 'face')
  }

  image.mash(data, function(err, image) {
    if (err) {
      console.log(err.stack || err)
      return res.sendfile('public/images/fail.png')
    }
    if (!image) {
      return res.sendfile('public/images/fail.png')
    }
    res.send(image, {'Content-Type': 'image/jpeg'}, 200)
  })
};
