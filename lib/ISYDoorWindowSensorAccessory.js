"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_1 = require("./plugin");
const ISYDeviceAccessory_1 = require("./ISYDeviceAccessory");
class ISYDoorWindowSensorAccessory extends ISYDeviceAccessory_1.ISYDeviceAccessory {
    constructor(log, device) {
        super(log, device);
        this.doorWindowState = false;
    }
    // Handles the identify command.
    // Translates the state of the underlying device object into the corresponding homekit compatible state
    translateCurrentDoorWindowState() {
        return this.device.isOpen ? plugin_1.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED : plugin_1.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }
    // Handles the request to get he current door window state.
    getCurrentDoorWindowState(callback) {
        callback(null, this.translateCurrentDoorWindowState());
    }
    // Mirrors change in the state of the underlying isj-js device object.
    handleExternalChange(propertyName, value, formattedValue) {
        super.handleExternalChange(propertyName, value, formattedValue);
        this.sensorService.setCharacteristic(plugin_1.Characteristic.ContactSensorState, this.translateCurrentDoorWindowState());
    }
    // Returns the set of services supported by this object.
    getServices() {
        super.getServices();
        const sensorService = new plugin_1.Service.ContactSensor();
        this.sensorService = sensorService;
        sensorService.getCharacteristic(plugin_1.Characteristic.ContactSensorState).on('get', this.getCurrentDoorWindowState.bind(this));
        return [this.informationService, sensorService];
    }
}
exports.ISYDoorWindowSensorAccessory = ISYDoorWindowSensorAccessory;
