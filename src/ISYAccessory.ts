import { Controls, ISYNode } from './hub';
import { Characteristic, Service, UUIDGen } from './plugin';

export class ISYAccessory<T extends ISYNode> {
    [x: string]: any;
    public logger: (msg: any) => void;
    public device: T;
    public address: any;
    // uuid_base: string;
    public informationService: HAPNodeJS.Service;
    public name: string;
    constructor(log, device: T) {
        this.uuid_base = UUIDGen.generate(device.isy.address + ':' + device.address + 1);
        this.name = device.name;
        this.logger = (msg) => {
            log('Accessory ' + device.name + ': ' + msg);
        };
        this.device = device;
        this.address = device.address;
        device.onPropertyChanged(null, this.handleExternalChange.bind(this));
    }
    public getServices(): HAPNodeJS.Service[] {
        const informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Insteon')
            .setCharacteristic(Characteristic.Model, this.device.productName === undefined ? this.device.name : this.device.productName)
            .setCharacteristic(Characteristic.SerialNumber, this.device.address);
        this.informationService = informationService;
        return [this.informationService];
    }
    public handleExternalChange(propertyName, value, formattedValue) {
        const name = propertyName in Controls ? Controls[propertyName].label : propertyName;
        this.logger(`Incoming external change to ${name}. Device says: ${value} (${formattedValue})`);
    }
    public convertToHK(propertyName, value: any) {
        return value;
    }
    public identify(callback) {
        // Do the identify action
        callback();
    }
}
