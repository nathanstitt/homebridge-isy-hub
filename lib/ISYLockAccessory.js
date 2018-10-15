"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_1 = require("./plugin");
const ISYDeviceAccessory_1 = require("./ISYDeviceAccessory");
class ISYLockAccessory extends ISYDeviceAccessory_1.ISYDeviceAccessory {
    constructor(log, device) {
        super(log, device);
    }
    // Handles an identify request
    identify(callback) {
        callback();
    }
    // Handles a set to the target lock state. Will ignore redundant commands.
    setTargetLockState(lockState, callback) {
        this.logger(`Sending command to set lock state to: ${lockState}`);
        if (lockState !== this.getDeviceCurrentStateAsHK()) {
            const targetLockValue = lockState === 0 ? false : true;
            this.device.sendLockCommand(targetLockValue, callback);
        }
        else {
            callback();
        }
    }
    // Translates underlying lock state into the corresponding homekit state
    getDeviceCurrentStateAsHK() {
        return this.device.getCurrentLockState() ? 1 : 0;
    }
    // Handles request to get the current lock state for homekit
    getLockCurrentState(callback) {
        callback(null, this.getDeviceCurrentStateAsHK());
    }
    // Handles request to get the target lock state for homekit
    getTargetLockState(callback) {
        this.getLockCurrentState(callback);
    }
    // Mirrors change in the state of the underlying isy-js device object.
    handleExternalChange(propertyName, value, formattedValue) {
        this.lockService.updateCharacteristic(plugin_1.Characteristic.LockTargetState, this.getDeviceCurrentStateAsHK());
        this.lockService.updateCharacteristic(plugin_1.Characteristic.LockCurrentState, this.getDeviceCurrentStateAsHK());
    }
    // Returns the set of services supported by this object.
    getServices() {
        super.getServices();
        const lockMechanismService = new plugin_1.Service.LockMechanism();
        this.lockService = lockMechanismService;
        lockMechanismService.getCharacteristic(plugin_1.Characteristic.LockTargetState).on('set', this.setTargetLockState.bind(this));
        lockMechanismService.getCharacteristic(plugin_1.Characteristic.LockTargetState).on('get', this.getTargetLockState.bind(this));
        lockMechanismService.getCharacteristic(plugin_1.Characteristic.LockCurrentState).on('get', this.getLockCurrentState.bind(this));
        return [this.informationService, lockMechanismService];
    }
}
exports.ISYLockAccessory = ISYLockAccessory;
