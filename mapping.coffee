{affine} = require './transforms'

# -- AFFINE
# affine mappings have a list of control points. the first two numbers are
# the x,y coords of a pixel on the overlay image. The next two numbers are
# a point on the destination image (expressed percentage, 0-100). You can
# use the various face.{eye_left,eye_right,nose,mouth_left,...} helpers.

module.exports =
  hipster: affine (face) -> [
    [138, 80, face.eye_left.x, face.eye_left.y]
    [314, 80, face.eye_right.x, face.eye_right.y]
  ]

  mustache: affine (face) -> [
    [249, 0, face.nose.x, face.nose.y]
    [249, 105, face.mouth_center.x, face.mouth_center.y]
  ]

  clown: affine (face) -> [
    [108, 111, face.nose.x, face.nose.y]
    [108, 202, face.mouth_center.x, face.mouth_center.y]
  ]

  scumbag: affine (face) -> [
    [79, 129, face.eye_left.x, face.eye_left.y]
    [137, 120, face.eye_right.x, face.eye_right.y]
  ]

  jason: affine (face) -> [
    [95, 176, face.eye_left.x, face.eye_left.y]
    [223, 208, face.eye_right.x, face.eye_right.y]
    [131, 316, face.mouth_center.x, face.mouth_center.y]
  ]



  rohan: affine (face) -> [
    [49, 107, face.eye_left.x, face.eye_left.y]
    [135, 107, face.eye_right.x, face.eye_right.y]
    [88, 202, face.mouth_center.x, face.mouth_center.y]
  ]
