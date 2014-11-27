var request = require('request');
var noble = require('noble');
var uuid = require('node-uuid');
var fs = require('fs');


/* Settings */
var PUNCH_UUID_FILENAME = '.punch_uuid';
var PUNCH_HOSTNAME = 'http://localhost:8000';

var PUNCH_BLE_SERVICE_UUID = 'b0bb58205a0d11e493ee0002a5d5c51b';
var PUNCH_BLE_TEMP_CHAR_UUID = '';
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
 * @param  {string} hex_string A hex string storing a float in left endian format.
 * @return {number}            The number representation
 */
PunchBridge.convertHexToFloat = function(hex_string) {
    return Buffer(hex_string, 'hex').readFloatLE(0);
};


/* BLE setup */
noble.on('stateChange', function(state){
    if (state === 'poweredOn') {
        noble.startScanning();
    } else {
        noble.stopScanning();
    }
});

noble.on('discover', function(peripheral) {
});


/* Main Section */

PunchBridge.initalSetup();
console.log(PunchBridge.uuid);
// Tests
// PunchBridge.pushData(PunchBridge.createSensorData('12345610adf', 25.0, 10.0));
