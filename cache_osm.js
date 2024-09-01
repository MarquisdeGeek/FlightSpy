import * as OSM from "osm-api";

import { BasicCache } from './cache_basic.js'


class OSMCache extends BasicCache {

    async getGetMapDataCache(area) {
        let params = ['area', area.lng0, area.lat0, area.lng1, area.lat1];
        let rt = await this.call(params);

        return rt;
    }

    async callGetMapData(area) {
        let params = ['area', area.lng0, area.lat0, area.lng1, area.lat1];
        let rt = await this.getGetMapDataCache(area);
    
        if (!rt) {
            rt = await OSM.getMapData([
                    area.lng0, area.lat0, area.lng1, area.lat1,
                ]);
            this.save(params, rt);
        }

        return rt;
    }

}


export { OSMCache };