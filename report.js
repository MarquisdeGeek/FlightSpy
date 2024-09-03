import * as Utils from './utils.js'


class Report {
    constructor(flightPoints) {
        this.data = flightPoints;
    }

    async process(options) {

        let ignoreList = []; // so we only list each item once

        let reportDataPromises = await this.data.map(async (datapoint) => {
    
            let unresolvedPromises = await datapoint.interests.map(async (interest, idx) => {
    
                if (ignoreList.indexOf(interest.id) !== -1) {
                    return;
                }
    
                ignoreList.push(interest.id);
    
                if (typeof options.translator === typeof undefined) {
                    return { name: interest.name, description: interest.description ? interest.description : '' };
                }
    
                const text = await options.translator(interest.name, "en");
                return { name: `${interest.name} ${text && text !== interest.name ? '('+text+')' : ''}`, description: interest.description ? interest.description : ''};
            });
            
            let toShow = await Promise.all(unresolvedPromises);
            toShow = toShow.filter((show) => typeof show != typeof undefined); // remove any undefineds, which result from removing dupes
            return { datapoint: datapoint, show: toShow };
        });

        let reportData = await Promise.all(reportDataPromises);
        return reportData;
    }


    showEntry(startTime, entry) {

        if (entry.show.length) {
            let pos = entry.datapoint;

            let lhsHeadings = [];
            let timeHeading = `${pos.time} := `;
            let timeSpaces = " ".repeat(timeHeading.length);

            lhsHeadings.push(timeHeading);
            lhsHeadings.push(`t + ${Utils.secondsAsHuman(pos.timestamp - startTime)}`);
            lhsHeadings.push(`(speed=${pos.airSpeed})`);
            lhsHeadings.push(`(altitude=${pos.altitude})`);

            // Ensure they're all padded
            lhsHeadings = lhsHeadings.map((line) => (line+ (" ".repeat(timeHeading.length))).substring(0,timeHeading.length));

            // Show them all
            entry.show.forEach((show, idx) => {
                   // Possible: Show whether they're on the left or right of the plane?
                // https://stackoverflow.com/questions/31418567/is-angle-to-the-left-or-right-of-second-angle
                // let thisBearing = calculateBearing(lastTrailPos, trailPos);
                console.log(`${idx < lhsHeadings.length ? lhsHeadings[idx] : timeSpaces}${show.name} - ${show.description}`);
            });
            //
            for(let idx = entry.show.length;idx<lhsHeadings.length; ++idx) {
                console.log(lhsHeadings[idx]);
            }
            //
            console.log('');
        }

    }
}

export { Report };
