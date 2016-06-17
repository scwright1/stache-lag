
document.addEventListener('DOMContentLoaded', function() {
    S.populateFrequencies();
    //off we go!
    SLS.loadData('c6002016').then(SLS.processData).then(SLS.processTones).catch(function(err){
        alert(err);
    });
});

if (typeof S === "undefined") {

    var S = {};

    S.bases = [
        {"Note": "Co", "Frequency":32.7032},
        {"Note": "Db", "Frequency":34.6478},
        {"Note": "Do", "Frequency":36.7081},
        {"Note": "Eb", "Frequency":38.8909},
        {"Note": "Eo", "Frequency":41.2034},
        {"Note": "Fo", "Frequency":43.6535},
        {"Note": "Gb", "Frequency":46.2493},
        {"Note": "Go", "Frequency":48.9994},
        {"Note": "Ab", "Frequency":51.9131},
        {"Note": "Ao", "Frequency":55.0000},
        {"Note": "Bb", "Frequency":58.2705},
        {"Note": "Bo", "Frequency":61.7354}

    ];

    S.frequencies = [];

    S.library = {
        "C1":{"Frequency":{"Start":32.7032},"Volume":{"Master":0.1,"Sustain":0.24,"Decay":0.241,"Punch":0.56,"Attack":0.001},"Generator":{"Func":"synth"}},    };

    S.sfx = {};

    S.populateFrequencies = function() {
        for(var x = 1; x < 8; x++) {
            S.bases.forEach(function(frequency, index) {
                S.frequencies.push(frequency.Frequency * x);
            });
        }
    };

}


/**
 * SLS namespace
 */

if (typeof SLS === "undefined") {


    var SLS = {};

    SLS.teams = {};
    SLS.tones = [];

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

                //firstly, read all of the positions into an array, so that we can manipulate it easier
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
                    if(j > 0) {
                        var currDTF = set.dtf;
                        var prevDTF = positionArray[j-1].dtf;
                        var dtfDiff = prevDTF - currDTF;

                        //ok cool, got that, so now we work out the time between polls
                        var currTime = set.at;
                        var prevTime = positionArray[j-1].at;
                        var timeDiff = currTime - prevTime;

                        //so that gives us the time elapsed between the previous poll and now (in seconds)
                        //from that, we can work out the speed in knots
                        //1 knot = 1.852km/h
                        //
                        //so if we travel dtfDiff metres in timeDiff seconds, that means:
                        //
                        // dtfDiff / timeDiff = metres per second,  * 3600 = metres per hour, / 1000 = km/h, / 1.852 = knots (!)

                        var metresPerSecond = dtfDiff / timeDiff;
                        var metresPerHour = metresPerSecond * 3600;
                        var kmPerHour = metresPerHour / 1000;
                        var knots = kmPerHour / 1.852;
                        //finally, we want to round to the nearest decimal (to keep things simple)
                        knots = Math.ceil(knots);

                        //normalize the value into a range that is most appropriate to the notes (there are 88 notes, so we add 30)
                        //
                        knots = knots + 30;
                        toneArray.push(knots);
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
        tones.forEach(function(tone, index) {
            //so we have our tone index, now we need to match it up to the right tone

            //should be able to generate a tone and play it
        });
    }
}