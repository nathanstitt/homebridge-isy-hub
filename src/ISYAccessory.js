"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isy_js_1 = require("isy-js");
const hap_nodejs_1 = require("hap-nodejs");
const plugin_1 = require("./plugin");
class ISYAccessory extends hap_nodejs_1.Accessory {
    constructor(log, device) {
        const s = plugin_1.UUIDGen.generate(device.isy.address + ':' + device.address + 1);
        // if (s == 'd2621ae0-9859-4445-a190-2359f9acddbb') log(device.name);
        super(device.name, s);
        // super(device.name,hapNodeJS.uuid.generate(device.isy.address + ":" + device.address))
        this.name = device.name;
        this.logger = (msg) => {
            log('Accessory ' + device.name + ': ' + msg);
        };
        this.device = device;
        this.address = device.address;
        device.onPropertyChanged(null, this.handleExternalChange.bind(this));
    }
    getServices() {
        const informationService = new plugin_1.Service.AccessoryInformation();
        informationService
            .setCharacteristic(plugin_1.Characteristic.Manufacturer, 'Insteon')
            .setCharacteristic(plugin_1.Characteristic.Model, this.device.productName === undefined ? this.device.name : this.device.productName)
            .setCharacteristic(plugin_1.Characteristic.SerialNumber, this.device.address);
        this.informationService = informationService;
        return [this.informationService];
    }
    handleExternalChange(propertyName, value, formattedValue) {
        const name = propertyName in isy_js_1.Controls ? isy_js_1.Controls[propertyName].label : propertyName;
        this.logger(`Incoming external change to ${name}. Device says: ${value} (${formattedValue})`);
    }
    convertToHK(propertyName, value) {
        return value;
    }
    identify(callback) {
        // Do the identify action
        callback();
    }
}
exports.ISYAccessory = ISYAccessory;
