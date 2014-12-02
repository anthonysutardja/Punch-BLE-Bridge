var request = require('request');
var noble = require('noble');
var uuid = require('node-uuid');
var fs = require('fs');
var asyncblock = require('asyncblock');


/* Settings */
var PUNCH_UUID_FILENAME = '.punch_uuid';
var PUNCH_HOSTNAME = 'http://localhost:8000';

var PUNCH_BLE_SERVICE_UUID =   'b0bb58205a0d11e493ee0002a5d5c51b';
var PUNCH_BLE_TEMP_CHAR_UUID = '7a77be205a0d11e4a95e0002a5d5c51b';
var PUNCH_BLE_BRIX_CHAR_UUID = '';


/* PunchBridge namespace */
var PunchBridge = {};

/**
 * Initial setup function for the Punch bridge.
 */
PunchBridge.initalSetup = function() {
    if (fs.existsSync(PUNCH_UUID_FILENAME)) {
        // If UUID file exists, set PunchBridge UUID to the contents;
        PunchBridge.uuid = fs.readFileSync(PUNCH_UUID_FILENAME, {encoding: 'utf8'});
    } else {
        // Otherwise, generate a new UUID and save it.
        PunchBridge.uuid = uuid.v4();
        fs.writeFileSync(PUNCH_UUID_FILENAME, PunchBridge.uuid, {encoding: 'utf8'});
    }
};


/**
 * Push the sensor data to the server.
 * 
 * @param  {Object} sensorData An object containing the fields expected for sensor data.
 */
PunchBridge.pushData = function(sensorData) {
    var options;
    if (sensorData) {
        options = {
            uri: PUNCH_HOSTNAME + '/updater',
            method: 'POST',
            timeout: 10000,
            body: JSON.stringify(sensorData)
        };

        request(options, function(error, response, body) {
            if (error) {
                console.log("An error occured while pushing sensor data.");
                console.log(error);
            }
            console.log(body);
        });
    }
};

/**
 * Create a standard sensor data object.
 * 
 * @param  {string} sensor_uuid The sensor UUID
 * @param  {number} temperature Temperature in degrees Celcius of the sensor
 * @param  {number} brix        Sugar concentration in degrees Brix of the sensor
 * @return {Object}             Sensor Data object
 */
PunchBridge.createSensorData = function(sensor_uuid, temperature, brix) {
    return {
        bridge_uuid: PunchBridge.uuid,
        sensor_uuid: sensor_uuid,
        temperature: temperature,
        brix: brix
    }
}

/**
 * Return a float represented in hex.
 * 
 * @param  {Buffer} buffer A hex string storing a float in left endian format.
 * @return {number}        The number representation
 */
PunchBridge.convertHexToFloat = function(buffer) {
    return buffer.readFloatLE(0);
};


/* BLE setup */
noble.on('stateChange', function(state){
    if (state === 'poweredOn') {
        // Parameters: Punch BLE service UUIDs and if we allow duplicates
        //noble.startScanning([PUNCH_BLE_SERVICE_UUID], true);
        noble.startScanning();
    } else {
        noble.stopScanning();
    }
});

// https://github.com/sandeepmistry/noble/wiki/Getting-started
noble.on('discover', function(peripheral) {
    peripheral.connect(function(error) {
        console.log('  connected to peripheral: ' + peripheral.uuid);
        // Get the service containing the brix and temperature characteristics
        peripheral.discoverServices([PUNCH_BLE_SERVICE_UUID], function(error, services) {
            if (services.length > 0) {
                var punchService = services[0];
                // Find each characteristic
                // Make characteristic discoveries synchronous
                asyncblock(function(flow) {
                    var tempContents, tempReading, brixReading, data;
                    // Get the temperature reading
                    punchService.discoverCharacteristics([PUNCH_BLE_TEMP_CHAR_UUID], flow.set('tempContents'));
                    tempContents = flow.get('tempContents');
                    tempContents[0].read(flow.set('tempReading'));
                    tempReading = flow.get('tempReading').readFloatLE(0);
                    console.log("READING: " + tempReading);

                    // TODO: add BRIX measurement
                    brixReading = 10.0;

                    // Push the data to the server
                    data = PunchBridge.createSensorData(peripheral.uuid, tempReading, brixReading);
                    console.log(data);
                    // Disabled for now..
                    PunchBridge.pushData(data);
                });
            }
        });
    });
});


/* Main Section */

PunchBridge.initalSetup();
console.log("Punch Bridge UUID: " + PunchBridge.uuid);

// Test Data
// PunchBridge.pushData(PunchBridge.createSensorData('90123jdakfa00098', 32.0, 20.0));
// console.log("Data pushed!");
