"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ISYRelayAccessory_1 = require("ISYRelayAccessory");
const plugin_1 = require("./plugin");
class ISYDimmableAccessory extends ISYRelayAccessory_1.ISYRelayAccessory {
    constructor(log, device) {
        super(log, device);
    }
    // Handles the identify command
    // Handles request to set the current powerstate from homekit. Will ignore redundant commands.
    // Mirrors change in the state of the underlying isj-js device object.
    handleExternalChange(propertyName, value, formattedValue) {
        super.handleExternalChange(propertyName, value, formattedValue);
        // this.lightService.updateCharacteristic(Characteristic.On, this.device.isOn);
        this.lightService.updateCharacteristic(plugin_1.Characteristic.Brightness, this.device.brightnessLevel);
    }
    // Handles request to get the current on state
    // Handles request to get the current on state
    // Handles request to set the brightness level of dimmable lights. Ignore redundant commands.
    setBrightness(level, callback) {
        this.logger(`Setting brightness to ${level}`);
        if (level !== this.device.brightnessLevel) {
            this.device
                .updateBrightnessLevel(level).handleWith(callback);
        }
        else {
            this.logger(`Ignoring redundant setBrightness`);
            callback();
        }
    }
    // Handles a request to get the current brightness level for dimmable lights.
    getBrightness(callback) {
        callback(null, this.device.brightnessLevel);
    }
    // Returns the set of services supported by this object.
    getServices() {
        super.getServices();
        this.primaryService = new plugin_1.Service.Lightbulb();
        this.primaryService.getCharacteristic(plugin_1.Characteristic.On).on('set', this.setPowerState.bind(this));
        this.primaryService.getCharacteristic(plugin_1.Characteristic.On).on('get', this.getPowerState.bind(this));
        // lightBulbService.getCharacteristic(Characteristic.On).on('get', this.getPowerState.bind(this));
        this.primaryService.addCharacteristic(plugin_1.Characteristic.Brightness).on('get', this.getBrightness.bind(this));
        this.primaryService.getCharacteristic(plugin_1.Characteristic.Brightness).on('set', this.setBrightness.bind(this));
        return [this.informationService, this.primaryService];
    }
}
exports.ISYDimmableAccessory = ISYDimmableAccessory;
