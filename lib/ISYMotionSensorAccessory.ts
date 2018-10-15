import { InsteonMotionSensorDevice } from 'isy-js';
import { Characteristic, Service } from "./plugin";
import { ISYDeviceAccessory } from "./ISYDeviceAccessory";
export class ISYMotionSensorAccessory extends ISYDeviceAccessory<InsteonMotionSensorDevice> {
	public sensorService: any;
	constructor(log, device) {
		super(log, device);
	}
	// Handles the identify command.
	// Handles the request to get he current motion sensor state.
	public getCurrentMotionSensorState(callback) {
		callback(null, this.device.isMotionDetected);
	}
	// Mirrors change in the state of the underlying isj-js device object.
	public handleExternalChange(propertyName, value, formattedValue) {
		super.handleExternalChange(propertyName, value, formattedValue);
		this.sensorService.setCharacteristic(Characteristic.MotionDetected, this.device.isMotionDetected);
	}
	// Returns the set of services supported by this object.
	public getServices() {
		super.getServices();
		const sensorService = new Service.MotionSensor();
		this.sensorService = sensorService;
		sensorService.getCharacteristic(Characteristic.MotionDetected).on('get', this.getCurrentMotionSensorState.bind(this));
		return [this.informationService, sensorService];
	}
}