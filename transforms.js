var util = require('./lib/util')
  , x = util.x
  , y = util.y

exports.srt = function(func) {
  return function(face, photo) {
    var coords = func.call(this, face, photo)
    return ['SRT', coords.map(function(part, i) {
      if (i == 3) {
        part = [x(part), y(part)]
      }
      return (Array.isArray(part) ? part.join(',') : part)
    }).join(' ')]
  }
}
exports.affine = function(func) {
  return function(face, photo) {
    var result = func.call(this, face, photo)
    return ['Affine', result.map(function(part, i) {
      // Convert the destination coords from percentages to pixels
      if (part.length == 3) {
        part = [part[0], part[1], x(part[2]), y(part[2])]
      }

      return part[0]+','+part[1]+' '+part[2]+','+part[3]
    }).join(' ')]
  }
}
