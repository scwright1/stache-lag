$(document).ready(function() {

    //off we go!
    T.init();

    SLS.setupMasterControlSliders();

    //do the initial data loads, then process the data into the tone database
    SLS.loadData(SLS.race).then(SLS.processData).catch(function(err){

        alert(err);

    });

    //set up our mouse and touch bindings
    SLS.setupBindings();

    //set up our select listener
    SLS.groupSelectTrigger();

});

/**
 * SLS namespace
 * most of the functional logic is in here (groups, divs etc)
 */

if (typeof SLS === "undefined") {

    var SLS = {};

    SLS.race = "c6002016";

    SLS.teams = {};

    SLS.groups = 0;

    SLS.currentGroup = 1;

    SLS.tones = [];

    SLS.audio = [];

    SLS.progress = [];

    //load the race data from the R7 api, and return a promise
    SLS.loadData = function(dataset) {

        //return the data as a promise so that we're always ensuring that we're getting the dataset before we do anything with it
        return loadFromR7 = new Promise(function(resolve, reject) {

            if(dataset !== "") {

                R7.load(dataset, function(data) {

                    $('.race-name').text(SLS.race);

                    resolve(data);

                }, function() {

                    reject("Failed to load Dataset \""+dataset+"\"");

                });

            }

        });

    };

    //Generate player divs for the currently active group
    SLS.generatePlayers = function(group) {

        //determina all songs that are applicable for this group
        var entry = (6 * group) - 6;

        for (entry; entry < (6 * group); entry++) {

            if (entry < SLS.teams.length) {

                var playerDiv = $("<div class='player bg-dark-complimentary'></div>");

                var controlDiv = $("<div class='control' data-elapsed='0'></div>");

                $("#players").append(playerDiv);

                playerDiv.append(controlDiv);

                playerDiv.append("<div class='team-name'>"+SLS.teams[entry].name+"</div>");

                playerDiv.append("<div class='player-controls' data-team-id="+entry+"><div class='stop' onclick='SLS.stop(this);'></div><div onclick='SLS.play_pause(this);' class='play-pause paused'></div></div>");

                SLS.progress.push({"Team": entry, "Control": controlDiv});

            }

        }

    };

    //set up the binding for the onchange of the group select
    SLS.groupSelectTrigger = function() {

        var select = $('#group-select');

        $(select).change(function() {

            SLS.currentGroup = $(select).find(':selected').text();

            //kill all playing songs and remove everything from the array

            T.songMap.forEach(function(song, index) {

                if(song.Playing === true) {

                    song.Player.stop();

                }

            });

            T.songMap.length = 0;

            SLS.progress.length = 0;

            $('#players').empty();

            SLS.generatePlayers(SLS.currentGroup);

        });

    };

    //set up the mouse and touch bindings
    SLS.setupBindings = function() {
        //functions for operations during use
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

    };

    //process the race data, turn the data into a tone index that can be referenced as a musical scale
    SLS.processData = function(data) {

        var processed = new Promise(function(resolve, reject) {

            SLS.teams = data;

            SLS.groups = Math.ceil(data.length / 6);

            //populate the select element with the number of groups (of 6, due to AudioContext limits)
            for (var group = 1; group <= SLS.groups; group++) {

                var option = $('#group-select').append('<option>'+group+'</option>');

                if (group === 1) {

                    $(option).attr('selected', 'selected');

                }

            }

            SLS.teams.forEach(function(team, i) {

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

                        //so if we travel dtfDiff metres in timeDiff seconds, that means:

                        // dtfDiff / timeDiff = metres per second,  * 3600 = metres per hour, / 1000 = km/h, / 1.852 = knots (!)

                        //finally, we want to round to the nearest decimal (to keep things simple)

                        // and normalize the value into a range that is most appropriate to the notes (there are 88 notes, so we add 30)

                        knots = Math.round((((pD / tD) * 3600) / 1000) / 1.852) + 30;

                        /**
                         * Might want to change this in the future!
                         * - for now, remove any instances where speed is 0 (therefore the knots would be "30")
                         * also make sure that we don't include any notes that are outside of the available range
                         */

                         knots = Util.clamp(knots, 0, 95);

                         if(knots !== 30) {

                            toneArray.push(knots);

                         }

                    }

                });

                SLS.tones.push({"Team": team.name, "Tones": toneArray});

                resolve();

            });

            SLS.generatePlayers(SLS.currentGroup);

        });

        return processed;

    };

    //for the team that wants it's "song" played, process the tones and create the song
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

    //process a play or pause action against a particular song
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

    //process a stop action against a particular song
    SLS.stop = function(obj) {

        var id = $(obj).parent().data('team-id');

        var index = Util.getArrayIndexForObjWithAttr(T.songMap, "Team", id);

        if(index !== -1) {

            T.songMap[index].Player.stop();

            T.songMap[index].Playing = false;

            $(obj).next().addClass('paused');

            var pindex = Util.getArrayIndexForObjWithAttr(SLS.progress, "Team", id);

            if(pindex !== -1) {

                $(SLS.progress[pindex].Control).width(0);

                $(SLS.progress[pindex].Control).data().elapsed = 0;

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

            var player = $('.player-controls[data-team-id="'+id+'"]');

            T.songMap[index].Playing = false;

            $(player).find('.play-pause').addClass('paused');

            var pindex = Util.getArrayIndexForObjWithAttr(SLS.progress, "Team", id);

            if(pindex !== -1) {

                $(SLS.progress[pindex].Control).width(0);

                $(SLS.progress[pindex].Control).data().elapsed = 0;

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

            //only update if the song is currently playing

            //this fixes the edge case where we press the stop button and the tick function fires again

            if(T.songMap[index].Playing) {

                var tid = T.songMap[index].Team;

                var tindex = Util.getArrayIndexForObjWithAttr(SLS.progress, "Team", tid);

                b = SLS.progress[tindex].Control;

                $(b).data().elapsed++;

                //song completion as a percentage

                complete = ($(b).data().elapsed / length) * 100;

                $(b).width(complete+"%");

            }

        }

    };

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

        //create the full scale of notes in an array (should be 12 * 7 + 1)
        for (var i = 0; i < 8; i++) {

            T.keys.forEach(function(key, index) {

                T.toneMap.push(key+i);

            });

        }

        //corner case, add C8
        T.toneMap.push("C8");
    };

}



/**
 * Utilities Namespace
 */
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