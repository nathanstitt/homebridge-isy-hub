/*
 ISY-JS
 
 See README.md for details.
*/

var  Service,Characteristic, types;

import { ISY } from "isy-js";

import {
	//Characteristic,
  //Service,
  //Service,
	Accessory
} from "hap-nodejs";
import * as HAP from "hap-nodejs";
import { hapLegacyTypes } from "homebridge";
import { ISYBaseDevice, ISYDoorWindowDevice, ISYFanDevice, ISYLightDevice, ISYLockDevice, ISYMotionSensorDevice, ISYOutletDevice, ISYThermostatDevice } from "isy-js/isydevice";

import { ISYScene } from "isy-js/isyscene";

// Global device map. Needed to map incoming notifications to the corresponding HomeKit device for update.
var deviceMap = {};

// This function responds to changes in devices from the isy-js library. Uses the global device map to update
// the state.
// TODO: Move this to a member function of the ISYPlatform object so we don't need a global map.
function ISYChangeHandler(isy, device) {
	var deviceToUpdate = deviceMap[device.address];
	if (deviceToUpdate != null) {
		deviceToUpdate.handleExternalChange();
	}
}

module.exports = homebridge => {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	types = homebridge.hapLegacyTypes;
  
	homebridge.registerPlatform("homebridge-isy-js", "isy-js", ISYPlatform);
};

class ISYPlatform {
	constructor(log, config) {
		this.log = log;
		this.config = config;
		this.host = config.host;
		this.username = config.username;
		this.password = config.password;
		this.elkEnabled = config.elkEnabled;
		this.debugLoggingEnabled = config.debugLoggingEnabled == undefined ? false : config.debugLoggingEnabled;
		this.includeAllScenes = config.includeAllScenes == undefined ? false : config.includeAllScenes;
		this.includedScenes = config.includedScenes == undefined ? [] : config.includedScenes;
		this.isy = new ISY(this.host, this.username, this.password, config.elkEnabled, ISYChangeHandler, config.useHttps, true, this.debugLoggingEnabled);
	}

	logger(msg) {
		if (this.debugLoggingEnabled || (process.env.ISYJSDEBUG != undefined && process.env.IYJSDEBUG != null)) {
			var timeStamp = new Date();
			this.log(`${timeStamp.getYear()}-${timeStamp.getMonth()}-${timeStamp.getDay()}#${timeStamp.getHours()}:${timeStamp.getMinutes()}:${timeStamp.getSeconds()}- ${msg}`);
		}
	}
	// Checks the device against the configuration to see if it should be ignored.
	shouldIgnore(device) {
		var deviceAddress = device.address;
		if (device.deviceType == this.isy.DEVICE_TYPE_SCENE && this.includeAllScenes == false) {
			for (var sceneAddress of this.includedScenes) {
				if (sceneAddress == deviceAddress) {
					return false;
				}
			}
			return true;
		} else {
			if (this.config.ignoreDevices == undefined) {
				return false;
			}
			var deviceName = device.name;
			for (var rule of this.config.ignoreDevices) {
				if (rule.nameContains != undefined && rule.nameContains != "") {
					if (deviceName.indexOf(rule.nameContains) == -1) {
						continue;
					}
				}
				if (rule.lastAddressDigit != undefined && rule.lastAddressDigit != "") {
					if (deviceAddress.indexOf(rule.lastAddressDigit, deviceAddress.length - 2) == -1) {
						continue;
					}
				}
				if (rule.address != undefined && rule.address != "") {
					if (deviceAddress != rule.address) {
						continue;
					}
				}
				this.logger(`ISYPLATFORM: Ignoring device: ${deviceName} [${deviceAddress}] because of rule [${rule.nameContains}] [${rule.lastAddressDigit}] [${rule.address}]`);
				return true;
			}
		}
		return false;
	}
	getGarageEntry(address) {
		var garageDoorList = this.config.garageDoors;
		if (garageDoorList != undefined) {
			for (var index = 0; index < garageDoorList.length; index++) {
				var garageEntry = garageDoorList[index];
				if (garageEntry.address == address) {
					return garageEntry;
				}
			}
		}
		return null;
	}
	renameDeviceIfNeeded(device) {
		var deviceAddress = device.address;
		var deviceName = device.name;
		if (this.config.renameDevices == undefined) {
			return deviceName;
		}
		for (var rule of this.config.renameDevices) {
			if (rule.nameContains != undefined && rule.nameContains != "") {
				if (deviceName.indexOf(rule.nameContains) == -1) {
					continue;
				}
			}
			if (rule.lastAddressDigit != undefined && rule.lastAddressDigit != "") {
				if (deviceAddress.indexOf(rule.lastAddressDigit, deviceAddress.length - 2) == -1) {
					continue;
				}
			}
			if (rule.address != undefined && rule.address != "") {
				if (deviceAddress != rule.address) {
					continue;
				}
			}
			if (rule.newName == undefined) {
				this.logger(`ISYPLATFORM: Rule to rename device is present but no new name specified. Impacting device: ${deviceName}`);
				return deviceName;
			} else {
				this.logger(`ISYPLATFORM: Renaming device: ${deviceName}[${deviceAddress}] to [${rule.newName}] because of rule [${rule.nameContains}] [${rule.lastAddressDigit}] [${rule.address}]`);
				return rule.newName;
			}
		}
		return deviceName;
	}
	// Calls the isy-js library, retrieves the list of devices, and maps them to appropriate ISYXXXXAccessory devices.
	accessories(callback) {
		var that = this;
		this.isy.initialize(() => {
			var results = [];
			var deviceList = that.isy.getDeviceList();
			for (var device of deviceList) {
				var homeKitDevice = null;
				var garageInfo = that.getGarageEntry(device.address);
				if (!that.shouldIgnore(device)) {
					if (results.length >= 100) {
						that.logger("ISYPLATFORM: Skipping any further devices as 100 limit has been reached");
						break;
					}
					device.name = that.renameDeviceIfNeeded(device);
					if (garageInfo != null) {
						let relayAddress = device.address.substr(0, device.address.length - 1);
						relayAddress += "2";
						var relayDevice = that.isy.getDevice(relayAddress);
						homeKitDevice = new ISYGarageDoorAccessory(that.logger.bind(that), device, relayDevice, garageInfo.name, garageInfo.timeToOpen, garageInfo.alternate);
					}
					homeKitDevice = this.createAccessory(device);
					if (homeKitDevice != null) {
						// Make sure the device is address to the global map
						deviceMap[device.address] = homeKitDevice;
						results.push(homeKitDevice);
					}
				}
			}
			if (that.isy.elkEnabled) {
				if (results.length >= 100) {
					that.logger("ISYPLATFORM: Skipping adding Elk Alarm panel as device count already at maximum");
				} else {
					var panelDevice = that.isy.getElkAlarmPanel();
					panelDevice.name = that.renameDeviceIfNeeded(panelDevice);
					var panelDeviceHK = new ISYElkAlarmPanelAccessory(that.log, panelDevice);
					deviceMap[panelDevice.address] = panelDeviceHK;
					results.push(panelDeviceHK);
				}
			}
			that.logger(`ISYPLATFORM: Filtered device has: ${results.length} devices`);
			callback(results);
		});
	}

	createAccessory(device) {
		var that = this;
		if (device instanceof ISYLightDevice) {
			return new ISYLightAccessory(this.logger.bind(this), device);
		} else if (device instanceof ISYLockDevice) {
			return new ISYLockAccessory(this.logger.bind(that), device);
		} else if (device instanceof ISYOutletDevice) {
			return new ISYOutletAccessory(this.logger.bind(this), device);
		} else if (device instanceof ISYFanDevice) {
			return new ISYFanAccessory(that.logger.bind(that), device);
		} else if (device instanceof ISYDoorWindowDevice) {
			return new ISYDoorWindowSensorAccessory(that.logger.bind(that), device);
		} else if (device.deviceType == that.isy.DEVICE_TYPE_ALARM_DOOR_WINDOW_SENSOR) {
			return new ISYDoorWindowSensorAccessory(that.logger.bind(that), device);
		} else if (device.deviceType == that.isy.DEVICE_TYPE_ALARM_PANEL) {
			return new ISYElkAlarmPanelAccessory(that.logger.bind(that), device);
		} else if (device instanceof ISYMotionSensorDevice) {
			return new ISYMotionSensorAccessory(that.logger.bind(that), device);
		} else if (device instanceof ISYScene) {
			return new ISYSceneAccessory(that.logger.bind(that), device);
		} else if (device instanceof ISYThermostatDevice) {
			return new ISYThermostatAccessory(that.logger.bind(that), device);
		}
		return null;
	}
}

/////////////////////////////////////////////////////////////////////////////////////////////////
// BASE FOR ALL DEVICES

// Provides common constructor tasks
function ISYAccessoryBaseSetup(accessory, log, device) {
	accessory.log = msg => log(typeof accessory + ": " + msg);
	accessory.device = device;
	accessory.address = device.address;
	accessory.name = device.name;

	accessory.uuid_base = device.isy.address + ":" + device.address;
}

class ISYBaseAccessory /*extends Accessory*/ {
	constructor(log, device) {
		ISYAccessoryBaseSetup(this, log, device);

		//super(this.name,homebridge.hap.generateUUID(this.uuid_base));
	}
	getServices() {
		var informationService = new Service.AccessoryInformation();
		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Insteon")
			.setCharacteristic(Characteristic.Model, this.device.productName == null ? this.device.deviceFriendlyName : this.device.productName)
			.setCharacteristic(Characteristic.SerialNumber, this.device.address);
		this.informationService = informationService;
	}
}

class ISYThermostatAccessory extends ISYBaseAccessory {
	constructor(log, device) {
		super(log, device);
	}
	identify(callback) {
		// Do the identify action
		callback();
	}
	// Translates the Thermostat speed as an isy-js string into the corresponding homekit constant level.
	// Homekit doesn't have steps for the Thermostat speed and needs to have a value from 0 to 100. We
	// split the range into 4 steps and map them to the 4 isy-js levels.
	toCelsius(temp) {
		return (temp - 32.0) * 5.0 / 9.0;
	}
	// Translates the fan level from homebridge into the isy-js level. Maps from the 0-100
	// to the four isy-js fan speed levels.
	toFahrenheit(temp) {
		return Math.round(temp * 9.0 / 5.0 + 32.0);
	}
	// Returns the current state of the fan from the isy-js level to the 0-100 level of HK.
	getCurrentTemperature(callback) {
		this.log(
			`THERM: ${this.device.name} Getting Current Temperature - Device says: ${this.device.getCurrentTemperatureState()} translation says: ${this.toCelsius(this.device.getCurrentTemperatureState())}`
		);
		callback(null, this.toCelsius(this.device.getCurrentTemperatureState()));
  }
  
  calcTargetTemperature()
  {
    let heatSetPoint = this.device.getHeatSetPoint();
    let coolSetPoint = this.device.getCoolSetPoint();
    let currentTemperature = this.device.getCurrentTemperature();
    if(currentTemperature > heatSetPoint)
      if(currentTemperature <= coolSetPoint)
        return currentTemperature;
      else
        return coolSetPoint;
    else (currentTemperature <= heatSetPoint)
      return heatSetPoint;
  }

  

  getTargetTemperature(callback) {
		this.log(
			`THERM: ${this.device.name} Getting Current Temperature - Device says: ${this.device.getCurrentTemperatureState()} translation says: ${this.toCelsius(this.device.getCurrentTemperatureState())}`
    );
		callback(null, this.toCelsius(this.calcTargetTemperature()));
	}

	getCoolSetPoint(callback) {
		this.log(`THERM: ${this.device.name} Getting Cooling Set Point - Device says: ${this.device.getCoolSetPoint()} translation says: ${this.toCelsius(this.device.getCoolSetPoint())}`);
		callback(null, this.toCelsius(this.device.getCoolSetPoint()));
	}
	getHeatSetPoint(callback) {
		this.log(`THERM: ${this.device.name} Getting Heating Set Point - Device says: ${this.device.getHeatSetPoint()} translation says: ${this.toCelsius(this.device.getHeatSetPoint())}`);
		callback(null, this.toCelsius(this.device.getHeatSetPoint()));
  }
  
  

	getHeatingCoolingMode(callback) {
		this.log(`THERM: ${this.device.name} Getting Heating Cooling Mode - Device says: ${this.device.getHeatingCoolingMode()}`);
		callback(null, this.device.getHeatingCoolingMode());
	}
	getHeatingCoolingState(callback) {
		this.log(`THERM: ${this.device.name} Getting Heating Cooling State - Device says: ${this.device.getHeatingCoolingState()}`);
		callback(null, this.device.getHeatingCoolingState());
	}
	getFanState(callback) {
		this.log(`THERM: ${this.device.name} Getting Fan State - Device says: ${this.device.getFanState()}`);
		callback(null, this.device.getFanState());
	}
	getHumidity(callback) {
		this.log(`THERM: ${this.device.name} Getting Current Rel. Humidity - Device says: ${this.device.getHumidity()}`);
		callback(null, this.device.getHumidity());
	}

	// Mirrors change in the state of the underlying isj-js device object.
	handleExternalChange() {
		this.log(`THERM: ${this.device.name} Incoming external change. Device says: ${this.device.getCurrentTemperatureState()}`);
		this.thermostatService.updateCharacteristic(Characteristic.CurrentTemperature, this.toCelsius(this.device.getCurrentTemperatureState()));
		this.thermostatService.updateCharacteristic(Characteristic.CoolingThresholdTemperature, this.toCelsius(this.device.getCoolSetPoint()));
		this.thermostatService.updateCharacteristic(Characteristic.HeatingThresholdTemperature, this.toCelsius(this.device.getHeatSetPoint()));
		this.thermostatService.updateCharacteristic(Characteristic.TargetHeatingCoolingState, this.device.getHeatingCoolingMode());
		this.thermostatService.updateCharacteristic(Characteristic.CurrentHeatingCoolingState, this.device.getHeatingCoolingState());
		this.thermostatService.updateCharacteristic(Characteristic.CurrentFanState, this.device.getFanState());
		this.thermostatService.updateCharacteristic(Characteristic.CurrentRelativeHumidity, this.device.getHumidity());
	}
	// Returns the services supported by the fan device.
	getServices() {
		super.getServices();
    var thermostatService = new Service.Thermostat();
    thermostatService.getCharacteristic(Characteristic.TargetTemperature).on("get",this.get)
		thermostatService.setCharacteristic(Characteristic.TemperatureDisplayUnits, 1);
		thermostatService.addCharacteristic(Characteristic.CurrentFanState);
		thermostatService.getCharacteristic(Characteristic.CurrentFanState).on("get", this.getFanState.bind(this));
		thermostatService.getCharacteristic(Characteristic.CurrentTemperature).on("get", this.getCurrentTemperature.bind(this));
		thermostatService.getCharacteristic(Characteristic.CoolingThresholdTemperature).on("get", this.getCoolSetPoint.bind(this));
		thermostatService.getCharacteristic(Characteristic.CoolingThresholdTemperature).on("set", this.setCoolSetPoint.bind(this));
		thermostatService.getCharacteristic(Characteristic.HeatingThresholdTemperature).on("get", this.getHeatSetPoint.bind(this));
		thermostatService.getCharacteristic(Characteristic.HeatingThresholdTemperature).on("set", this.setHeatSetPoint.bind(this));
		thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).on("get", this.getHeatingCoolingState.bind(this));
		thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState).on("get", this.getHeatingCoolingMode.bind(this));
		thermostatService.getCharacteristic(Characteristic.CurrentRelativeHumidity).on("get", this.getHumidity.bind(this));

		this.thermostatService = thermostatService;

		// ThermostatService
		//   .getCharacteristic(Characteristic.RotationSpeed)
		//   .on('set', this.setThermostatRotationSpeed.bind(this));
		return [this.informationService, thermostatService];
	}

	setCoolSetPoint(temp, callback) {
		this.log(`THERM: ${this.device.name} Sending command to set cool set point (pre-translate) to: ${temp}`);
		var newSetPoint = this.toFahrenheit(temp);
		this.log(`THERM: ${this.device.name} Sending command to set cool set point to: ${newSetPoint}`);
		if (Math.abs(newSetPoint - this.device.getCoolSetPoint()) >= 1) {
			this.device.sendUpdateCoolSetPointCommand(newSetPoint, result => {
				callback();
			});
		} else {
			this.log(`THERM: ${this.device.name} command does not change actual set point`);
			callback();
		}
  }
  
  setTargetTemperature(temp, callback) {
    let targTemp = this.toFahrenheit(temp);
    if(targTemp != this.calcTargetTemperature())
    {
        if(targTemp < this.device.getCoolSetPoint() - 1)
        { 
          this.device.sendUpdateCoolSetPointCommand(targTemp, result => {
            callback();
          });
        }
        else if (targTemp > this.device.getHeatSetPoint() + 1)
        {
          this.device.sendUpdateHeatSetPointCommand(targTemp, result => {
            callback();
          });
        }
    }
		this.log(`THERM: ${this.device.name} Sending command to setta (pre-translate) to: ${temp}`);
		var newSetPoint = this.toFahrenheit(temp);
		this.log(`THERM: ${this.device.name} Sending command to set cool set point to: ${newSetPoint}`);
		if (Math.abs(newSetPoint - this.device.getCoolSetPoint()) >= 1) {
			this.device.sendUpdateCoolSetPointCommand(newSetPoint, result => {
				callback();
			});
		} else {
			this.log(`THERM: ${this.device.name} command does not change actual set point`);
			callback();
		}
	}

	setHeatSetPoint(temp, callback) {
		this.log(`THERM: ${this.device.name} Sending command to set heat set point (pre-translate) to: ${temp}`);
		var newSetPoint = this.toFahrenheit(temp);
		this.log(`THERM: ${this.device.name} Sending command to set heat set point to: ${newSetPoint}`);
		if (Math.abs(newSetPoint - this.device.getHeatSetPoint()) >= 1) {
			this.device.sendUpdateHeatSetPointCommand(newSetPoint, result => {
				callback();
			});
		} else {
			this.log(`THERM: ${this.device.name} command does not change actual set point`);
			callback();
		}
	}

	setHeatingCoolingMode(mode, callback) {
		this.log(`THERM: ${this.device.name} Sending command to set heating/cooling mode (pre-translate) to: ${mode}`);

		//this.log("THERM: " + this.device.name + " Sending command to set cool set point to: " + newSetPoint);
		if (mode != this.device.getHeatingCoolingMode()) {
			this.device.sendUpdateHeatingCoolingModeCommand(mode, result => {
				callback();
			});
		} else {
			this.log(`THERM: ${this.device.name} command does not change actual set point`);
			callback();
		}
	}
}

class ISYFanAccessory extends ISYBaseAccessory {
	constructor(log, device) {
		super(log, device);
	}
	identify(callback) {
		// Do the identify action
		callback();
	}
	// Translates the fan speed as an isy-js string into the corresponding homekit constant level.
	// Homekit doesn't have steps for the fan speed and needs to have a value from 0 to 100. We
	// split the range into 4 steps and map them to the 4 isy-js levels.
	translateFanSpeedToHK(fanSpeed) {
		switch (fanSpeed) {
			case this.device.FAN_OFF:
				return 0;
			case this.device.FAN_LEVEL_LOW:
				return 32;
			case this.device.FAN_LEVEL_MEDIUM:
				return 75;
			case this.device.FAN_LEVEL_HIGH:
				return 100;
			default:
				this.log(`FAN: ${this.device.name} !!!! ERROR: Unknown fan speed: ${fanSpeed}`);
				return 0;
		}
	}
	// Translates the fan level from homebridge into the isy-js level. Maps from the 0-100
	// to the four isy-js fan speed levels.
	translateHKToFanSpeed(fanStateHK) {
		if (fanStateHK == 0) {
			return this.device.FAN_OFF;
		} else if (fanStateHK > 0 && fanStateHK <= 32) {
			return this.device.FAN_LEVEL_LOW;
		} else if (fanStateHK >= 33 && fanStateHK <= 75) {
			return this.device.FAN_LEVEL_MEDIUM;
		} else if (fanStateHK > 75) {
			return this.device.FAN_LEVEL_HIGH;
		} else {
			this.log(`FAN: ${this.device.name} ERROR: Unknown fan state!`);
			return this.device.FAN_OFF;
		}
	}
	// Returns the current state of the fan from the isy-js level to the 0-100 level of HK.
	getFanRotationSpeed(callback) {
		this.log(`FAN: ${this.device.name} Getting fan rotation speed. Device says: ${this.device.getCurrentFanState()} translation says: ${this.translateFanSpeedToHK(this.device.getCurrentFanState())}`);
		callback(null, this.translateFanSpeedToHK(this.device.getCurrentFanState()));
	}
	// Sets the current state of the fan from the 0-100 level of HK to the isy-js level.
	setFanRotationSpeed(fanStateHK, callback) {
		this.log(`FAN: ${this.device.name} Sending command to set fan state (pre-translate) to: ${fanStateHK}`);
		var newFanState = this.translateHKToFanSpeed(fanStateHK);
		this.log(`FAN: ${this.device.name} Sending command to set fan state to: ${newFanState}`);
		if (newFanState != this.device.getCurrentFanState()) {
			this.device.sendFanCommand(newFanState, function(result) {
				callback();
			});
		} else {
			this.log(`FAN: ${this.device.name} Fan command does not change actual speed`);
			callback();
		}
	}

	getLightOnState() {}

	// Returns true if the fan is on
	getIsFanOn() {
		this.log(`FAN: ${this.device.name} Getting fan is on. Device says: ${this.device.getCurrentFanState()} Code says: ${this.device.getCurrentFanState() != "Off"}`);
		return this.device.getCurrentFanState() != "Off";
	}
	// Returns the state of the fan to the homebridge system for the On characteristic
	getFanOnState(callback) {
		callback(null, this.getIsFanOn());
	}
	// Sets the fan state based on the value of the On characteristic. Default to Medium for on.
	setFanOnState(onState, callback) {
		this.log(`FAN: ${this.device.name} Setting fan on state to: ${onState} Device says: ${this.device.getCurrentFanState()}`);
		if (onState != this.getIsFanOn()) {
			if (onState) {
				this.log(`FAN: ${this.device.name} Setting fan speed to medium`);
				this.setFanRotationSpeed(this.translateFanSpeedToHK(this.device.FAN_LEVEL_MEDIUM), callback);
			} else {
				this.log(`FAN: ${this.device.name} Setting fan speed to off`);
				this.setFanRotationSpeed(this.translateFanSpeedToHK(this.device.FAN_OFF), callback);
			}
		} else {
			this.log(`FAN: ${this.device.name} Fan command does not change actual state`);
			callback();
		}
	}

	setPowerState(powerOn, callback) {
		this.log(`LIGHT: ${this.device.name} Setting powerstate to ${powerOn}`);
		if (powerOn != this.device.getCurrentLightState()) {
			this.log(`LIGHT: ${this.device.name} Changing powerstate to ${powerOn}`);
			this.device.sendLightCommand(powerOn, function(result) {
				callback();
			});
		} else {
			this.log(`LIGHT: ${this.device.name} Ignoring redundant setPowerState`);
			callback();
		}
	}

	// Handles request to get the current on state
	getPowerState(callback) {
		callback(null, this.device.getCurrentLightState());
	}
	// Handles request to set the brightness level of dimmable lights. Ignore redundant commands.
	setBrightness(level, callback) {
		this.log(`LIGHT: ${this.device.name} Setting brightness to ${level}`);
		if (level != this.device.getCurrentLightDimState()) {
			if (level == 0) {
				this.log(`LIGHT: ${this.device.name} Brightness set to 0, sending off command`);
				this.device.sendLightCommand(false, function(result) {
					callback();
				});
			} else {
				this.log(`LIGHT: ${this.device.name} Changing Brightness to ${level}`);
				this.device.sendLightDimCommand(level, function(result) {
					callback();
				});
			}
		} else {
			this.log(`LIGHT: ${this.device.name} Ignoring redundant setBrightness`);
			callback();
		}
	}
	// Handles a request to get the current brightness level for dimmable lights.
	getBrightness(callback) {
		callback(null, this.device.getCurrentLightDimState());
	}

	// Mirrors change in the state of the underlying isj-js device object.
	handleExternalChange() {
		this.log(`FAN: ${this.device.name} Incoming external change. Device says: ${this.device.getCurrentFanState()}`);
		this.fanService.setCharacteristic(Characteristic.On, this.getIsFanOn());
		this.fanService.setCharacteristic(Characteristic.RotationSpeed, this.translateFanSpeedToHK(this.device.getCurrentFanState()));
		// this.log("LIGHT: " + this.device.name + " Handling external change for light");
		// this.lightService
		// 	.updateCharacteristic(Characteristic.On, this.device.getCurrentLightState());
		// if (this.dimmable) {
		// 	this.lightService
		// 		.updateCharacteristic(Characteristic.Brightness, this.device.getCurrentLightDimState());
		// }
	}
	// Returns the services supported by the fan device.
	getServices() {
		super.getServices();
		var fanService = new Service.Fan();
		var lightService = (this.fanService = fanService);
		this.lightService = lightService;
		fanService.getCharacteristic(Characteristic.On).on("set", this.setFanOnState.bind(this));
		fanService.getCharacteristic(Characteristic.On).on("get", this.getFanOnState.bind(this));
		fanService.addCharacteristic(Characteristic.RotationSpeed).on("get", this.getFanRotationSpeed.bind(this));
		fanService.getCharacteristic(Characteristic.RotationSpeed).on("set", this.setFanRotationSpeed.bind(this));

		return [this.informationService, fanService];
	}
}

class ISYOutletAccessory extends ISYBaseAccessory {
	constructor(log, device) {
		super(log, device);
	}
	// Handles the identify command
	identify(callback) {
		// Do the identify action
		callback();
	}
	// Handles a request to set the outlet state. Ignores redundant sets based on current states.
	setOutletState(outletState, callback) {
		this.log(`OUTLET: ${this.device.name} Sending command to set outlet state to: ${outletState}`);
		if (outletState != this.device.getCurrentOutletState()) {
			this.device.sendOutletCommand(outletState, function(result) {
				callback();
			});
		} else {
			callback();
		}
	}
	// Handles a request to get the current outlet state based on underlying isy-js device object.
	getOutletState(callback) {
		callback(null, this.device.getCurrentOutletState());
	}
	// Handles a request to get the current in use state of the outlet. We set this to true always as
	// there is no way to deterine this through the isy.
	getOutletInUseState(callback) {
		callback(null, true);
	}
	// Mirrors change in the state of the underlying isj-js device object.
	handleExternalChange() {
		this.outletService.updateCharacteristic(Characteristic.On, this.device.getCurrentOutletState());
	}
	// Returns the set of services supported by this object.
	getServices() {
		super.getServices();
		var outletService = new Service.Outlet();
		this.outletService = outletService;
		outletService.getCharacteristic(Characteristic.On).on("set", this.setOutletState.bind(this));
		outletService.getCharacteristic(Characteristic.On).on("get", this.getOutletState.bind(this));
		outletService.getCharacteristic(Characteristic.OutletInUse).on("get", this.getOutletInUseState.bind(this));
		return [this.informationService, outletService];
	}
}

class ISYLockAccessory extends ISYBaseAccessory {
	constructor(log, device) {
		super(log, device);
	}
	// Handles an identify request
	identify(callback) {
		callback();
	}
	// Handles a set to the target lock state. Will ignore redundant commands.
	setTargetLockState(lockState, callback) {
		this.log(this, `LOCK: ${this.device.name} Sending command to set lock state to: ${lockState}`);
		if (lockState != this.getDeviceCurrentStateAsHK()) {
			var targetLockValue = lockState == 0 ? false : true;
			this.device.sendLockCommand(targetLockValue, function(result) {
				callback();
			});
		} else {
			callback();
		}
	}
	// Translates underlying lock state into the corresponding homekit state
	getDeviceCurrentStateAsHK() {
		return this.device.getCurrentLockState() ? 1 : 0;
	}
	// Handles request to get the current lock state for homekit
	getLockCurrentState(callback) {
		callback(null, this.getDeviceCurrentStateAsHK());
	}
	// Handles request to get the target lock state for homekit
	getTargetLockState(callback) {
		this.getLockCurrentState(callback);
	}
	// Mirrors change in the state of the underlying isj-js device object.
	handleExternalChange() {
		this.lockService.updateCharacteristic(Characteristic.LockTargetState, this.getDeviceCurrentStateAsHK());
		this.lockService.updateCharacteristic(Characteristic.LockCurrentState, this.getDeviceCurrentStateAsHK());
	}
	// Returns the set of services supported by this object.
	getServices() {
		super.getServices();
		var lockMechanismService = new Service.LockMechanism();
		this.lockService = lockMechanismService;

		lockMechanismService.getCharacteristic(Characteristic.LockTargetState).on("set", this.setTargetLockState.bind(this));
		lockMechanismService.getCharacteristic(Characteristic.LockTargetState).on("get", this.getTargetLockState.bind(this));
		lockMechanismService.getCharacteristic(Characteristic.LockCurrentState).on("get", this.getLockCurrentState.bind(this));
		return [this.informationService, lockMechanismService];
	}
}

class ISYLightAccessory extends ISYBaseAccessory {
	constructor(log, device) {
		super(log, device);
		this.dimmable = this.device.deviceType == "DimmableLight";
	}
	// Handles the identify command
	identify(callback) {
		var that = this;
		this.device.sendLightCommand(true, function(result) {
			that.device.sendLightCommand(false, function(result) {
				callback();
			});
		});
	}
	// Handles request to set the current powerstate from homekit. Will ignore redundant commands.
	setPowerState(powerOn, callback) {
		this.log(`LIGHT: ${this.device.name} Setting powerstate to ${powerOn}`);
		if (powerOn != this.device.getCurrentLightState()) {
			this.log(`LIGHT: ${this.device.name} Changing powerstate to ${powerOn}`);
			this.device.sendLightCommand(powerOn, function(result) {
				callback();
			});
		} else {
			this.log(`LIGHT: ${this.device.name} Ignoring redundant setPowerState`);
			callback();
		}
	}
	// Mirrors change in the state of the underlying isj-js device object.
	handleExternalChange() {
		this.log(`LIGHT: ${this.device.name} Handling external change for light`);
		this.lightService.updateCharacteristic(Characteristic.On, this.device.getCurrentLightState());
		if (this.dimmable) {
			this.lightService.updateCharacteristic(Characteristic.Brightness, this.device.getCurrentLightDimState());
		}
	}
	// Handles request to get the current on state
	getPowerState(callback) {
		callback(null, this.device.getCurrentLightState());
	}
	// Handles request to set the brightness level of dimmable lights. Ignore redundant commands.
	setBrightness(level, callback) {
		this.log(`LIGHT: ${this.device.name} Setting brightness to ${level}`);
		if (level != this.device.getCurrentLightDimState()) {
			if (level == 0) {
				this.log(`LIGHT: ${this.device.name} Brightness set to 0, sending off command`);
				this.device.sendLightCommand(false, function(result) {
					callback();
				});
			} else {
				this.log(`LIGHT: ${this.device.name} Changing Brightness to ${level}`);
				this.device.sendLightDimCommand(level, function(result) {
					callback();
				});
			}
		} else {
			this.log(`LIGHT: ${this.device.name} Ignoring redundant setBrightness`);
			callback();
		}
	}
	// Handles a request to get the current brightness level for dimmable lights.
	getBrightness(callback) {
		callback(null, this.device.getCurrentLightDimState());
	}
	// Returns the set of services supported by this object.
	getServices() {
		super.getServices();
		var lightBulbService = new Service.Lightbulb();
		this.lightService = lightBulbService;
		lightBulbService.getCharacteristic(Characteristic.On).on("set", this.setPowerState.bind(this));
		lightBulbService.getCharacteristic(Characteristic.On).on("get", this.getPowerState.bind(this));
		if (this.dimmable) {
			lightBulbService.addCharacteristic(Characteristic.Brightness).on("get", this.getBrightness.bind(this));
			lightBulbService.getCharacteristic(Characteristic.Brightness).on("set", this.setBrightness.bind(this));
		}
		return [this.informationService, lightBulbService];
	}
}

class ISYSceneAccessory extends ISYBaseAccessory {
	constructor(log, device) {
		super(log, device);
	}
	// Handles the identify command
	identify(callback) {
		var that = this;
		this.device.sendLightCommand(true, function(result) {
			that.device.sendLightCommand(false, function(result) {
				callback();
			});
		});
	}
	// Handles request to set the current powerstate from homekit. Will ignore redundant commands.
	setPowerState(powerOn, callback) {
		this.log(`SCENE: ${this.device.name} Setting powerstate to ${powerOn}`);
		if (!this.device.getAreAllLightsInSpecifiedState(powerOn)) {
			this.log(`SCENE: ${this.device.name} Changing powerstate to ${powerOn}`);
			this.device.sendLightCommand(powerOn, function(result) {
				callback();
			});
		} else {
			this.log(`SCENE: ${this.device.name} Ignoring redundant setPowerState`);
			callback();
		}
	}
	// Mirrors change in the state of the underlying isj-js device object.
	handleExternalChange() {
		this.log(`SCENE: ${this.device.name} Handling external change for light`);
		if (this.device.getAreAllLightsInSpecifiedState(true) || this.device.getAreAllLightsInSpecifiedState(false)) {
			this.lightService.updateCharacteristic(Characteristic.On, this.device.getAreAllLightsInSpecifiedState(true));
		}
	}
	calculatePowerState() {
		return this.device.getAreAllLightsInSpecifiedState(true);
	}
	// Handles request to get the current on state
	getPowerState(callback) {
		callback(null, this.calculatePowerState());
	}
	// Returns the set of services supported by this object.
	getServices() {
		super.getServices();
		var lightBulbService = new Service.Lightbulb();

		this.lightService = lightBulbService;
		lightBulbService.getCharacteristic(Characteristic.On).on("set", this.setPowerState.bind(this));
		lightBulbService.getCharacteristic(Characteristic.On).on("get", this.getPowerState.bind(this));
		return [this.informationService, lightBulbService];
	}
}

class ISYDoorWindowSensorAccessory extends ISYBaseAccessory {
	constructor(log, device) {
		super(log, device);

		this.doorWindowState = false;
	}
	// Handles the identify command.
	identify(callback) {
		// Do the identify action
		callback();
	}
	// Translates the state of the underlying device object into the corresponding homekit compatible state
	translateCurrentDoorWindowState() {
		return this.device.getCurrentDoorWindowState() ? Characteristic.ContactSensorState.CONTACT_NOT_DETECTED : Characteristic.ContactSensorState.CONTACT_DETECTED;
	}
	// Handles the request to get he current door window state.
	getCurrentDoorWindowState(callback) {
		callback(null, this.translateCurrentDoorWindowState());
	}
	// Mirrors change in the state of the underlying isj-js device object.
	handleExternalChange() {
		this.sensorService.setCharacteristic(Characteristic.ContactSensorState, this.translateCurrentDoorWindowState());
	}
	// Returns the set of services supported by this object.
	getServices() {
		super.getServices();
		var sensorService = new Service.ContactSensor();
		this.sensorService = sensorService;
		sensorService.getCharacteristic(Characteristic.ContactSensorState).on("get", this.getCurrentDoorWindowState.bind(this));
		return [this.informationService, sensorService];
	}
}

class ISYMotionSensorAccessory extends ISYBaseAccessory {
	constructor(log, device) {
		super(log, device);
	}
	// Handles the identify command.
	identify(callback) {
		// Do the identify action
		callback();
	}
	// Handles the request to get he current motion sensor state.
	getCurrentMotionSensorState(callback) {
		callback(null, this.device.getCurrentMotionSensorState());
	}
	// Mirrors change in the state of the underlying isj-js device object.
	handleExternalChange() {
		this.sensorService.setCharacteristic(Characteristic.MotionDetected, this.device.getCurrentMotionSensorState());
	}
	// Returns the set of services supported by this object.
	getServices() {
		super.getServices();
		var sensorService = new Service.MotionSensor();
		this.sensorService = sensorService;

		sensorService.getCharacteristic(Characteristic.MotionDetected).on("get", this.getCurrentMotionSensorState.bind(this));
		return [this.informationService, sensorService];
	}
}

class ISYElkAlarmPanelAccessory extends ISYBaseAccessory {
	constructor(log, device) {
		super(log, device);
	}
	// Handles the identify command
	identify(callback) {
		callback();
	}
	// Handles the request to set the alarm target state
	setAlarmTargetState(targetStateHK, callback) {
		this.log("ALARMSYSTEM: " + this.device.name + "Sending command to set alarm panel state to: " + targetStateHK);
		var targetState = this.translateHKToAlarmTargetState(targetStateHK);
		this.log("ALARMSYSTEM: " + this.device.name + " Would send the target state of: " + targetState);
		if (this.device.getAlarmMode() != targetState) {
			this.device.sendSetAlarmModeCommand(targetState, function(result) {
				callback();
			});
		} else {
			this.log("ALARMSYSTEM: " + this.device.name + " Redundant command, already in that state.");
			callback();
		}
	}
	// Translates from the current state of the elk alarm system into a homekit compatible state. The elk panel has a lot more
	// possible states then can be directly represented by homekit so we map them. If the alarm is going off then it is tripped.
	// If it is arming or armed it is considered armed. Stay maps to the state state, away to the away state, night to the night
	// state.
	translateAlarmCurrentStateToHK() {
		var tripState = this.device.getAlarmTripState();
		var sourceAlarmState = this.device.getAlarmState();
		var sourceAlarmMode = this.device.getAlarmMode();
		if (tripState >= this.device.ALARM_TRIP_STATE_TRIPPED) {
			return Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
		} else if (
			sourceAlarmState == this.device.ALARM_STATE_NOT_READY_TO_ARM ||
			sourceAlarmState == this.device.ALARM_STATE_READY_TO_ARM ||
			sourceAlarmState == this.device.ALARM_STATE_READY_TO_ARM_VIOLATION
		) {
			return Characteristic.SecuritySystemCurrentState.DISARMED;
		} else {
			if (sourceAlarmMode == this.device.ALARM_MODE_STAY || sourceAlarmMode == this.device.ALARM_MODE_STAY_INSTANT) {
				return Characteristic.SecuritySystemCurrentState.STAY_ARM;
			} else if (sourceAlarmMode == this.device.ALARM_MODE_AWAY || sourceAlarmMode == this.device.ALARM_MODE_VACATION) {
				return Characteristic.SecuritySystemCurrentState.AWAY_ARM;
			} else if (sourceAlarmMode == this.device.ALARM_MODE_NIGHT || sourceAlarmMode == this.device.ALARM_MODE_NIGHT_INSTANT) {
				return Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
			} else {
				this.log("ALARMSYSTEM: " + this.device.name + " Setting to disarmed because sourceAlarmMode is " + sourceAlarmMode);
				return Characteristic.SecuritySystemCurrentState.DISARMED;
			}
		}
	}
	// Translates the current target state of hthe underlying alarm into the appropriate homekit value
	translateAlarmTargetStateToHK() {
		var sourceAlarmState = this.device.getAlarmMode();
		if (sourceAlarmState == this.device.ALARM_MODE_STAY || sourceAlarmState == this.device.ALARM_MODE_STAY_INSTANT) {
			return Characteristic.SecuritySystemTargetState.STAY_ARM;
		} else if (sourceAlarmState == this.device.ALARM_MODE_AWAY || sourceAlarmState == this.device.ALARM_MODE_VACATION) {
			return Characteristic.SecuritySystemTargetState.AWAY_ARM;
		} else if (sourceAlarmState == this.device.ALARM_MODE_NIGHT || sourceAlarmState == this.device.ALARM_MODE_NIGHT_INSTANT) {
			return Characteristic.SecuritySystemTargetState.NIGHT_ARM;
		} else {
			return Characteristic.SecuritySystemTargetState.DISARM;
		}
	}
	// Translates the homekit version of the alarm target state into the appropriate elk alarm panel state
	translateHKToAlarmTargetState(state) {
		if (state == Characteristic.SecuritySystemTargetState.STAY_ARM) {
			return this.device.ALARM_MODE_STAY;
		} else if (state == Characteristic.SecuritySystemTargetState.AWAY_ARM) {
			return this.device.ALARM_MODE_AWAY;
		} else if (state == Characteristic.SecuritySystemTargetState.NIGHT_ARM) {
			return this.device.ALARM_MODE_NIGHT;
		} else {
			return this.device.ALARM_MODE_DISARMED;
		}
	}
	// Handles request to get the target alarm state
	getAlarmTargetState(callback) {
		callback(null, this.translateAlarmTargetStateToHK());
	}
	// Handles request to get the current alarm state
	getAlarmCurrentState(callback) {
		callback(null, this.translateAlarmCurrentStateToHK());
	}
	// Mirrors change in the state of the underlying isj-js device object.
	handleExternalChange() {
		this.log("ALARMPANEL: " + this.device.name + " Source device. Currenty state locally -" + this.device.getAlarmStatusAsText());
		this.log(
			"ALARMPANEL: " +
				this.device.name +
				" Got alarm change notification. Setting HK target state to: " +
				this.translateAlarmTargetStateToHK() +
				" Setting HK Current state to: " +
				this.translateAlarmCurrentStateToHK()
		);
		this.alarmPanelService.setCharacteristic(Characteristic.SecuritySystemTargetState, this.translateAlarmTargetStateToHK());
		this.alarmPanelService.setCharacteristic(Characteristic.SecuritySystemCurrentState, this.translateAlarmCurrentStateToHK());
	}
	// Returns the set of services supported by this object.
	getServices() {
		super.getServices();
		var alarmPanelService = new Service.SecuritySystem();
		this.alarmPanelService = alarmPanelService;

		alarmPanelService.getCharacteristic(Characteristic.SecuritySystemTargetState).on("set", this.setAlarmTargetState.bind(this));
		alarmPanelService.getCharacteristic(Characteristic.SecuritySystemTargetState).on("get", this.getAlarmTargetState.bind(this));
		alarmPanelService.getCharacteristic(Characteristic.SecuritySystemCurrentState).on("get", this.getAlarmCurrentState.bind(this));
		return [this.informationService, alarmPanelService];
	}
}

class ISYGarageDoorAccessory extends ISYBaseAccessory {
	constructor(log, sensorDevice, relayDevice, name, timeToOpen, alternate) {
		super(log, sensorDevice);
		this.name = name;
		this.timeToOpen = timeToOpen;
		this.relayDevice = relayDevice;
		this.alternate = alternate == undefined ? false : alternate;
		if (this.getSensorState()) {
			this.log(`GARAGE: ${this.name} Initial set during startup the sensor is open so defaulting states to open`);
			this.targetGarageState = Characteristic.TargetDoorState.OPEN;
			this.currentGarageState = Characteristic.CurrentDoorState.OPEN;
		} else {
			this.log(`GARAGE: ${this.name} Initial set during startup the sensor is closed so defaulting states to closed`);
			this.targetGarageState = Characteristic.TargetDoorState.CLOSED;
			this.currentGarageState = Characteristic.CurrentDoorState.CLOSED;
		}
	}
	getSensorState() {
		if (this.alternate) {
			return !this.device.getCurrentDoorWindowState();
		} else {
			return this.device.getCurrentDoorWindowState();
		}
	}
	// Handles an identify request
	identify(callback) {
		callback();
	}
	sendGarageDoorCommand(callback) {
		this.relayDevice.sendLightCommand(true, function() {
			callback();
		});
	}
	// Handles a set to the target lock state. Will ignore redundant commands.
	setTargetDoorState(targetState, callback) {
		var that = this;
		if (targetState == this.targetGarageState) {
			this.log("GARAGE: Ignoring redundant set of target state");
			callback();
			return;
		}
		this.targetGarageState = targetState;
		if (this.currentGarageState == Characteristic.CurrentDoorState.OPEN) {
			if (targetState == Characteristic.TargetDoorState.CLOSED) {
				this.log(`GARAGE: ${this.device.name} Current state is open and target is closed. Changing state to closing and sending command`);
				this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
				this.sendGarageDoorCommand(callback);
			}
		} else if (this.currentGarageState == Characteristic.CurrentDoorState.CLOSED) {
			if (targetState == Characteristic.TargetDoorState.OPEN) {
				this.log(`GARAGE: ${this.device.name} Current state is closed and target is open. Waiting for sensor change to trigger opening state`);
				this.sendGarageDoorCommand(callback);
				return;
			}
		} else if (this.currentGarageState == Characteristic.CurrentDoorState.OPENING) {
			if (targetState == Characteristic.TargetDoorState.CLOSED) {
				this.log("GARAGE: " + this.device.name + " Current state is opening and target is closed. Sending command and changing state to closing");
				this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
				this.sendGarageDoorCommand(function() {
					setTimeout(function() {
						that.sendGarageDoorCommand(callback);
					}, 3000);
				});
				return;
			}
		} else if (this.currentGarageState == Characteristic.CurrentDoorState.CLOSING) {
			if (targetState == Characteristic.TargetDoorState.OPEN) {
				this.log("GARAGE: " + this.device.name + " Current state is closing and target is open. Sending command and setting timeout to complete");
				this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
				this.sendGarageDoorCommand(function() {
					that.sendGarageDoorCommand(callback);
					setTimeout(that.completeOpen.bind(that), that.timeToOpen);
				}, 3000);
			}
		}
	}
	// Handles request to get the current lock state for homekit
	getCurrentDoorState(callback) {
		callback(null, this.currentGarageState);
	}
	setCurrentDoorState(newState, callback) {
		this.currentGarageState = newState;
		callback();
	}
	// Handles request to get the target lock state for homekit
	getTargetDoorState(callback) {
		callback(null, this.targetGarageState);
	}
	completeOpen() {
		if (this.currentGarageState == Characteristic.CurrentDoorState.OPENING) {
			this.log("GARAGE:  " + this.device.name + "Current door has bee opening long enough, marking open");
			this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
		} else {
			this.log("GARAGE:  " + this.device.name + "Opening aborted so not setting opened state automatically");
		}
	}
	// Mirrors change in the state of the underlying isj-js device object.
	handleExternalChange() {
		// Handle startup.

		if (this.getSensorState()) {
			if (this.currentGarageState == Characteristic.CurrentDoorState.OPEN) {
				this.log("GARAGE:  " + this.device.name + "Current state of door is open and now sensor matches. No action to take");
			} else if (this.currentGarageState == Characteristic.CurrentDoorState.CLOSED) {
				this.log("GARAGE:  " + this.device.name + "Current state of door is closed and now sensor says open. Setting state to opening");
				this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
				this.targetGarageState = Characteristic.TargetDoorState.OPEN;
				this.garageDoorService.setCharacteristic(Characteristic.TargetDoorState, Characteristic.CurrentDoorState.OPEN);
				setTimeout(this.completeOpen.bind(this), this.timeToOpen);
			} else if (this.currentGarageState == Characteristic.CurrentDoorState.OPENING) {
				this.log("GARAGE:  " + this.device.name + "Current state of door is opening and now sensor matches. No action to take");
			} else if (this.currentGarageState == Characteristic.CurrentDoorState.CLOSING) {
				this.log("GARAGE: C " + this.device.name + "urrent state of door is closing and now sensor matches. No action to take");
			}
		} else {
			if (this.currentGarageState == Characteristic.CurrentDoorState.OPEN) {
				this.log("GARAGE:  " + this.device.name + "Current state of door is open and now sensor shows closed. Setting current state to closed");
				this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
				this.targetGarageState = Characteristic.TargetDoorState.CLOSED;
				this.garageDoorService.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
			} else if (this.currentGarageState == Characteristic.CurrentDoorState.CLOSED) {
				this.log("GARAGE:  " + this.device.name + "Current state of door is closed and now sensor shows closed. No action to take");
			} else if (this.currentGarageState == Characteristic.CurrentDoorState.OPENING) {
				this.log("GARAGE:  " + this.device.name + "Current state of door is opening and now sensor shows closed. Setting current state to closed");
				this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
				this.targetGarageState = Characteristic.TargetDoorState.CLOSED;
				this.garageDoorService.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
			} else if (this.currentGarageState == Characteristic.CurrentDoorState.CLOSING) {
				this.log(`GARAGE:  ${this.device.name}Current state of door is closing and now sensor shows closed. Setting current state to closed`);
				this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
				this.targetGarageState = Characteristic.TargetDoorState.CLOSED;
				this.garageDoorService.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
			}
		}
	}
	getObstructionState(callback) {
		callback(null, false);
	}
	// Returns the set of services supported by this object.
	getServices() {
		super.getServices();
		var garageDoorService = new Service.GarageDoorOpener();
		this.garageDoorService = garageDoorService;

		garageDoorService.getCharacteristic(Characteristic.TargetDoorState).on("set", this.setTargetDoorState.bind(this));
		garageDoorService.getCharacteristic(Characteristic.TargetDoorState).on("get", this.getTargetDoorState.bind(this));
		garageDoorService.getCharacteristic(Characteristic.CurrentDoorState).on("get", this.getCurrentDoorState.bind(this));
		garageDoorService.getCharacteristic(Characteristic.CurrentDoorState).on("set", this.setCurrentDoorState.bind(this));
		garageDoorService.getCharacteristic(Characteristic.ObstructionDetected).on("get", this.getObstructionState.bind(this));
		return [this.informationService, garageDoorService];
	}
}

module.exports.platform = ISYPlatform;
module.exports.ISYFanAccessory = ISYFanAccessory;
module.exports.ISYLightAccessory = ISYLightAccessory;
module.exports.ISYLockAccessory = ISYLockAccessory;
module.exports.ISYOutletAccessory = ISYOutletAccessory;
module.exports.ISYDoorWindowSensorAccessory = ISYDoorWindowSensorAccessory;
module.exports.ISYMotionSensorAccessory = ISYMotionSensorAccessory;
module.exports.ISYElkAlarmPanelAccessory = ISYElkAlarmPanelAccessory;
module.exports.ISYSceneAccessory = ISYSceneAccessory;
module.exports.ISYGarageDoorAccessory = ISYGarageDoorAccessory;
