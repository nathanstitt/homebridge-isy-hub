import { ISYScene } from 'isy-js';
import { ISYAccessory } from './ISYAccessory';
import { Characteristic, Service } from './plugin';

export class ISYSceneAccessory extends ISYAccessory<ISYScene> {
	public dimmable: boolean;
	public lightService: HAPNodeJS.Service;
	public scene: ISYScene;
	constructor(log, scene) {
		super(log, scene);
		this.scene = scene;
		this.dimmable = scene.isDimmable;
		// this.logger = function(msg) {log("Scene Accessory: " + scene.name + ": " + msg); };
	}
	// Handles the identify command
	public identify(callback) {
		const that = this;
	}
	// Handles request to set the current powerstate from homekit. Will ignore redundant commands.
	public setPowerState(powerOn, callback) {
		this.logger(`Setting powerstate to ${powerOn}`);
		if (this.scene.isOn !== powerOn) {
			this.logger(`Changing powerstate to ${powerOn}`);
			this.scene.updateIsOn(powerOn).handleWith(callback);
		} else {
			this.logger(`Ignoring redundant setPowerState`);
			callback();
		}
	}
	public setBrightness(level, callback) {
		this.logger(`Setting brightness to ${level}`);
		if (level !== this.scene.brightnessLevel) {
			this.scene.updateBrightnessLevel(level).handleWith(callback);
		} else {
			this.logger(`Ignoring redundant setBrightness`);
			callback();
		}
	}
	// Handles a request to get the current brightness level for dimmable lights.
	public getBrightness(callback) {
		callback(null, this.scene.brightnessLevel);
	}
	// Mirrors change in the state of the underlying isj-js device object.
	public handleExternalChange(propertyName, value, formattedValue) {
		this.lightService.updateCharacteristic(Characteristic.On, this.scene.isOn);
		if (this.dimmable) {
			this.lightService.updateCharacteristic(Characteristic.Brightness, this.scene.brightnessLevel);
		}
	}
	// Handles request to get the current on state
	public getPowerState(callback) {
		callback(null, this.scene.isOn);
	}
	// Returns the set of services supported by this object.
	public getServices() {
		super.getServices();

		if (this.dimmable) {
			this.lightService = new Service.Lightbulb();

			this.lightService.addCharacteristic(Characteristic.Brightness).on('get', (f) => this.getBrightness(f)).on('set', (l, f) => this.setBrightness(l, f));
		} else {
			this.lightService = new Service.Switch();
		}
		this.lightService
			.getCharacteristic(Characteristic.On)
			.on('set', this.setPowerState.bind(this))
			.on('get', this.getPowerState.bind(this));
		return [this.informationService, this.lightService];
	}
}
