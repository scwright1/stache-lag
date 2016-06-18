$(document).ready(function() {
    T.init();
    //off we go!
    SLS.loadData('c6002016').then(SLS.processData).catch(function(err){
        alert(err);
    });
});

/**
 * Tones namespace
 */

if (typeof T === "undefined") {

    var T = {};

    T.keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    T.toneMap = [];

    T.songMap = [];

    T.init = function() {

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
                playerDiv.append("<div class='player-controls' data-team-id="+i+"><button onclick='SLS.stop(this);'>Stop</button> <button onclick='SLS.play_pause(this);'>Play</button></div>");

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

    SLS.processTones = function(team) {
        //create a new BandJS instance (we do this because we BandJS is pretty poor at handling multi-instances)
        //now, this "song" will be relative to this conductor, so we can start/pause/stop it as we like
        var conductor = new BandJS();
        conductor.setTempo(120);
        conductor.setTimeSignature(4,4);
        var song = conductor.createInstrument('square');
        SLS.tones[team].Tones.forEach(function(tone, j) {
            //so we have our tone index, now we need to match it up to the right tone
            //should be able to generate a tone and play it
            song.note('eighth', T.toneMap[tone]);
        });

        var player = conductor.finish();
        var length = conductor.getTotalSeconds();
        var songRef = T.songMap.push({"Team": team, "Conductor": conductor, "Player": player, "Playing": true}) - 1;
        T.songMap[songRef].Player.play();
    }

    SLS.play_pause = function(obj) {
        var id = $(obj).parent().data('team-id');
        var index = SLS.getArrayIndexForObjWithAttr(T.songMap, "Team", id);
        if(index !== -1) {
            if(T.songMap[index].Playing === true) {
                T.songMap[index].Player.pause();
                T.songMap[index].Playing = false;
                $(obj).text('Play');
            } else {
                T.songMap[index].Player.play();
                T.songMap[index].Playing = true;
                $(obj).text('Pause');
            }
        } else {
            SLS.processTones(id);
            $(obj).text('Pause');
        }
    }

    SLS.stop = function(obj) {
        var id = $(obj).parent().data('team-id');
        var index = SLS.getArrayIndexForObjWithAttr(T.songMap, "Team", id);
        if(index !== -1) {
            T.songMap[index].Player.stop();
            T.songMap[index].Playing = false;
            $(obj).next().text('Play');

            //GC remove the last played song (we do this because BandJS doesn't handle multi-instancing very well)
            //T.songMap.splice(index, 1);
        } else {
            //no valid index to stop
        }
    }

    //helper function, find array index of an object with a particular attribute
    SLS.getArrayIndexForObjWithAttr = function(array, attr, value) {
    for(var i = 0; i < array.length; i++) {
        if(array[i].hasOwnProperty(attr) && array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}
}