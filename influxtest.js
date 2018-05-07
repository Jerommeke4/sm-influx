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
        },
        tags: []
      }
    ]
   })

influx.writePoints([
    {
        measurement: 'elektra',
        fields: { activeElectro: 12345 },
        timestamp: new moment().toDate(),
    }
]).then(()=> console.log('write!')).catch(err => console.log(err))
