"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_1 = require("./plugin");
const ISYDeviceAccessory_1 = require("./ISYDeviceAccessory");
class ISYOutletAccessory extends ISYDeviceAccessory_1.ISYDeviceAccessory {
    constructor(log, device) {
        super(log, device);
    }
    // Handles the identify command
    // Handles a request to set the outlet state. Ignores redundant sets based on current states.
    setOutletState(outletState, callback) {
        this.logger(`OUTLET: Sending command to set outlet state to: ${outletState}`);
        if (outletState !== this.device.isOn) {
            this.device
                .updateIsOn(outletState)
                .then(callback(true))
                .catch(callback(false));
        }
        else {
            callback();
        }
    }
    // Handles a request to get the current outlet state based on underlying isy-js device object.
    getOutletState(callback) {
        callback(null, this.device.isOn);
    }
    // Handles a request to get the current in use state of the outlet. We set this to true always as
    // there is no way to deterine this through the isy.
    getOutletInUseState(callback) {
        callback(null, true);
    }
    // Mirrors change in the state of the underlying isj-js device object.
    handleExternalChange(propertyName, value, formattedValue) {
        super.handleExternalChange(propertyName, value, formattedValue);
        this.outletService.updateCharacteristic(plugin_1.Characteristic.On, this.device.isOn);
    }
    // Returns the set of services supported by this object.
    getServices() {
        super.getServices();
        const outletService = new plugin_1.Service.Outlet();
        this.outletService = outletService;
        outletService.getCharacteristic(plugin_1.Characteristic.On).on('set', this.setOutletState.bind(this));
        outletService.getCharacteristic(plugin_1.Characteristic.On).on('get', this.getOutletState.bind(this));
        outletService.getCharacteristic(plugin_1.Characteristic.OutletInUse).on('get', this.getOutletInUseState.bind(this));
        return [this.informationService, outletService];
    }
}
exports.ISYOutletAccessory = ISYOutletAccessory;
