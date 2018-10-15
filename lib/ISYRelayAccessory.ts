import { InsteonDimmableDevice, InsteonRelayDevice } from 'isy-js';
import { ISYDeviceAccessory } from './ISYDeviceAccessory';
import { Characteristic, Service } from './plugin';
export class ISYRelayAccessory<T extends InsteonRelayDevice> extends ISYDeviceAccessory<T> {
	public dimmable: boolean;
	public lightService: any;
	constructor(log, device: T) {
		super(log, device);
		this.dimmable = device instanceof InsteonDimmableDevice;
	}
	// Handles the identify command
	// Handles request to set the current powerstate from homekit. Will ignore redundant commands.
	public setPowerState(powerOn: boolean, callback) {
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
	public handleExternalChange(propertyName, value, formattedValue) {
		super.handleExternalChange(propertyName, value, formattedValue);
		this.lightService.updateCharacteristic(Characteristic.On, this.device.isOn);
		if (this.dimmable) {
			this.lightService.updateCharacteristic(Characteristic.Brightness, this.device.brightnessLevel);
		}
	}
	// Handles request to get the current on state
	// Handles request to get the current on state
	public getPowerState(callback) {
		callback(null, this.device.isOn);
	}
	// Handles request to set the brightness level of dimmable lights. Ignore redundant commands.
	public setBrightness(level, callback) {
		this.logger(`Setting brightness to ${level}`);
		if (level !== this.device.brightnessLevel) {
			this.device
				.updateBrightnessLevel(level).handleWith(callback);
		} else {
			this.logger(`Ignoring redundant setBrightness`);
			callback();
		}
	}
	// Handles a request to get the current brightness level for dimmable lights.
	public getBrightness(callback) {
		callback(null, this.device.brightnessLevel);
	}
	// Returns the set of services supported by this object.
	public getServices() {
		super.getServices();
		const lightBulbService = new Service.Lightbulb();
		this.lightService = lightBulbService;
		lightBulbService.getCharacteristic(Characteristic.On).on('set', this.setPowerState.bind(this));
		lightBulbService.getCharacteristic(Characteristic.On).on('get', this.getPowerState.bind(this));
		if (this.dimmable) {
			lightBulbService.addCharacteristic(Characteristic.Brightness).on('get', this.getBrightness.bind(this));
			lightBulbService.getCharacteristic(Characteristic.Brightness).on('set', this.setBrightness.bind(this));
		}
		return [this.informationService, lightBulbService];
	}
}