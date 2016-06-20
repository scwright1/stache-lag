# Stache-lag GPS Synth

This demo uses GPS data supplied to by `R7` api, and does something a bit silly with it!

We take the current distance to finish, and the timestamp of each GPS coordinate, and create a speed characteristic from that (straight line speed based on distance to finish).  We then convert that into a speed in knots, and assign it to a musical note!

The synthesizer generation is being supplied by [Band.js](https://github.com/meenie/band.js/)

The tool supports 6 simultaneous "songs", tempo changes and volume changes.  It also supports playback on most modern browsers (recent Chrome, Firefox, Edge, Safari), and also includes touch support for mobile devices!

There is a live version here: [https://stephencwright.co.uk/stache-lag](https://stephencwright.co.uk/stache-lag)

`Time spent: ~12hrs`

## Known Issues

* Band.js creates a new AudioContext object every time you create a new conductor(!), so i've modified js/band.js to create a single globalAudioContext
* Bug with Band.js which causes a javascript error in low-tempo scenarios (recommended tempo is > 100)
* Bug with Band.js which incorrectly reports remaining time in high-tempo scenarios

## Libraries Used

* Band.js 1.1.1 (Sound synthesis) (+modification as noted above)
* jQuery 2.2.4 (DOM manipulation)

## Future Ideas(!)

* User-selected song groupings
* Change pitch of each note
* Change tempo of each song individually
* Add backing tracks (drums etc)
* Per-note pitch dependent on heading, tempo dependent on speed