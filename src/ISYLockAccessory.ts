import { InsteonLockDevice } from 'isy-js';
import { Characteristic, Service } from "./plugin";
import { ISYDeviceAccessory } from './ISYDeviceAccessory';

export class ISYLockAccessory extends ISYDeviceAccessory<InsteonLockDevice> {
	public lockService: any;
	constructor(log, device) {
		super(log, device);
	}
	// Handles an identify request
	public identify(callback) {
		callback();
	}
	// Handles a set to the target lock state. Will ignore redundant commands.
	public setTargetLockState(lockState, callback) {
		this.logger(`Sending command to set lock state to: ${lockState}`);
		if (lockState !== this.getDeviceCurrentStateAsHK()) {
			const targetLockValue = lockState === 0 ? false : true;
			this.device.sendLockCommand(targetLockValue, callback);
		} else {
			callback();
		}
	}
	// Translates underlying lock state into the corresponding homekit state
	public getDeviceCurrentStateAsHK() {
		return this.device.getCurrentLockState() ? 1 : 0;
	}
	// Handles request to get the current lock state for homekit
	public getLockCurrentState(callback) {
		callback(null, this.getDeviceCurrentStateAsHK());
	}
	// Handles request to get the target lock state for homekit
	public getTargetLockState(callback) {
		this.getLockCurrentState(callback);
	}
	// Mirrors change in the state of the underlying isy-js device object.
	public handleExternalChange(propertyName, value, formattedValue) {
		this.lockService.updateCharacteristic(Characteristic.LockTargetState, this.getDeviceCurrentStateAsHK());
		this.lockService.updateCharacteristic(Characteristic.LockCurrentState, this.getDeviceCurrentStateAsHK());
	}
	// Returns the set of services supported by this object.
	public getServices() {
		super.getServices();
		const lockMechanismService = new Service.LockMechanism();
		this.lockService = lockMechanismService;
		lockMechanismService.getCharacteristic(Characteristic.LockTargetState).on('set', this.setTargetLockState.bind(this));
		lockMechanismService.getCharacteristic(Characteristic.LockTargetState).on('get', this.getTargetLockState.bind(this));
		lockMechanismService.getCharacteristic(Characteristic.LockCurrentState).on('get', this.getLockCurrentState.bind(this));
		return [this.informationService, lockMechanismService];
	}
}