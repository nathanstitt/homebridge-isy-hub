import { API } from 'homebridge';
import { ISYPlatform } from './ISYPlatform';

export let Service: HAPNodeJS.Service;
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
    return this.then(() => {
        callback(false);
    }).catch((msg) => {
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
    api.registerPlatform(`homebridge-isy-hub`, 'isy-hub', ISYPlatform);
};
