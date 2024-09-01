
// Good calc info:
// https://www.movable-type.co.uk/scripts/latlong.html

function calculateBearing(fromLL, toLL) {
    const y = Math.sin(toLL.lon-fromLL.lon) * Math.cos(toLL.lat);
    const x = Math.cos(fromLL.lat)*Math.sin(toLL.lat) - Math.sin(fromLL.lat)*Math.cos(toLL.lat)*Math.cos(toLL.lon-fromLL.lon);
    const θ = Math.atan2(y, x);
    const brng = (θ*180/Math.PI + 360) % 360; // in degrees

    return θ;
}

function getSurroundArea(latitude, longitude, radius) {
    const r_earth = 6378000; // meters
    const pi = Math.PI;
    const dx = radius / 2;
    const dy = radius / 2;
    
    const new_latitude  = latitude  + (-dy / r_earth) * (180 / pi);
    const new_longitude = longitude + (-dx / r_earth) * (180 / pi) / Math.cos(latitude * pi/180);
    
    const new_latitude2  = latitude  + (dy / r_earth) * (180 / pi);
    const new_longitude2 = longitude + (dx / r_earth) * (180 / pi) / Math.cos(latitude * pi/180);

    return {
        lat0: new_latitude,
        lng0: new_longitude,

        lat1: new_latitude2,
        lng1: new_longitude2
    }
}


function secondsAsHuman(seconds) {
    if (seconds < 60) {
        return `${seconds} seconds`;
    }
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    if (hours) {
        minutes -= hours * 60;
        return `${hours} hr ${minutes} mins`;
    }

    return `${minutes} minutes`;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export { calculateBearing, getSurroundArea, secondsAsHuman, delay }
