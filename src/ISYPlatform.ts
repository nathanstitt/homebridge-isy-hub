import { IgnoreDeviceRule } from 'config';
import { API } from 'homebridge';
import {
    InsteonDoorWindowSensorDevice, InsteonFanDevice, InsteonLockDevice,
    InsteonMotionSensorDevice, InsteonOutletDevice, InsteonRelayDevice, InsteonThermostatDevice,
    InsteonDimmableDevice, ISY, ISYNode, NodeTypes,
} from './hub';
import { ISYDimmableAccessory } from './ISYDimmerAccessory';
import { ISYDoorWindowSensorAccessory } from './ISYDoorWindowSensorAccessory';
import { ISYFanAccessory } from './ISYFanAccessory';
import { ISYGarageDoorAccessory } from './ISYGarageDoorAccessory';
import { ISYLockAccessory } from './ISYLockAccessory';
import { ISYMotionSensorAccessory } from './ISYMotionSensorAccessory';
import { ISYOutletAccessory } from './ISYOutletAccessory';
import { ISYRelayAccessory } from './ISYRelayAccessory';
import { ISYSceneAccessory } from './ISYSceneAccessory';
import { ISYThermostatAccessory } from './ISYThermostatAccessory';
export class ISYPlatform {
    public log: any;
    public config: any;
    public host: string;
    public username: string;
    public password: string;
    public debugLoggingEnabled: boolean;
    public includeAllScenes: boolean;
    public includedScenes: [];
    public ignoreRules: IgnoreDeviceRule[];
    public isy: ISY;
    constructor(log, config, homebridge: API) {
        this.log = log;
        this.config = config;
        this.host = config.host;
        this.username = config.username;
        this.password = config.password;
        this.debugLoggingEnabled = config.debugLoggingEnabled === undefined ? false : config.debugLoggingEnabled;
        this.includeAllScenes = config.includeAllScenes === undefined ? false : config.includeAllScenes;
        this.includedScenes = config.includedScenes === undefined ? [] : config.includedScenes;
        this.ignoreRules = config.ignoreDevices;
        this.isy = new ISY(this.host, this.username, this.password, null, config.useHttps, true, this.debugLoggingEnabled, null, log);
    }
    public logger(msg: string) {
        if (this.debugLoggingEnabled || (process.env.ISYJSDEBUG !== undefined && process.env.IYJSDEBUG !== null)) {
            // var timeStamp = new Date();
            this.log(`Platform: ${msg}`);
        }
    }
    // Checks the device against the configuration to see if it should be ignored.
    public shouldIgnore(device: ISYNode) {
        const deviceAddress = device.address;
        if (device.nodeType === NodeTypes.Scene && this.includeAllScenes === false) {
            for (const sceneAddress of this.includedScenes) {
                if (sceneAddress === deviceAddress) {
                    return false;
                }
            }
            return true;
        } else {
            if (this.config.ignoreDevices === undefined) {
                return false;
            }
            const deviceName = device.name;
            for (const rule of this.ignoreRules) {
                if (rule.nameContains !== undefined && rule.nameContains !== '') {
                    if (deviceName.indexOf(rule.nameContains) === -1) {
                        continue;
                    }
                }
                if (rule.lastAddressDigit !== undefined && rule.lastAddressDigit !== null) {
                    if (deviceAddress.indexOf(String(rule.lastAddressDigit), deviceAddress.length - 2) === -1) {
                        continue;
                    }
                }
                if (rule.address !== undefined && rule.address !== '') {
                    if (deviceAddress !== rule.address) {
                        continue;
                    }
                }
                if (rule.nodeDef !== undefined) {
                    if (device.nodeDefId !== rule.nodeDef) {
                        continue;
                    }
                }
                this.logger('Ignoring device: ' + deviceName + ' (' + deviceAddress + ') because of rule: ' + JSON.stringify(rule));
                return true;
            }
        }
        return false;
    }
    public getGarageEntry(address) {
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
    public renameDeviceIfNeeded(device: ISYNode) {
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
            } else {
                this.logger(`Renaming device: ${deviceName}[${deviceAddress}] to [${rule.newName}] because of rule [${rule.nameContains}] [${rule.lastAddressDigit}] [${rule.address}]`);
                return rule.newName;
            }
        }
        return deviceName;
    }
    // Calls the isy-hub library, retrieves the list of devices, and maps them to appropriate ISYXXXXAccessory devices.
    public accessories(callback) {
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
                        homeKitDevice = new ISYGarageDoorAccessory(that.logger.bind(that), device, relayDevice, garageInfo.name, garageInfo.timeToOpen, garageInfo.alternate);
                    } else {
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
                    results.push(new ISYSceneAccessory(this.logger.bind(this), scene));
                }
            }

            that.logger(`Filtered device list has: ${results.length} devices`);
            callback(results);
        });
    }
    public createAccessory(device) {
        if (device instanceof InsteonDimmableDevice) {
            return new ISYDimmableAccessory(this.logger.bind(this), device);
        } else if (device instanceof InsteonRelayDevice) {
            return new ISYRelayAccessory(this.logger.bind(this), device);
        } else if (device instanceof InsteonLockDevice) {
            return new ISYLockAccessory(this.logger.bind(this), device);
        } else if (device instanceof InsteonOutletDevice) {
            return new ISYOutletAccessory(this.logger.bind(this), device);
        } else if (device instanceof InsteonFanDevice) {
            return new ISYFanAccessory(this.logger.bind(this), device);
        } else if (device instanceof InsteonDoorWindowSensorDevice) {
            return new ISYDoorWindowSensorAccessory(this.logger.bind(this), device);
        } else if (device instanceof InsteonMotionSensorDevice) {
            return new ISYMotionSensorAccessory(this.logger.bind(this), device);
        } else if (device instanceof InsteonThermostatDevice) {
            return new ISYThermostatAccessory(this.logger.bind(this), device);
        }
        return null;
    }
}
