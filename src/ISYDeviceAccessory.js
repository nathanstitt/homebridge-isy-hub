"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ISYAccessory_1 = require("./ISYAccessory");
class ISYDeviceAccessory extends ISYAccessory_1.ISYAccessory {
    identify(callback) {
        this.device.sendBeep(100).then(() => callback);
    }
}
exports.ISYDeviceAccessory = ISYDeviceAccessory;
