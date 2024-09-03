import * as GeoDistance from 'geo-distance'

import { FlightCache } from './cache_flightradar.js'
import { OSMCache } from './cache_osm.js'
import { Report } from './report.js'
import * as Utils from './utils.js'


// Pre-requistes:
// 1. Run https://github.com/LibreTranslate/LibreTranslate on port 5000
//    (otherwise, remove ltranslate option around line 98)
//
// 2. Use my fork (https://github.com/MarquisdeGeek/flightradar24-client) of flight radar module, that returns trail data.


// Specific the ID
const flightID = `36e9026e`;

// How to get this flight ID:
// 1. Visit https://www.flightradar24.com/
// 2. Search for the code number (top right)
// 3. Click on the 'Recent or schedule flights" option.
//    (this should open a page of flight history for that route)
// 4. Review the list to find a complete flight
// 5. Click on the 'Play' button
// 6. Notice the URL contains both the route ID, followed by a #, and another ID - use this one


// Working parameters
const forceRateLimits = 1000; // in ms

// Flight trail calculation
const timeGap = 5 * 60;
const distanceGap = GeoDistance.default('50 km'); // This doesn't match our normal visible range. Bug?
const mapAreaRadius = 1500;

const filterOptions = {
    filterByAltitude: false
};



async function main(id) {

    const apiFlightRadar = new FlightCache(`flightcache/${id}`);
    const apiMapping = new OSMCache(`flightcache/${id}/map`);

    // Get the flight trail, in blocks according to distance
    // (can be switch to byTime)
    const flightData = await apiFlightRadar.getFlightData(id, {
        byDistance: distanceGap,
        //byTime: timeGap
    });


    // Request the map data for each trail point
    // Note the delay and waitDuration to stop flooding the server
    let waitDuration = 0;
    let unresolvedPromises = await flightData.map(async (pos) => {

        let area = Utils.getSurroundArea(pos.latitude, pos.longitude, mapAreaRadius);
        let cachedData = await apiMapping.getGetMapDataCache(area);

        if (cachedData) {
            return { flight: pos, map: cachedData };
        } else {
            waitDuration += forceRateLimits;
        
            return Utils.delay(waitDuration).then(async () => {
                const results = await apiMapping.callGetMapData(area);
                return { flight: pos, map: results };
            });
        }
    });


    // Wait for all results to arrive
    let flightPoints = await Promise.all(unresolvedPromises);

    // Filter to something manageable
    flightPoints = flightPoints.map((data) => {
        return {
            time: data.flight.tst,      // human-friendly time
            timestamp: data.flight.timestamp,  // in seconds
            airSpeed: data.flight.speed,
            altitude: data.flight.altitude,
            //
            interests: osmFilterMapData(data.map, data.flight, filterOptions)
        }
    });


    // Show a report
    const report = new Report(flightPoints);

    let reportData = await report.process({
        translator: ltranslate
    });


    const startTime = flightPoints ? flightPoints[0].timestamp : 0;
    reportData.forEach((toShow) => {
        report.showEntry(startTime, toShow);
    });
}


async function ltranslate(text, destLang) {
    try {
        const res = await fetch("http://localhost:5000/translate", {
            method: "POST",
            body: JSON.stringify({
                q: text,
                source: "auto",
                target: destLang,
                format: "text",
                alternatives: 3,
                api_key: ""
            }),
            headers: { "Content-Type": "application/json" }
        });

        const r = await res.json();
        return r.translatedText;
    } catch(e) {
        // Probably no translation server
    }

    return text;
}


function getBestName(item) {

    if (item.tags) {
        let name = item.tags['name:en'];

        name = name || item.tags['name:fr'];
        name = name || item.tags['name'];
        if (name) {
            return name;
        }
    }

    return item.name;
}


function osmFilterMapData(data, pos, options) {
    let results = [];
    let generallyInteresting = [
        "geological",
        "tourism",
        "amenity",
        "water",
        "place",
    ];
    let specificallyInteresting = {
        'leisure': ['park', 'stadium'],
        'man_made': ['bridge', 'communications_tower', 'lighthouse', 'offshore_platform'],
        'historic': ['archaeological_site'],
        'natural': ['peninsula', 'bay', 'reef', 'glacier', 'peak'],
        	
    };
        
    data.forEach((item) => {
        let description = undefined; // set this to be considered "interesting enough to print"

        let bestName = getBestName(item);
        if (item.type === 'way' && bestName && item.tags) {
            // Ref :https://wiki.openstreetmap.org/wiki/Map_features#

            generallyInteresting.forEach((gi) => {
                if (options.filterByAltitude && gi === 'amenity' && pos.altitude > 400) {
                    // nop
                } else if (item.tags[gi]) {
                    description = `${gi}: ${item.tags[gi]}`;
                }
            });
            //
            Object.keys(specificallyInteresting).forEach((si) => {
                // If this item has the tag given...
                if (item.tags[si]) {
                    // .. is it in the interesting list?
                    if (specificallyInteresting[si].indexOf(item.tags[si]) !== -1) {
                        description = `${item.tags[si]}`;
                    }
                }
            });
            //
                        
            if (item.tags['aeroway'] === 'aerodrome') {
                description = `Airport. ${item.tags['note']}`;
            } else if (item.tags['highway'] === 'bus_stop') {
                description = `Bus stop. ${item.tags['shelter']}`;
            }

            if (item.tags['population']) {
                description = `pop. ${item.tags['population']}`;
            }

            if (item.tags['boundary'] === 'administrative') {
                description = `Edge of ${bestName}. pop. ${item.tags['population'] || 'n/a'}`;
            }
        }

        if (description) {
            const thenode = {}; // could also add data from await OSM.getFeature("node", item.id);

            let taglist = "";
            for (let [k, v] of Object.entries(item.tags)) {
                taglist = `${taglist}, ${k}:${v}  `;
            }

            results.push({
                id:item.id,
                name:        `${bestName}`,
                description: `${description || ''}`,
                debug:       `(${taglist}) >> ${JSON.stringify(item)} << ${JSON.stringify(thenode)} `
            });
        }
    });

    return results;
}


main(flightID);
