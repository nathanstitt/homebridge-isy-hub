"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isy_js_1 = require("isy-js");
const ISYDoorWindowSensorAccessory_1 = require("./ISYDoorWindowSensorAccessory");
const ISYElkAlarmPanelAccessory_1 = require("./ISYElkAlarmPanelAccessory");
const ISYFanAccessory_1 = require("./ISYFanAccessory");
const ISYGarageDoorAccessory_1 = require("./ISYGarageDoorAccessory");
const ISYLockAccessory_1 = require("./ISYLockAccessory");
const ISYMotionSensorAccessory_1 = require("./ISYMotionSensorAccessory");
const ISYOutletAccessory_1 = require("./ISYOutletAccessory");
const ISYRelayAccessory_1 = require("./ISYRelayAccessory");
const ISYSceneAccessory_1 = require("./ISYSceneAccessory");
const ISYThermostatAccessory_1 = require("./ISYThermostatAccessory");
class ISYPlatform {
    constructor(log, config, homebridge) {
        this.log = log;
        this.config = config;
        this.host = config.host;
        this.username = config.username;
        this.password = config.password;
        this.elkEnabled = config.elkEnabled;
        this.debugLoggingEnabled = config.debugLoggingEnabled === undefined ? false : config.debugLoggingEnabled;
        this.includeAllScenes = config.includeAllScenes === undefined ? false : config.includeAllScenes;
        this.includedScenes = config.includedScenes === undefined ? [] : config.includedScenes;
        this.isy = new isy_js_1.ISY(this.host, this.username, this.password, config.elkEnabled, null, config.useHttps, true, this.debugLoggingEnabled, null, log);
    }
    logger(msg) {
        if (this.debugLoggingEnabled || (process.env.ISYJSDEBUG !== undefined && process.env.IYJSDEBUG !== null)) {
            // var timeStamp = new Date();
            this.log(`Platform: ${msg}`);
        }
    }
    // Checks the device against the configuration to see if it should be ignored.
    shouldIgnore(device) {
        const deviceAddress = device.address;
        if (device.nodeType === isy_js_1.NodeTypes.Scene && this.includeAllScenes === false) {
            for (const sceneAddress of this.includedScenes) {
                if (sceneAddress === deviceAddress) {
                    return false;
                }
            }
            return true;
        }
        else {
            if (this.config.ignoreDevices === undefined) {
                return false;
            }
            const deviceName = device.name;
            for (const rule of this.config.ignoreDevices) {
                if (rule.nameContains !== undefined && rule.nameContains !== '') {
                    if (deviceName.indexOf(rule.nameContains) === -1) {
                        continue;
                    }
                }
                if (rule.lastAddressDigit !== undefined && rule.lastAddressDigit !== '') {
                    if (deviceAddress.indexOf(rule.lastAddressDigit, deviceAddress.length - 2) === -1) {
                        continue;
                    }
                }
                if (rule.address !== undefined && rule.address !== '') {
                    if (deviceAddress !== rule.address) {
                        continue;
                    }
                }
                this.logger('Ignoring device: ' + deviceName + ' [' + deviceAddress + '] because of rule [' + rule.nameContains + '] [' + rule.lastAddressDigit + '] [' + rule.address + ']');
                return true;
            }
        }
        return false;
    }
    getGarageEntry(address) {
        const garageDoorList = this.config.garageDoors;
        if (garageDoorList !== undefined) {
            for (let index = 0; index < garageDoorList.length; index++) {
                const garageEntry = garageDoorList[index];
                if (garageEntry.address === address) {
                    return garageEntry;
                }
            }
        }
        return null;
    }
    renameDeviceIfNeeded(device) {
        const deviceAddress = device.address;
        const deviceName = device.name;
        if (this.config.renameDevices === undefined) {
            return deviceName;
        }
        for (const rule of this.config.renameDevices) {
            if (rule.nameContains !== undefined && rule.nameContains !== '') {
                if (deviceName.indexOf(rule.nameContains) === -1) {
                    continue;
                }
            }
            if (rule.lastAddressDigit !== undefined && rule.lastAddressDigit !== '') {
                if (deviceAddress.indexOf(rule.lastAddressDigit, deviceAddress.length - 2) === -1) {
                    continue;
                }
            }
            if (rule.address !== undefined && rule.address !== '') {
                if (deviceAddress !== rule.address) {
                    continue;
                }
            }
            if (rule.newName === undefined) {
                this.logger(`Rule to rename device is present but no new name specified. Impacting device: ${deviceName}`);
                return deviceName;
            }
            else {
                this.logger(`Renaming device: ${deviceName}[${deviceAddress}] to [${rule.newName}] because of rule [${rule.nameContains}] [${rule.lastAddressDigit}] [${rule.address}]`);
                return rule.newName;
            }
        }
        return deviceName;
    }
    // Calls the isy-js library, retrieves the list of devices, and maps them to appropriate ISYXXXXAccessory devices.
    accessories(callback) {
        const that = this;
        this.isy.initialize(() => {
            const results = [];
            const deviceList = this.isy.deviceList;
            for (const device of deviceList.values()) {
                let homeKitDevice = null;
                const garageInfo = that.getGarageEntry(device.address);
                if (!that.shouldIgnore(device)) {
                    if (results.length >= 100) {
                        that.logger('Skipping any further devices as 100 limit has been reached');
                        break;
                    }
                    device.name = that.renameDeviceIfNeeded(device);
                    if (garageInfo !== null) {
                        let relayAddress = device.address.substr(0, device.address.length - 1);
                        relayAddress += `2`;
                        const relayDevice = that.isy.getDevice(relayAddress);
                        homeKitDevice = new ISYGarageDoorAccessory_1.ISYGarageDoorAccessory(that.logger.bind(that), device, relayDevice, garageInfo.name, garageInfo.timeToOpen, garageInfo.alternate);
                    }
                    else {
                        homeKitDevice = this.createAccessory(device);
                    }
                    if (homeKitDevice !== null) {
                        // Make sure the device is address to the global map
                        // deviceMap[device.address] = homeKitDevice;
                        results.push(homeKitDevice);
                    }
                }
            }
            for (const scene of this.isy.sceneList.values()) {
                if (!this.shouldIgnore(scene)) {
                    results.push(new ISYSceneAccessory_1.ISYSceneAccessory(this.logger.bind(this), scene));
                }
            }
            if (that.isy.elkEnabled) {
                if (results.length >= 100) {
                    that.logger('Skipping adding Elk Alarm panel as device count already at maximum');
                }
                else {
                    const panelDevice = that.isy.getElkAlarmPanel();
                    panelDevice.name = that.renameDeviceIfNeeded(panelDevice);
                    const panelDeviceHK = new ISYElkAlarmPanelAccessory_1.ISYElkAlarmPanelAccessory(that.log, panelDevice);
                    // deviceMap[panelDevice.address] = panelDeviceHK;
                    results.push(panelDeviceHK);
                }
            }
            that.logger(`Filtered device list has: ${results.length} devices`);
            callback(results);
        });
    }
    createAccessory(device) {
        if (device instanceof isy_js_1.InsteonRelayDevice) {
            return new ISYRelayAccessory_1.ISYRelayAccessory(this.logger.bind(this), device);
        }
        else if (device instanceof isy_js_1.InsteonLockDevice) {
            return new ISYLockAccessory_1.ISYLockAccessory(this.logger.bind(this), device);
        }
        else if (device instanceof isy_js_1.InsteonOutletDevice) {
            return new ISYOutletAccessory_1.ISYOutletAccessory(this.logger.bind(this), device);
        }
        else if (device instanceof isy_js_1.InsteonFanDevice) {
            return new ISYFanAccessory_1.ISYFanAccessory(this.logger.bind(this), device);
        }
        else if (device instanceof isy_js_1.InsteonDoorWindowSensorDevice) {
            return new ISYDoorWindowSensorAccessory_1.ISYDoorWindowSensorAccessory(this.logger.bind(this), device);
        }
        else if (device instanceof isy_js_1.ElkAlarmSensorDevice) {
            return new ISYElkAlarmPanelAccessory_1.ISYElkAlarmPanelAccessory(this.logger.bind(this), device);
        }
        else if (device instanceof isy_js_1.InsteonMotionSensorDevice) {
            return new ISYMotionSensorAccessory_1.ISYMotionSensorAccessory(this.logger.bind(this), device);
        }
        else if (device instanceof isy_js_1.InsteonThermostatDevice) {
            return new ISYThermostatAccessory_1.ISYThermostatAccessory(this.logger.bind(this), device);
        }
        return null;
    }
}
exports.ISYPlatform = ISYPlatform;
