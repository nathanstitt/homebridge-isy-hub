"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_1 = require("./plugin");
const ISYAccessory_1 = require("./ISYAccessory");
class ISYGarageDoorAccessory extends ISYAccessory_1.ISYAccessory {
    constructor(log, sensorDevice, relayDevice, name, timeToOpen, alternate) {
        super(log, sensorDevice);
        this.timeToOpen = timeToOpen;
        this.relayDevice = relayDevice;
        this.alternate = alternate === undefined ? false : alternate;
        if (this.getSensorState()) {
            this.logger(`GARAGE: ${this.name} Initial set during startup the sensor is open so defaulting states to open`);
            this.targetGarageState = plugin_1.Characteristic.TargetDoorState.OPEN;
            this.currentGarageState = plugin_1.Characteristic.CurrentDoorState.OPEN;
        }
        else {
            this.logger(`GARAGE: ${this.name} Initial set during startup the sensor is closed so defaulting states to closed`);
            this.targetGarageState = plugin_1.Characteristic.TargetDoorState.CLOSED;
            this.currentGarageState = plugin_1.Characteristic.CurrentDoorState.CLOSED;
        }
    }
    getSensorState() {
        if (this.alternate) {
            return !this.device.getCurrentDoorWindowState();
        }
        else {
            return this.device.getCurrentDoorWindowState();
        }
    }
    // Handles an identify request
    identify(callback) {
        callback();
    }
    sendGarageDoorCommand(callback) {
        this.relayDevice.sendLightCommand(true, function () {
            callback();
        });
    }
    // Handles a set to the target lock state. Will ignore redundant commands.
    setTargetDoorState(targetState, callback) {
        const that = this;
        if (targetState === this.targetGarageState) {
            this.logger('GARAGE: Ignoring redundant set of target state');
            callback();
            return;
        }
        this.targetGarageState = targetState;
        if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.OPEN) {
            if (targetState === plugin_1.Characteristic.TargetDoorState.CLOSED) {
                this.logger(`GARAGE: Current state is open and target is closed. Changing state to closing and sending command`);
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.CurrentDoorState, plugin_1.Characteristic.CurrentDoorState.CLOSING);
                this.sendGarageDoorCommand(callback);
            }
        }
        else if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.CLOSED) {
            if (targetState === plugin_1.Characteristic.TargetDoorState.OPEN) {
                this.logger(`GARAGE: Current state is closed and target is open. Waiting for sensor change to trigger opening state`);
                this.sendGarageDoorCommand(callback);
                return;
            }
        }
        else if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.OPENING) {
            if (targetState === plugin_1.Characteristic.TargetDoorState.CLOSED) {
                this.logger('GARAGE: ' + this.device.name + ' Current state is opening and target is closed. Sending command and changing state to closing');
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.CurrentDoorState, plugin_1.Characteristic.CurrentDoorState.CLOSING);
                this.sendGarageDoorCommand(function () {
                    setTimeout(function () {
                        that.sendGarageDoorCommand(callback);
                    }, 3000);
                });
                return;
            }
        }
        else if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.CLOSING) {
            if (targetState === plugin_1.Characteristic.TargetDoorState.OPEN) {
                this.logger('GARAGE: ' + this.device.name + ' Current state is closing and target is open. Sending command and setting timeout to complete');
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.CurrentDoorState, plugin_1.Characteristic.CurrentDoorState.OPENING);
                this.sendGarageDoorCommand(function () {
                    that.sendGarageDoorCommand(callback);
                    setTimeout(that.completeOpen.bind(that), that.timeToOpen);
                });
            }
        }
    }
    // Handles request to get the current lock state for homekit
    getCurrentDoorState(callback) {
        callback(null, this.currentGarageState);
    }
    setCurrentDoorState(newState, callback) {
        this.currentGarageState = newState;
        callback();
    }
    // Handles request to get the target lock state for homekit
    getTargetDoorState(callback) {
        callback(null, this.targetGarageState);
    }
    completeOpen() {
        if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.OPENING) {
            this.logger('Current door has bee opening long enough, marking open');
            this.garageDoorService.setCharacteristic(plugin_1.Characteristic.CurrentDoorState, plugin_1.Characteristic.CurrentDoorState.OPEN);
        }
        else {
            this.logger('Opening aborted so not setting opened state automatically');
        }
    }
    // Mirrors change in the state of the underlying isj-js device object.
    handleExternalChange(propertyName, value, formattedValue) {
        super.handleExternalChange(propertyName, value, formattedValue);
        if (this.getSensorState()) {
            if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.OPEN) {
                this.logger('GARAGE:  ' + this.device.name + 'Current state of door is open and now sensor matches. No action to take');
            }
            else if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.CLOSED) {
                this.logger('GARAGE:  ' + this.device.name + 'Current state of door is closed and now sensor says open. Setting state to opening');
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.CurrentDoorState, plugin_1.Characteristic.CurrentDoorState.OPENING);
                this.targetGarageState = plugin_1.Characteristic.TargetDoorState.OPEN;
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.TargetDoorState, plugin_1.Characteristic.CurrentDoorState.OPEN);
                setTimeout(this.completeOpen.bind(this), this.timeToOpen);
            }
            else if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.OPENING) {
                this.logger('GARAGE:  ' + this.device.name + 'Current state of door is opening and now sensor matches. No action to take');
            }
            else if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.CLOSING) {
                this.logger('GARAGE: C ' + this.device.name + 'Current state of door is closing and now sensor matches. No action to take');
            }
        }
        else {
            if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.OPEN) {
                this.logger('GARAGE:  ' + this.device.name + 'Current state of door is open and now sensor shows closed. Setting current state to closed');
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.CurrentDoorState, plugin_1.Characteristic.CurrentDoorState.CLOSED);
                this.targetGarageState = plugin_1.Characteristic.TargetDoorState.CLOSED;
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.TargetDoorState, plugin_1.Characteristic.TargetDoorState.CLOSED);
            }
            else if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.CLOSED) {
                this.logger('GARAGE:  ' + this.device.name + 'Current state of door is closed and now sensor shows closed. No action to take');
            }
            else if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.OPENING) {
                this.logger('GARAGE:  ' + this.device.name + 'Current state of door is opening and now sensor shows closed. Setting current state to closed');
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.CurrentDoorState, plugin_1.Characteristic.CurrentDoorState.CLOSED);
                this.targetGarageState = plugin_1.Characteristic.TargetDoorState.CLOSED;
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.TargetDoorState, plugin_1.Characteristic.TargetDoorState.CLOSED);
            }
            else if (this.currentGarageState === plugin_1.Characteristic.CurrentDoorState.CLOSING) {
                this.logger(`GARAGE:  ${this.device.name}Current state of door is closing and now sensor shows closed. Setting current state to closed`);
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.CurrentDoorState, plugin_1.Characteristic.CurrentDoorState.CLOSED);
                this.targetGarageState = plugin_1.Characteristic.TargetDoorState.CLOSED;
                this.garageDoorService.setCharacteristic(plugin_1.Characteristic.TargetDoorState, plugin_1.Characteristic.TargetDoorState.CLOSED);
            }
        }
    }
    getObstructionState(callback) {
        callback(null, false);
    }
    // Returns the set of services supported by this object.
    getServices() {
        super.getServices();
        const garageDoorService = new plugin_1.Service.GarageDoorOpener();
        this.garageDoorService = garageDoorService;
        garageDoorService.getCharacteristic(plugin_1.Characteristic.TargetDoorState).on('set', this.setTargetDoorState.bind(this));
        garageDoorService.getCharacteristic(plugin_1.Characteristic.TargetDoorState).on('get', this.getTargetDoorState.bind(this));
        garageDoorService.getCharacteristic(plugin_1.Characteristic.CurrentDoorState).on('get', this.getCurrentDoorState.bind(this));
        garageDoorService.getCharacteristic(plugin_1.Characteristic.CurrentDoorState).on('set', this.setCurrentDoorState.bind(this));
        garageDoorService.getCharacteristic(plugin_1.Characteristic.ObstructionDetected).on('get', this.getObstructionState.bind(this));
        return [this.informationService, garageDoorService];
    }
}
exports.ISYGarageDoorAccessory = ISYGarageDoorAccessory;
