import * as fs from 'fs';
import * as path from 'path';


class BasicCache {

    constructor(rootpath) {
        this.cachepath = rootpath;

        fs.mkdirSync(this.cachepath, { recursive: true });
    }


    encode(params) {
        let filename = `api_`;
        filename += params.join("_");
        return filename;
    }


    async call(params) {
        const filename = this.encode(params);
        const fullname = path.join(this.cachepath, filename);

        try {
            const contents = fs.readFileSync(fullname);
            const rt = JSON.parse(contents);

            return rt;

        } catch (err) {
            // Cache miss- not an error, but during development you might
            // want to flick this back on.
            //console.error(err.message);
        }

        return undefined;
    }


    async save(params, rt) {
        const filename = this.encode(params);
        const fullname = path.join(this.cachepath, filename);

        fs.writeFileSync(fullname, JSON.stringify(rt));
    }

}


export { BasicCache };
