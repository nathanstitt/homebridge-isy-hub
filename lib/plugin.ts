import { API } from 'homebridge';
import { ISYPlatform } from './ISYPlatform';

export let Service: any;
export let Characteristic: any;
let CProps: HAPNodeJS.CharacteristicProps;
// tslint:disable-next-line:variable-name
export let Hap: HAPNodeJS.HAPNodeJS;
let HapTypes: HAPNodeJS.Characteristic;
export let UUIDGen: HAPNodeJS.uuid;

declare global {
	interface Promise<T> {
		handleWith(callback: (...any) => void);
	}
}

Promise.prototype.handleWith = async function(callback) {
	console.log('handling');

	return this.then(() => {
		console.log('success');
		callback(false);
	}).catch((msg) => {

		console.log('error: ' + JSON.stringify(msg));
		callback(true);
	});
};

export default (homebridge: API) => {
	// Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Service = homebridge.hap.Service;
	UUIDGen = homebridge.hap.uuid;

	Hap = homebridge.hap;
	Service = Hap.Service;
	const api = homebridge;
	api.registerPlatform(`homebridge-isy-js`, 'isy-js', ISYPlatform);
};
