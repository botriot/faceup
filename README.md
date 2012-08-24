### Example Face.com API output

```js
{
  "photos": [{
    "url": "http://faceup.me/image/tom-hanks.jpg",
    "pid": "F@376695198edd14a7845261783df98639_ffe3c8a29d26b55987205718b3e3a429",
    "width": 600,
    "height": 750,
    "tags": [{
      "tid": "TEMP_F@376695198edd14a7845261783df98639_ffe3c8a29d26b55987205718b3e3a429_69.58_47.53_0_0",
      "recognizable": true,
      "threshold": null,
      "uids": [],
      "gid": null,
      "label": "",
      "confirmed": false,
      "manual": false,
      "tagger_id": null,
      "width": 42.17,
      "height": 33.73,
      "center": {
        "x": 69.58,
        "y": 47.53
      },
      "eye_left": {
        "x": 62.91,
        "y": 38.32
      },
      "eye_right": {
        "x": 81.32,
        "y": 39.99
      },
      "mouth_left": {
        "x": 61.28,
        "y": 55.11
      },
      "mouth_center": {
        "x": 69.17,
        "y": 57.04
      },
      "mouth_right": {
        "x": 75.98,
        "y": 56.92
      },
      "nose": {
        "x": 70.92,
        "y": 51.02
      },
      "ear_left": null,
      "ear_right": null,
      "chin": null,
      "yaw": -3.91,
      "roll": 6.69,
      "pitch": -8.12,
      "attributes": {
        "face": {
          "value": "true",
          "confidence": 96
        },
        "gender": {
          "value": "male",
          "confidence": 83
        },
        "glasses": {
          "value": "false",
          "confidence": 94
        },
        "smiling": {
          "value": "true",
          "confidence": 43
        }
      }
    }]
  }],
  "status": "success",
  "usage": {
    "used": 9,
    "remaining": 4991,
    "limit": 5000,
    "reset_time_text": "Thu, 02 Aug 2012 06:40:20 +0000",
    "reset_time":1343889620
  }
}
```