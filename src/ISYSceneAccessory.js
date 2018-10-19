"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ISYAccessory_1 = require("./ISYAccessory");
const plugin_1 = require("./plugin");
class ISYSceneAccessory extends ISYAccessory_1.ISYAccessory {
    constructor(log, scene) {
        super(log, scene);
        this.scene = scene;
        this.dimmable = scene.isDimmable;
        // this.logger = function(msg) {log("Scene Accessory: " + scene.name + ": " + msg); };
    }
    // Handles the identify command
    identify(callback) {
        const that = this;
    }
    // Handles request to set the current powerstate from homekit. Will ignore redundant commands.
    setPowerState(powerOn, callback) {
        this.logger(`Setting powerstate to ${powerOn}`);
        if (this.scene.isOn != powerOn) {
            this.logger(`Changing powerstate to ${powerOn}`);
            this.scene.updateIsOn(powerOn).handleWith(callback);
        }
        else {
            this.logger(`Ignoring redundant setPowerState`);
            callback();
        }
    }
    setBrightness(level, callback) {
        this.logger(`Setting brightness to ${level}`);
        if (level !== this.scene.brightnessLevel) {
            this.scene.updateBrightnessLevel(level).handleWith(callback);
        }
        else {
            this.logger(`Ignoring redundant setBrightness`);
            callback();
        }
    }
    // Handles a request to get the current brightness level for dimmable lights.
    getBrightness(callback) {
        callback(null, this.scene.brightnessLevel);
    }
    // Mirrors change in the state of the underlying isj-js device object.
    handleExternalChange(propertyName, value, formattedValue) {
        this.lightService.updateCharacteristic(plugin_1.Characteristic.On, this.scene.isOn);
        if (this.dimmable) {
            this.lightService.updateCharacteristic(plugin_1.Characteristic.Brightness, this.scene.brightnessLevel);
        }
    }
    // Handles request to get the current on state
    getPowerState(callback) {
        callback(null, this.scene.isOn);
    }
    // Returns the set of services supported by this object.
    getServices() {
        super.getServices();
        if (this.dimmable) {
            this.lightService = new plugin_1.Service.Lightbulb();
            this.lightService.addCharacteristic(plugin_1.Characteristic.Brightness).on('get', (f) => this.getBrightness(f)).on('set', (l, f) => this.setBrightness(l, f));
        }
        else {
            this.lightService = new plugin_1.Service.Switch();
        }
        this.lightService
            .getCharacteristic(plugin_1.Characteristic.On)
            .on('set', this.setPowerState.bind(this))
            .on('get', this.getPowerState.bind(this));
        return [this.informationService, this.lightService];
    }
}
exports.ISYSceneAccessory = ISYSceneAccessory;
