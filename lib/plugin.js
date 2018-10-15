"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ISYPlatform_1 = require("./ISYPlatform");
let CProps;
let HapTypes;
Promise.prototype.handleWith = async function (callback) {
    console.log('handling');
    return this.then(() => {
        console.log('success');
        callback(false);
    }).catch((msg) => {
        console.log('error: ' + JSON.stringify(msg));
        callback(true);
    });
};
exports.default = (homebridge) => {
    // Service = homebridge.hap.Service;
    exports.Characteristic = homebridge.hap.Characteristic;
    exports.Service = homebridge.hap.Service;
    exports.UUIDGen = homebridge.hap.uuid;
    exports.Hap = homebridge.hap;
    exports.Service = exports.Hap.Service;
    const api = homebridge;
    api.registerPlatform(`homebridge-isy-js`, 'isy-js', ISYPlatform_1.ISYPlatform);
};
