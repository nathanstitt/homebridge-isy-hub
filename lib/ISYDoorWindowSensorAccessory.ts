import { InsteonDoorWindowSensorDevice } from 'isy-js';
import { Characteristic, Service } from "./plugin";
import { ISYDeviceAccessory } from "./ISYDeviceAccessory";
export class ISYDoorWindowSensorAccessory extends ISYDeviceAccessory<InsteonDoorWindowSensorDevice> {
	public doorWindowState: boolean;
	public sensorService: any;
	constructor(log, device) {
		super(log, device);
		this.doorWindowState = false;
	}
	// Handles the identify command.
	// Translates the state of the underlying device object into the corresponding homekit compatible state
	public translateCurrentDoorWindowState() {
		return this.device.isOpen ? Characteristic.ContactSensorState.CONTACT_NOT_DETECTED : Characteristic.ContactSensorState.CONTACT_DETECTED;
	}
	// Handles the request to get he current door window state.
	public getCurrentDoorWindowState(callback) {
		callback(null, this.translateCurrentDoorWindowState());
	}
	// Mirrors change in the state of the underlying isj-js device object.
	public handleExternalChange(propertyName, value, formattedValue) {
		super.handleExternalChange(propertyName, value, formattedValue);
		this.sensorService.setCharacteristic(Characteristic.ContactSensorState, this.translateCurrentDoorWindowState());
	}
	// Returns the set of services supported by this object.
	public getServices() {
		super.getServices();
		const sensorService = new Service.ContactSensor();
		this.sensorService = sensorService;
		sensorService.getCharacteristic(Characteristic.ContactSensorState).on('get', this.getCurrentDoorWindowState.bind(this));
		return [this.informationService, sensorService];
	}
}