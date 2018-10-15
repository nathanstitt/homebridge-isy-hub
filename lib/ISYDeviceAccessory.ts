import { InsteonBaseDevice } from 'isy-js';
import { ISYAccessory } from "./ISYAccessory";
export class ISYDeviceAccessory<T extends InsteonBaseDevice> extends ISYAccessory<T> {
	public identify(callback) {
		this.device.sendBeep(100).then(() => callback);
	}
}