exports.affine = function(func) {
  return function(face, photo) {
    var coords = func(face, photo)
    return ['Affine', coords.map(function(part, i) {
      // Convert the destination coords from percentages to pixels
      part = [part[0], part[1], part[2] * photo.width * 0.01, part[3] * photo.height * 0.01]

      return part[0]+','+part[1]+' '+part[2]+','+part[3]
    }).join(' ')]
  }
}
