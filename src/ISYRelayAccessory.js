"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isy_js_1 = require("isy-js");
const ISYDeviceAccessory_1 = require("./ISYDeviceAccessory");
const plugin_1 = require("./plugin");
class ISYRelayAccessory extends ISYDeviceAccessory_1.ISYDeviceAccessory {
    constructor(log, device) {
        super(log, device);
        this.dimmable = device instanceof isy_js_1.InsteonDimmableDevice;
    }
    // Handles the identify command
    // Handles request to set the current powerstate from homekit. Will ignore redundant commands.
    setPowerState(powerOn, callback) {
        if (powerOn !== this.device.isOn) {
            this.device
                .updateIsOn(powerOn).handleWith(callback);
        }
        else {
            this.logger(`Ignoring redundant setPowerState`);
            callback();
        }
    }
    // Mirrors change in the state of the underlying isj-js device object.
    handleExternalChange(propertyName, value, formattedValue) {
        super.handleExternalChange(propertyName, value, formattedValue);
        this.lightService.updateCharacteristic(plugin_1.Characteristic.On, this.device.isOn);
    }
    // Handles request to get the current on state
    // Handles request to get the current on state
    getPowerState(callback) {
        callback(null, this.device.isOn);
    }
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
        this.primaryService = new plugin_1.Service.Switch();
        this.primaryService.getCharacteristic(plugin_1.Characteristic.On).on('set', this.setPowerState.bind(this));
        this.primaryService.getCharacteristic(plugin_1.Characteristic.On).on('get', this.getPowerState.bind(this));
        return [this.informationService, this.primaryService];
    }
}
exports.ISYRelayAccessory = ISYRelayAccessory;
