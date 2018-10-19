import 'hap-nodejs';

import { InsteonFanDevice } from 'isy-js';

import { ISYDeviceAccessory } from './ISYDeviceAccessory';

import { Characteristic, Service } from './plugin';

import './ISYPlatform';

export class ISYFanAccessory extends ISYDeviceAccessory<InsteonFanDevice> {
	public fanService: HAPNodeJS.Service;
	public lightService: HAPNodeJS.Service;
	constructor(log, device) {
		super(log, device);
		// this.logger(JSON.stringify(this.device.scenes[0]));
	}
	// Translates the fan level from homebridge into the isy-js level. Maps from the 0-100
	// to the four isy-js fan speed levels.
	public translateHKToFanSpeed(fanStateHK) {
		if (fanStateHK === 0) {
			return 0;
		} else if (fanStateHK > 0 && fanStateHK <= 25) {
			return 25;
		} else if (fanStateHK >= 33 && fanStateHK <= 75) {
			return 75;
		} else if (fanStateHK > 75) {
			return 100;
		} else {
			this.logger(`ERROR: Unknown fan state!`);
			return 0;

		}
	}
	// Returns the current state of the fan from the isy-js level to the 0-100 level of HK.
	public getFanRotationSpeed(callback) {
		this.logger(`Getting fan rotation speed. Device says: ${this.device.fanSpeed} translation says: ${this.device.fanSpeed}`);
		callback(null, this.device.fanSpeed);
	}
	// Sets the current state of the fan from the 0-100 level of HK to the isy-js level.
	public setFanRotationSpeed(fanStateHK, callback) {
		this.logger(`Sending command to set fan state (pre-translate) to: ${fanStateHK}`);
		const newFanState = this.translateHKToFanSpeed(fanStateHK);
		this.logger(`Sending command to set fan state to: ${fanStateHK}`);
		if (newFanState !== this.device.fanSpeed) {
			this.device
				.updateFanSpeed(newFanState).handleWith(callback);
		} else {
			this.logger(`Fan command does not change actual speed`);
			callback();
		}
	}
	public getLightOnState() { }
	// Returns true if the fan is on
	public getIsFanOn() {
		this.logger(`Getting fan is on. Device says: ${this.device.isOn} Code says: ${this.device.isOn}`);
		return this.device.isOn;
	}
	// Returns the state of the fan to the homebridge system for the On characteristic
	public getFanOnState(callback) {
		callback(null, this.device.isOn);
	}
	// Sets the fan state based on the value of the On characteristic. Default to Medium for on.
	public setFanOnState(onState, callback) {
		this.logger(`Setting fan on state to: ${onState} Device says: ${this.device.isOn}`);
		if (onState !== this.device.isOn) {
			if (onState) {
				this.logger(`Turning fan on. Setting fan speed to high.`);
				this.device
					.updateIsOn(onState).handleWith(callback);
			} else {
				this.logger(`Turning fan off.`);
				this.device
					.updateIsOn(onState).handleWith(callback);
			}
		} else {
			this.logger(`Fan command does not change actual state`);
			callback();
		}
	}
	public setPowerState(powerOn, callback) {
		this.logger(`Setting powerstate to ${powerOn}`);
		if (powerOn !== this.device.isOn) {
			this.logger(`Changing powerstate to ${powerOn}`);
			this.device
				.updateIsOn(powerOn).handleWith(callback);
		} else {
			this.logger(`Ignoring redundant setPowerState`);
			callback();
		}
	}
	// Handles request to get the current on state
	public getPowerState(callback) {
		callback(null, this.device.isOn);
	}
	// Handles request to set the brightness level of dimmable lights. Ignore redundant commands.
	public setBrightness(level, callback) {
		this.logger(`Setting brightness to ${level}`);
		if (level !== this.device.brightnessLevel) {
			this.device.updateBrightnessLevel(level);
		} else {
			this.logger(`Ignoring redundant setBrightness`);
			callback();
		}
	}
	// Handles a request to get the current brightness level for dimmable lights.
	public getBrightness(callback) {
		callback(null, this.device.brightnessLevel);
	}
	// Mirrors change in the state of the underlying isj-js device object.
	public handleExternalChange(propertyName, value, formattedValue) {
		super.handleExternalChange(propertyName, value, formattedValue);
		this.fanService.updateCharacteristic(Characteristic.On, this.device.isOn);
		this.fanService.updateCharacteristic(Characteristic.RotationSpeed, this.device.fanSpeed);
		// this.logger("" + this.device.name + " Handling external change for light");
		// this.lightService
		// 	.updateCharacteristic(Characteristic.On, this.device.getCurrentLightState());
		// if (this.dimmable) {
		// 	this.lightService
		// 		.updateCharacteristic(Characteristic.Brightness, this.device.getCurrentLightDimState());
		// }
	}
	// Returns the services supported by the fan device.
	public getServices() {
		const s = super.getServices();
		const fanService = new Service.Fan();
		this.fanService = fanService;
		const lightService = new Service.Lightbulb(this.device.name + " - Light");
		this.lightService = lightService;
		fanService.getCharacteristic(Characteristic.On).on('set', this.setFanOnState.bind(this));
		fanService.getCharacteristic(Characteristic.On).on('get', this.getFanOnState.bind(this));
		fanService.addCharacteristic(Characteristic.RotationSpeed).on('get', this.getFanRotationSpeed.bind(this));
		fanService.getCharacteristic(Characteristic.RotationSpeed).on('set', this.setFanRotationSpeed.bind(this));
		s.push(fanService, lightService);
		return s;
	}
}
