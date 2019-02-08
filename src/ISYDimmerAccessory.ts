import { InsteonDimmableDevice } from './hub';
import { ISYRelayAccessory } from './ISYRelayAccessory';
import { Characteristic, Service } from './plugin';

export class ISYDimmableAccessory<T extends InsteonDimmableDevice> extends ISYRelayAccessory<T> {

    constructor(log, device: T) {
        super(log, device);

    }
    // Handles the identify command
    // Handles request to set the current powerstate from homekit. Will ignore redundant commands.

    // Mirrors change in the state of the underlying isj-js device object.
    public handleExternalChange(propertyName, value, formattedValue) {
        super.handleExternalChange(propertyName, value, formattedValue);
        // this.lightService.updateCharacteristic(Characteristic.On, this.device.isOn);

        this.primaryService.updateCharacteristic(Characteristic.Brightness, this.device.brightnessLevel);

    }
    // Handles request to get the current on state
    // Handles request to get the current on state

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
        this.primaryService = new Service.Lightbulb();
        this.primaryService.getCharacteristic(Characteristic.On).on('set', this.setPowerState.bind(this));
        this.primaryService.getCharacteristic(Characteristic.On).on('get', this.getPowerState.bind(this));
        // lightBulbService.getCharacteristic(Characteristic.On).on('get', this.getPowerState.bind(this));
        this.primaryService.addCharacteristic(Characteristic.Brightness).on('get', this.getBrightness.bind(this));
        this.primaryService.getCharacteristic(Characteristic.Brightness).on('set', this.setBrightness.bind(this));

        return [this.informationService, this.primaryService];
    }
}
