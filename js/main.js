$(document).ready(function() {
    T.init();
    //off we go!
    SLS.loadData('c6002016').then(SLS.processData).then(SLS.processTones).catch(function(err){
        alert(err);
    });
});

/**
 * Tones namespace
 */

if (typeof T === "undefined") {

    var T = {};

    T.player = {};

    T.keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    T.toneMap = [];

    T.conductor = new BandJS();

    T.baseInstrument = {};

    T.init = function() {
        T.conductor.setTimeSignature(4,4);
        T.conductor.setTempo(120);
        T.baseInstrument = T.conductor.createInstrument('square');

        for (var i = 0; i < 9; i++) {
            T.keys.forEach(function(key, index) {
                T.toneMap.push(key+i);
            });
        }

        //corner case, add C8
        T.toneMap.push("C8");
    };

}

/**
 * SLS namespace
 */

if (typeof SLS === "undefined") {


    var SLS = {};

    SLS.teams = {};
    SLS.tones = [];
    SLS.audio = [];

    SLS.loadData = function(dataset) {
        //return the data as a promise so that we're always ensuring that we're getting the dataset before we do anything with it
        var loadFromR7 = new Promise(function(resolve, reject) {
            if(dataset !== "") {
                R7.load(dataset, function(data) {
                    resolve(data);
                }, function() {
                    reject("Failed to load Dataset \""+dataset+"\"");
                });
            }
        });
        return loadFromR7;
    };

    SLS.processData = function(data) {
        var processed = new Promise(function(resolve, reject) {
            SLS.teams = data;
            SLS.teams.forEach(function(team, i) {

                //Append the team as a new div in the players div (for it's player)
                //pulled in jquery for this, because it's easier to do DOM manipulation with it
                var playerDiv = $("<div class='player bg-dark-complimentary'></div>");
                $("#players").append(playerDiv);
                playerDiv.append("<div class='team-name'>"+team.name+"</div>");
                playerDiv.append("<div class='player-controls' data-team-id="+i+"><button>Stop</button> <button>Play</button></div>");

                //read all of the positions into an array, so that we can manipulate it easier
                var positionArray = [];
                var toneArray = [];
                team.positions.forEach(function(position, j) {
                    positionArray.push(position);
                });
                //reverse the array so that we work from start to finish, not finish to start
                positionArray.reverse();
                //now if we loop through it, we should end up with the higher dtf first
                positionArray.forEach(function(set, j) {
                    //ok, so find the distance travelled between each polled point
                    //Ignore if we're on the first point (Can't work out a speed here!)

                    var tD = 0;
                    var pD = 0;
                    var knots = 0;

                    if(j > 0) {
                        //get the position delta
                        pD = (positionArray[j-1].dtf) - (set.dtf);

                        //get the time delta
                        tD = set.at - positionArray[j-1].at;

                        //so that gives us the time elapsed between the previous poll and now (in seconds)
                        //from that, we can work out the speed in knots
                        //1 knot = 1.852km/h
                        //
                        //so if we travel dtfDiff metres in timeDiff seconds, that means:
                        //
                        // dtfDiff / timeDiff = metres per second,  * 3600 = metres per hour, / 1000 = km/h, / 1.852 = knots (!)

                        //finally, we want to round to the nearest decimal (to keep things simple)
                        // and normalize the value into a range that is most appropriate to the notes (there are 88 notes, so we add 30)

                        knots = Math.ceil((((pD / tD) * 3600) / 1000) / 1.852) + 30;

                        /**
                         * Might want to change this in the future!
                         * - for now, remove any instances where speed is 0 (therefore the knots would be "30")
                         */
                         if(knots !== 30) {
                            toneArray.push(knots);
                         }
                    }
                });

                SLS.tones.push({"Team": team.name, "Tones": toneArray});
                resolve();
            });
        });
        return processed;
    };

    SLS.processTones = function() {
        var team = SLS.tones[0];
        var tones = team.Tones;

        // do the mario intro, because lol
        T.baseInstrument.note('sixteenth', 'E5, F#4')
        .note('sixteenth', 'E5, F#4')
        .rest('sixteenth')
        .note('sixteenth', 'E5, F#4');
        T.baseInstrument.rest('sixteenth')
        .note('sixteenth', 'C5, F#4')
        .note('sixteenth', 'E5, F#4')
        .rest('sixteenth');
        T.baseInstrument.note('sixteenth', 'G5, B4, G4')
        .rest('sixteenth')
        .rest('eighth');
        T.baseInstrument.note('sixteenth', 'G4')
        .rest('sixteenth')
        .rest('eighth');
        ///////

        tones.forEach(function(tone, index) {
            //so we have our tone index, now we need to match it up to the right tone
            //should be able to generate a tone and play it
            T.baseInstrument.note('eighth', T.toneMap[tone]);
        });
        T.player = T.conductor.finish();
    }
}