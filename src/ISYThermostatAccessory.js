"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isy_js_1 = require("isy-js");
const ISYDeviceAccessory_1 = require("./ISYDeviceAccessory");
const plugin_1 = require("./plugin");
class ISYThermostatAccessory extends ISYDeviceAccessory_1.ISYDeviceAccessory {
    constructor(log, device) {
        super(log, device);
    }
    toCelsius(temp) {
        return ((temp - 32.0) * 5.0) / 9.0;
    }
    toFahrenheit(temp) {
        return Math.round((temp * 9.0) / 5.0 + 32.0);
    }
    getCurrentTemperature(callback) {
        this.logger(`Getting Current Temperature - Device says: ${this.device.currentTemperature} says: ${this.toCelsius(this.device.currentTemperature)}`);
        callback(null, this.toCelsius(this.device.currentTemperature));
    }
    getCoolSetPoint(callback) {
        this.logger(`Getting Cooling Set Point - Device says: ${this.device.coolSetPoint} translation says: ${this.toCelsius(this.device.coolSetPoint)}`);
        callback(null, this.toCelsius(this.device.coolSetPoint));
    }
    getHeatSetPoint(callback) {
        this.logger(`Getting Heating Set Point - Device says: ${this.device.heatSetPoint} translation says: ${this.toCelsius(this.device.heatSetPoint)}`);
        callback(null, this.toCelsius(this.device.heatSetPoint));
    }
    getMode(callback) {
        this.logger(`Getting Heating Cooling Mode - Device says: ${this.device.mode}`);
        callback(null, this.device.mode);
    }
    getOperatingMode(callback) {
        this.logger(`Getting Heating Cooling State - Device says: ${this.device.operatingMode}`);
        callback(null, this.device.operatingMode);
    }
    getFanMode(callback) {
        this.logger(`Getting Fan State - Device says: ${this.device.fanMode}`);
        callback(null, this.device.fanMode);
    }
    getHumidity(callback) {
        this.logger(`Getting Current Rel. Humidity - Device says: ${this.device.humidity}`);
        callback(null, this.device.humidity);
    }
    // Mirrors change in the state of the underlying isy-js device object.
    handleExternalChange(propertyName, value, formattedValue) {
        super.handleExternalChange(propertyName, value, formattedValue);
        switch (propertyName) {
            case isy_js_1.Props.Status:
                this.thermostatService.updateCharacteristic(plugin_1.Characteristic.CurrentTemperature, this.toCelsius(this.device.currentTemperature));
                break;
            case isy_js_1.Props.Climate.CoolSetPoint:
                this.thermostatService.updateCharacteristic(plugin_1.Characteristic.CoolingThresholdTemperature, this.toCelsius(this.device.coolSetPoint));
                break;
            case isy_js_1.Props.Climate.HeatSetPoint:
                this.thermostatService.updateCharacteristic(plugin_1.Characteristic.CoolingThresholdTemperature, this.toCelsius(this.device.heatSetPoint));
                break;
            case isy_js_1.Props.Climate.OperatingMode:
                this.thermostatService.updateCharacteristic(plugin_1.Characteristic.CurrentHeatingCoolingState, this.device.operatingMode);
                break;
            case isy_js_1.Props.Climate.Mode:
                this.thermostatService.updateCharacteristic(plugin_1.Characteristic.TargetHeatingCoolingState, this.device.mode);
                break;
            case isy_js_1.Props.Climate.FanMode:
                this.thermostatService.updateCharacteristic(plugin_1.Characteristic.CurrentFanState, this.device.fanMode);
                break;
            case isy_js_1.Props.Climate.Humidity:
                this.thermostatService.updateCharacteristic(plugin_1.Characteristic.CurrentRelativeHumidity, this.device.humidity);
                break;
            default:
                break;
        }
    }
    getServices() {
        const svcs = super.getServices();
        this.thermostatService = new plugin_1.Service.Thermostat();
        // thermostatService.getCharacteristic(Characteristic.TargetTemperature).on("get", this.getTargetTemperature.bind(this));
        // thermostatService.getCharacteristic(Characteristic.TargetTemperature).on("set", this.setTargetTemperature.bind(this));
        this.thermostatService.setCharacteristic(plugin_1.Characteristic.TemperatureDisplayUnits, 1);
        this.thermostatService.addCharacteristic(plugin_1.Characteristic.CurrentFanState);
        this.thermostatService.getCharacteristic(plugin_1.Characteristic.CurrentFanState).on('get', (f) => this.getFanMode(f));
        this.thermostatService.getCharacteristic(plugin_1.Characteristic.CurrentTemperature).on('get', this.getCurrentTemperature.bind(this));
        this.thermostatService.getCharacteristic(plugin_1.Characteristic.CoolingThresholdTemperature).on('get', this.getCoolSetPoint.bind(this));
        this.thermostatService.getCharacteristic(plugin_1.Characteristic.CoolingThresholdTemperature).on('set', this.setCoolSetPoint.bind(this));
        this.thermostatService.getCharacteristic(plugin_1.Characteristic.HeatingThresholdTemperature).on('get', this.getHeatSetPoint.bind(this));
        this.thermostatService.getCharacteristic(plugin_1.Characteristic.HeatingThresholdTemperature).on('set', this.setHeatSetPoint.bind(this));
        this.thermostatService.getCharacteristic(plugin_1.Characteristic.CurrentHeatingCoolingState).on('get', this.getOperatingMode.bind(this));
        this.thermostatService.getCharacteristic(plugin_1.Characteristic.TargetHeatingCoolingState).on('get', this.getMode.bind(this));
        this.thermostatService.getCharacteristic(plugin_1.Characteristic.TargetHeatingCoolingState).on('set', this.setHeatingCoolingMode.bind(this));
        this.thermostatService.getCharacteristic(plugin_1.Characteristic.CurrentRelativeHumidity).on('get', this.getHumidity.bind(this));
        svcs.push(this.thermostatService);
        // ThermostatService
        //   .getCharacteristic(Characteristic.RotationSpeed)
        //   .on('set', this.setThermostatRotationSpeed.bind(this));
        return svcs;
    }
    setCoolSetPoint(temp, callback) {
        this.logger(`Sending command to set cool set point (pre-translate) to: ${temp}`);
        const newSetPoint = this.toFahrenheit(temp);
        this.logger(`Sending command to set cool set point to: ${newSetPoint}`);
        if (Math.abs(newSetPoint - this.device.coolSetPoint) >= 1) {
            this.device.updateCoolSetPoint(newSetPoint).handleWith(callback);
        }
        else {
            this.logger(`Command does not change actual set point`);
            callback();
        }
    }
    setHeatSetPoint(temp, callback) {
        this.logger(`Sending command to set heat set point (pre-translate) to: ${temp}`);
        const newSetPoint = this.toFahrenheit(temp);
        this.logger(`Sending command to set heat set point to: ${newSetPoint}`);
        if (Math.abs(newSetPoint - this.device.heatSetPoint) >= 1) {
            this.device
                .updateHeatSetPoint(newSetPoint).handleWith(callback);
        }
        else {
            this.logger(`Command does not change actual set point`);
            callback();
        }
    }
    setHeatingCoolingMode(mode, callback) {
        this.logger(`Sending command to set heating/cooling mode (pre-translate) to: ${mode}`);
        // this.logger("THERM: " + this.device.name + " Sending command to set cool set point to: " + newSetPoint);
        if (mode !== this.device.mode) {
            this.device
                .updateMode(mode).handleWith(callback);
        }
        else {
            this.logger(`Command does not change actual mode`);
            callback();
        }
    }
}
exports.ISYThermostatAccessory = ISYThermostatAccessory;
