$(document).ready(function() {
    T.init();
    //off we go!
    SLS.setupMasterControlSliders();
    SLS.loadData('c6002016').then(SLS.processData).catch(function(err){
        alert(err);
    });

    //inline functions for operations during use
    $('.control-handle').bind('mousedown touchstart', function(e) {
        e.preventDefault();

        //edge condition for touch devices
        if(e.pageX) {
            T.startDragPosition = e.pageX;
        } else {
            T.startDragPosition = e.originalEvent.touches[0].pageX;
        }

        T.dragging = true;
        T.element = $(this).parent().parent();
        T.startWidth = $(this).parent().width();

        $(document).bind('mousemove touchmove', function(e) {

            var result, scale, offset = 0;

            //edge condition for touch devices
            if(e.pageX) {
                offset = e.pageX - T.startDragPosition;
            } else {
                offset = e.originalEvent.touches[0].pageX - T.startDragPosition;
            }
            var type = T.element.data('controller');
            var width = T.startWidth + offset;
            var percent = (width / $('#master-controls').width()) * 100;
            $(T.element).children('.control').width(percent+"%");
            if(type === 'volume') {
                scale = Math.round($('#master-controls').width() / 100);
                result = Util.clamp(Math.round(((percent / 100)*$('#master-controls').width())/scale), 0, 100);
                T.volume = result;

                T.songMap.forEach(function(song, index) {
                    if(T.volume >= 2) {
                        song.Player.unmute();
                        song.Conductor.setMasterVolume(T.volume);
                    } else {
                        song.Player.mute();
                    }
                });

            } else if(type === 'tempo') {
                scale = Math.round($('#master-controls').width() / 300);
                result = Util.clamp(Math.round(((percent / 100)*$('#master-controls').width())/scale), 30, 300);
                T.tempo = result;

                //todo - set the tempo of each of the playing songs
                T.songMap.forEach(function(song, index) {
                    song.Conductor.setTempo(T.tempo);
                });

            }
            $(T.element).children('.label').children('.label-value').text(result);
        });

    });

    $(document).bind('mouseup touchend', function(e) {
        if(T.dragging) {
            //unbind all of the mouse move events
            //$(document).unbind('tmove');
            $(document).unbind('mousemove');
            $(document).unbind('touchmove');

            //set everything back to idle
            T.dragging = false;
            T.element = {};
        }
    });


    //edge case, can't click through the slider text
    $('.slider-label').bind('mousedown touchstart', function(e) {
        e.preventDefault();
    });

    //var tick = setInterval(SLS.updateProgressBars, 1000);


});

/**
 * Tones namespace
 */

if (typeof T === "undefined") {

    var T = {};

    T.keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    T.toneMap = [];

    T.songMap = [];

    T.volume = 15;

    T.tempo = 140;

    T.dragging = false;

    T.element = {};

    T.startDragPosition = 0;

    T.startWidth = 0;

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
    SLS.progress = [];

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
                var controlDiv = $("<div class='control' data-elapsed='0'></div>");
                $("#players").append(playerDiv);
                playerDiv.append(controlDiv);
                playerDiv.append("<div class='team-name'>"+team.name+"</div>");
                playerDiv.append("<div class='player-controls' data-team-id="+i+"><div class='stop' onclick='SLS.stop(this);'></div><div onclick='SLS.play_pause(this);' class='play-pause paused'></div></div>");
                //<button onclick='SLS.stop(this);'>Stop</button>

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

                        knots = Math.round((((pD / tD) * 3600) / 1000) / 1.852) + 30;

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
                SLS.progress.push({"Team": i, "Control": controlDiv});
                resolve();
            });
        });
        return processed;
    };

    SLS.processTones = function(team) {
        //create a new BandJS instance (we do this because we BandJS is pretty poor at handling multi-instances)
        //now, this "song" will be relative to this conductor, so we can start/pause/stop it as we like
        var conductor = new BandJS();
        conductor.setTempo(T.tempo);
        conductor.setTimeSignature(4,4);
        conductor.setMasterVolume(T.volume);
        conductor.setOnFinishedCallback(SLS.onFinish);
        conductor.setTickerCallback(SLS.onTick);
        var song = conductor.createInstrument('sawtooth', 'oscillators');
        SLS.tones[team].Tones.forEach(function(tone, j) {
            //so we have our tone index, now we need to match it up to the right tone
            //should be able to generate a tone and play it
            song.note('eighth', T.toneMap[tone]);
        });

        var player = conductor.finish();
        var length = conductor.getTotalSeconds();
        var songRef = T.songMap.push({"Team": team, "Conductor": conductor, "Player": player, "Playing": true}) - 1;
        T.songMap[songRef].Player.play();
    };

    SLS.play_pause = function(obj) {
        var id = $(obj).parent().data('team-id');
        var index = Util.getArrayIndexForObjWithAttr(T.songMap, "Team", id);
        if(index !== -1) {
            if(T.songMap[index].Playing === true) {
                T.songMap[index].Player.pause();
                T.songMap[index].Playing = false;
                $(obj).toggleClass('paused');
            } else {
                T.songMap[index].Player.play();
                T.songMap[index].Playing = true;
                $(obj).toggleClass('paused');
            }
        } else {
            SLS.processTones(id);
            $(obj).toggleClass('paused');
        }
    };

    SLS.stop = function(obj) {
        var id = $(obj).parent().data('team-id');
        var index = Util.getArrayIndexForObjWithAttr(T.songMap, "Team", id);
        if(index !== -1) {
            T.songMap[index].Player.stop();
            T.songMap[index].Playing = false;
            $(obj).next().toggleClass('paused');

            var pindex = Util.getArrayIndexForObjWithAttr(SLS.progress, "Team", id);
            if(pindex !== -1) {
                $(SLS.progress[pindex].Control).width(0);
            }

        } else {
            //no valid index to stop
        }
    };


    /**
    *   callback function for BandJS's setOnFinishedCallback.  Resets all values for the current instance
    **/
    SLS.onFinish = function() {
        var _this = this;
        var index = Util.getArrayIndexForObjWithAttr(T.songMap, "Conductor", _this);
        if(index !== -1) {
            var id = T.songMap[index].Team;
            T.songMap[index].Playing = false;
            var player = $('.player-controls').find("[data-team-id='"+id+"']");
            if(player) {
                $(player).children().find('.play-pause').addClass('paused');
            } else {
            }
            var pindex = Util.getArrayIndexForObjWithAttr(SLS.progress, "Team", id);
            if(pindex !== -1) {
                $(SLS.progress[pindex].Control).width(0);
            }
        }
    };

    /**
    *   callback function for BandJS's onTickerCallback.  Updates progress bar and elapsed time count for the current instance
    **/
    SLS.onTick = function() {
        var b = {};
        var complete = 0;
        var _this = this;
        var length = _this.getTotalSeconds();
        var index = Util.getArrayIndexForObjWithAttr(T.songMap, "Conductor", _this);
        if(index !== -1) {
            b = SLS.progress[T.songMap[index].Team].Control;
            $(b).data().elapsed++;
            //song completion as a percentage
            complete = ($(b).data().elapsed / length) * 100;
            $(b).width(complete+"%");
        }
    };

/*
    SLS.updateProgressBars = function() {
        T.songMap.forEach(function(team, i) {
            if(team.Playing === true) {
                var progressBar, conductor = {};
                var pindex = Util.getArrayIndexForObjWithAttr(SLS.progress, "Team", team.Team);
                var cindex = Util.getArrayIndexForObjWithAttr(T.songMap, "Team", team.Team);
                if(pindex !== -1) {
                    progressBar = SLS.progress[pindex].Control;
                    if(cindex !== -1) {

                        //get a percentage of the song already completed
                        var totalTime = T.songMap[cindex].Conductor.getTotalSeconds();
                        var elapsedTime = SLS.progress[pindex].Elapsed + 1;
                        var remainingTime = totalTime - elapsedTime;

                        //get the remaining space
                        var totalWidth = $(progressBar).parent().width();
                        var elapsedWidth = $(progressBar).width();
                        var remainingSpace = totalWidth - elapsedWidth;

                        //get the increment size
                        var increment = remainingSpace / remainingTime;

                        //now set the width
                        var newWidth = elapsedWidth + increment;
                        $(progressBar).width(newWidth);

                        //update the elapsed tick
                        SLS.progress[pindex].Elapsed = elapsedTime;
                    }
                }
            }
        });
    };
*/

    //helper function, determine starting size for master tempo and master volume sliders
    SLS.setupMasterControlSliders = function() {

        var masterControls = $('#master-controls');

        var scalingWidth = masterControls.width();

        var volIncrement = Math.round(scalingWidth / 100);
        var tempoIncrement = Math.round(scalingWidth / 300);

        var volPercentage = ((T.volume * volIncrement) / scalingWidth) * 100;
        var tempoPercentage = ((T.tempo * tempoIncrement) / scalingWidth) * 100;

        masterControls.children("[data-controller='volume']").find('.control').width(volPercentage+"%");
        masterControls.children("[data-controller='volume']").find('.label-value').text(T.volume);
        masterControls.children("[data-controller='tempo']").find('.control').width(tempoPercentage+"%");
        masterControls.children("[data-controller='tempo']").find('.label-value').text(T.tempo);
    };
}



//Utilities namespace
//
if (typeof Util === "undefined") {

    var Util = {};

    //clamp value between upper and lower limit
    Util.clamp = function(num, min, max) {
        return num < min ? min : num > max ? max : num;
    };

    //find array index of an object with a particular attribute
    Util.getArrayIndexForObjWithAttr = function(array, attr, value) {
        for(var i = 0; i < array.length; i++) {
            if(array[i].hasOwnProperty(attr) && array[i][attr] === value) {
                return i;
            }
        }
        return -1;
    };

}