var image = require('../lib/image')

exports.index = function(req, res, next) {
  return res.send('Index coming soon, check out /img?src=...&overlay=hipster', {'Content-Type': 'text/plain'}, 200)
}

exports.img = function(req, res, next) {
  var data = {
    image: req.param('src', 'http://www.librarising.com/astrology/celebs/images2/QR/queenelizabethii.jpg'),
    overlay: req.param('overlay', 'mustache')
  }

  image.mash(data, function(err, image) {
    if (err) return next(err)
    res.send(image, {'Content-Type': 'image/jpeg'}, 200)
  })
};
