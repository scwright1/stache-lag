R7 = {};

R7.Position = function (timeAt, latitude, longitude, distanceToFinish) {

    this.at = timeAt;
    this.lat = latitude;
    this.lon = longitude;
    this.dtf = distanceToFinish || 0;

};

R7.Position.prototype.clone = function () {

    return new R7.Position(this.at, this.lat, this.lon, this.dtf);

};

R7.Team = function (id, name, positions, times) {

    this.id = id;
    this.name = name;
    this.positions = positions;
    this.times = times;

};

R7.load = function (eventName, success, failure) {

    var xhr = new XMLHttpRequest();

    xhr.open("GET", "http://yb.tl/BIN/" + eventName + "/AllPositions", true);

    xhr.responseType = "arraybuffer";

    xhr.onload = function (e) {

        if ((xhr.status == 0) || (xhr.status != 200)) {

            if (failure) {

                failure();

            }

            return;
        }


        var teamData = [];

        var view = new DataView(this.response);

        var confByte = view.getUint8(0);

        var doAltitude = ((confByte & 0x01) == 0x01);
        var doDTF = ((confByte & 0x02) == 0x02);
        var doLaps = ((confByte & 0x04) == 0x04);

        var startOff = view.getUint32(1);

        var cursor = 5;

        while (cursor < this.response.byteLength) {

            var teamId = view.getUint16(cursor);
            cursor += 2;


            var positions = [];
            var times = [];

            var numberOfPositions = view.getUint16(cursor);
            cursor += 2;

            var lastPosition;

            for (var i = 0; i < numberOfPositions; i++) {

                var firstByte = view.getUint8(cursor);

                var position = new R7.Position();

                if ((firstByte & 0x80) == 0x80) {

                    var atDelta = view.getUint16(cursor);
                    cursor += 2;

                    var latDelta = view.getInt16(cursor);
                    cursor += 2;

                    var lonDelta = view.getInt16(cursor);
                    cursor += 2;

                    if (doAltitude) {

                        position.alt = view.getInt16(cursor);
                        cursor += 2;

                    }

                    if (doDTF) {

                        var dtfDelta = view.getInt16(cursor);

                        cursor += 2;
                        position.dtf = lastPosition.dtf + dtfDelta;

                    }

                    atDelta = atDelta & 0x7fff;

                    position.lat = lastPosition.lat + latDelta;
                    position.lon = lastPosition.lon + lonDelta;
                    position.at = lastPosition.at - atDelta;

                } else {

                    var at = view.getUint32(cursor);
                    cursor += 4;

                    var lat = view.getInt32(cursor);
                    cursor += 4;

                    var lon = view.getInt32(cursor);
                    cursor += 4;

                    if (doAltitude) {
                        position.alt = view.getInt16(cursor);
                        cursor += 2;
                    }

                    if (doDTF) {

                        var dtf = view.getInt32(cursor);
                        cursor += 4;
                        position.dtf = dtf;

                        if (doLaps) {
                            position.lap = view.getUint8(cursor);
                            cursor++;
                        }

                    }

                    position.lat = lat;
                    position.lon = lon;
                    position.at = startOff + at;

                }


                lastPosition = position.clone();

                position.lat /= 100000;
                position.lon /= 100000;

                times.push(position.at);
                positions.push(position);

            }

            var name = "Team " + (teamData.length + 1);

            teamData.push(new R7.Team(teamId, name, positions, times));

        }


        if (success) {

            success(teamData);

        }


    };

    xhr.send();

};
