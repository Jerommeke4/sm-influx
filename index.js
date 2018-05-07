const moment = require('moment');
const Hashmap = require('hashmap')
const lineReader = require('readline').createInterface({
    input: require('fs').createReadStream('./screenlog.0')
})

const map = new Hashmap();
// labels from http://domoticx.com/p1-poort-slimme-meter-hardware/
map.set('1-0:1.8.1', 'Energy total to client tariff 1')
map.set('1-0:1.8.2', 'Energy total to client tariff 2')
map.set('1-0:2.8.1', 'Energy total from client tariff 1')
map.set('1-0:2.8.2', 'Energy total from client tariff 2')
map.set('1-0:1.7.0', 'Energy current to client')
map.set('1-0:2.7.0', 'Energy current from client')

let i = 0;
let measurements = []
let currentMeasurement = null;
lineReader.on('line', line => {
    i++
    let lineCode = line.substring(0, line.indexOf('('));
    let lineValue = line.substring(line.indexOf("(") + 1, line.indexOf(")"))
    if (lineCode === '0-0:1.0.0') {

        lineValue = lineValue.substring(0, lineValue.length - 1)
        let lastTs = new moment(lineValue, 'YYMMDDhhmmss')
        const newMeasurement = {
            timestamp: lastTs,
            lines: []
        }
        currentMeasurement = newMeasurement
        measurements.push(currentMeasurement);
    }
    else if (currentMeasurement != null) {
        if (map.has(lineCode)) {
            currentMeasurement.lines.push({
                code: lineCode,
                label: map.get(lineCode),
                value: parseFloat(lineValue.substring(0, lineValue.indexOf("*"))),
                unit: lineValue.substring(lineValue.indexOf("*") + 1)
            })
        } else if (lineCode === '0-1:24.2.1') {
            // gas
            lineValue = line.substring(line.lastIndexOf("(") + 1, line.lastIndexOf(")"))
            currentMeasurement.lines.push({
                code: lineCode,
                label: 'Gas total',
                value: parseFloat(lineValue.substring(0, lineValue.indexOf("*"))),
                unit: lineValue.substring(lineValue.indexOf("*") + 1)
            })
        }

    }

})
lineReader.on('close', () => {
    let points = [];
    for (measurement of measurements) {
        points.push({
            measurement: 'elektra',
            fields: {
                activeElectro: measurement.lines[4].value,
                totalElectroA: measurement.lines[0].value,
                totalElectroB: measurement.lines[1].value,
                totalGas: measurement.lines[6].value,
            },
            timestamp: measurement.timestamp.toDate(),
        })
    }

    const Influx = require('influx')
    const moment = require('moment')
    const influx = new Influx.InfluxDB({
        host: 'localhost',
        port: 18086,
        database: 'slimmemeter',
        schema: [
            {
                measurement: 'elektra',
                fields: {
                    activeElectro: Influx.FieldType.FLOAT,
                    totalGas: Influx.FieldType.FLOAT,
                    totalElectroA: Influx.FieldType.FLOAT,
                    totalElectroB: Influx.FieldType.FLOAT,
                },
                tags: []
            }
        ]
    })

    influx.writePoints(points).then(() => {
        console.log('write!')
        process.exit()
    } ).catch(err => {
        console.log(err)
        process.exit()
    })

    
})