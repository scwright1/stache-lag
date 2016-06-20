# Stache-lag GPS Synth

This demo uses GPS data supplied to by `R7` api, and does something a bit silly with it!

We use the haversine formula to work out the great-circle distance between two gps coordinates (See SLS.haversine).  We then work out the time delta between each of the pings, and work out the speed of the boat in knots.

Also, because we can, we also use the bearing to determine the note speed! (See SLS.bearing)  If the bearing falls in each 30 degree increment (there are 12 possible note speeds), then we apply that speed to the note!

The synthesizer generation is being supplied by [Band.js](https://github.com/meenie/band.js/)

The tool supports 6 simultaneous "songs", tempo changes and volume changes.  It also supports playback on most modern browsers (Tested on Chrome, Firefox, Safari), and also includes touch support for mobile devices! (Tested on Chrome and Safari on iOS 9.3.2)

There is a live version here: [https://stephencwright.co.uk/stache-lag](https://stephencwright.co.uk/stache-lag)

`Time spent: ~14hrs`

## Known Issues

* Band.js creates a new AudioContext object every time you create a new conductor(!), so i've modified js/band.js to create a single globalAudioContext
* Bug with Band.js which causes a javascript error in low-tempo scenarios (recommended tempo is > 100)
* Bug with Band.js which incorrectly reports remaining time in high-tempo scenarios
* It is possible to swipe the Tempo and Volume controls below Min, and above Max, making it impossible to get them back :-()

## Libraries Used

* Band.js 1.1.1 (Sound synthesis) (+modification as noted above)
* jQuery 2.2.4 (DOM manipulation)

## Future Ideas(!)

* User-selected song groupings
* Change pitch of each note
* Change tempo of each song individually
* Add backing tracks (drums etc)
* Map mashup showing GPS log locations as notes visually!