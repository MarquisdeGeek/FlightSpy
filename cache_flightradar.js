import { fetchFlight } from 'flightradar24-client'
import * as GeoDistance from 'geo-distance'

import { BasicCache } from './cache_basic.js'
import * as Utils from './utils.js'


class FlightCache extends BasicCache {

    async callFetchFlight(flightID) {
        let params = ['ff', flightID];
        let rt = await this.call(params);

        if (!rt) {
            rt = await fetchFlight(flightID);
            this.save(params, rt);
        }

        return rt;
    }


    async getFlightData(flightID, options) {
        const flight = await this.callFetchFlight(flightID);
    
        flight.trail = flight.trail.reverse();
       
        // sanity check that we have some data points
        if (flight.trail.length < 2) {
            return [];
        }
    
        // Logic:
        // Every N minutes/meters make a list of what's visible at the current location
        // rem: timestamps are in seconds (while JS time in ms)
        // We could also change this gap according to speed
    
        // Always add the first location
        let results = [];
        results.push(flight.trail[0]);
    
        let lastTrailPos = {
            lat: flight.trail[0].lat,
            lon: flight.trail[0].lng,
        };
    
        let trailIndex = 0;
        let lastTime = 0;
        do {
            let trailData = flight.trail[trailIndex];
    
            // For distance-based divisions
            if (typeof options.byDistance !== typeof undefined) {
                const trailPos = {
                    lat: trailData.lat,
                    lon: trailData.lng,
                };
                const distanceBetween = GeoDistance.default.between(lastTrailPos, trailPos);
    
                if (distanceBetween > options.byDistance || (trailData.spd > 200 && distanceBetween > options.byDistance/2)) {
                    trailData.bearing = Utils.calculateBearing(lastTrailPos, trailPos);
    
                    lastTrailPos = trailPos;
    
                    results.push(trailData);
                }
            }
    
    
            // For time-based divisions
            if (typeof options.byTime !== typeof undefined) {
                let currentTime = trailData.ts;
                let delta = Math.abs(currentTime - lastTime);// TODO: BUG - unless trail data is reversed
    
                if (delta >= options.byTime) {
                    trailData.delta = delta;
                    lastTime = currentTime;
    
                    results.push(trailData);
                }
            }
    
            // Now skip until trail time >= current+gap
        } while(++trailIndex < flight.trail.length);
    
    
        // Always add the last location
        results.push(flight.trail[flight.trail.length - 1]);
    
        // Add the human time, here, to all entries
        results = results.map((r) => {
            r.tst = (new Date(r.ts * 1000).toLocaleString());
            return r;
        });
    
        return results;
    }
    
}


export { FlightCache };