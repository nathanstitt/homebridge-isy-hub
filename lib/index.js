"use strict";

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _isyJs = require("isy-js");

var _hapNodejs = require("hap-nodejs");

var HAP = _interopRequireWildcard(_hapNodejs);

var _homebridge = require("homebridge");

var _isydevice = require("isy-js/isydevice");

var _isyscene = require("isy-js/isyscene");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Service;
var Characteristic;
var types;

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

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	types = homebridge.hapLegacyTypes;

	homebridge.registerPlatform("homebridge-isy-js", "isy-js", ISYPlatform);
};

var ISYPlatform = function () {
	function ISYPlatform(log, config) {
		_classCallCheck(this, ISYPlatform);

		this.log = log;
		this.config = config;
		this.host = config.host;
		this.username = config.username;
		this.password = config.password;
		this.elkEnabled = config.elkEnabled;
		this.debugLoggingEnabled = config.debugLoggingEnabled == undefined ? false : config.debugLoggingEnabled;
		this.includeAllScenes = config.includeAllScenes == undefined ? false : config.includeAllScenes;
		this.includedScenes = config.includedScenes == undefined ? [] : config.includedScenes;
		this.isy = new _isyJs.ISY(this.host, this.username, this.password, config.elkEnabled, ISYChangeHandler, config.useHttps, true, this.debugLoggingEnabled);
	}

	_createClass(ISYPlatform, [{
		key: "logger",
		value: function logger(msg) {
			if (this.debugLoggingEnabled || process.env.ISYJSDEBUG != undefined && process.env.IYJSDEBUG != null) {
				var timeStamp = new Date();
				this.log(timeStamp.getYear() + "-" + timeStamp.getMonth() + "-" + timeStamp.getDay() + "#" + timeStamp.getHours() + ":" + timeStamp.getMinutes() + ":" + timeStamp.getSeconds() + "- " + msg);
			}
		}
		// Checks the device against the configuration to see if it should be ignored.

	}, {
		key: "shouldIgnore",
		value: function shouldIgnore(device) {
			var deviceAddress = device.address;
			if (device.deviceType == this.isy.DEVICE_TYPE_SCENE && this.includeAllScenes == false) {
				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = this.includedScenes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var sceneAddress = _step.value;

						if (sceneAddress == deviceAddress) {
							return false;
						}
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion && _iterator.return) {
							_iterator.return();
						}
					} finally {
						if (_didIteratorError) {
							throw _iteratorError;
						}
					}
				}

				return true;
			} else {
				if (this.config.ignoreDevices == undefined) {
					return false;
				}
				var deviceName = device.name;
				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					for (var _iterator2 = this.config.ignoreDevices[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var rule = _step2.value;

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
						this.logger('ISYPLATFORM: Ignoring device: ' + deviceName + ' [' + deviceAddress + '] because of rule [' + rule.nameContains + '] [' + rule.lastAddressDigit + '] [' + rule.address + ']');
						return true;
					}
				} catch (err) {
					_didIteratorError2 = true;
					_iteratorError2 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion2 && _iterator2.return) {
							_iterator2.return();
						}
					} finally {
						if (_didIteratorError2) {
							throw _iteratorError2;
						}
					}
				}
			}
			return false;
		}
	}, {
		key: "getGarageEntry",
		value: function getGarageEntry(address) {
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
	}, {
		key: "renameDeviceIfNeeded",
		value: function renameDeviceIfNeeded(device) {
			var deviceAddress = device.address;
			var deviceName = device.name;
			if (this.config.renameDevices == undefined) {
				return deviceName;
			}
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = this.config.renameDevices[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var rule = _step3.value;

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
						this.logger("ISYPLATFORM: Rule to rename device is present but no new name specified. Impacting device: " + deviceName);
						return deviceName;
					} else {
						this.logger("ISYPLATFORM: Renaming device: " + deviceName + "[" + deviceAddress + "] to [" + rule.newName + "] because of rule [" + rule.nameContains + "] [" + rule.lastAddressDigit + "] [" + rule.address + "]");
						return rule.newName;
					}
				}
			} catch (err) {
				_didIteratorError3 = true;
				_iteratorError3 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion3 && _iterator3.return) {
						_iterator3.return();
					}
				} finally {
					if (_didIteratorError3) {
						throw _iteratorError3;
					}
				}
			}

			return deviceName;
		}
		// Calls the isy-js library, retrieves the list of devices, and maps them to appropriate ISYXXXXAccessory devices.

	}, {
		key: "accessories",
		value: function accessories(callback) {
			var _this = this;

			var that = this;
			this.isy.initialize(function () {
				var results = [];
				var deviceList = that.isy.getDeviceList();
				var _iteratorNormalCompletion4 = true;
				var _didIteratorError4 = false;
				var _iteratorError4 = undefined;

				try {
					for (var _iterator4 = deviceList[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
						var device = _step4.value;

						var homeKitDevice = null;
						var garageInfo = that.getGarageEntry(device.address);
						if (!that.shouldIgnore(device)) {
							if (results.length >= 100) {
								that.logger("ISYPLATFORM: Skipping any further devices as 100 limit has been reached");
								break;
							}
							device.name = that.renameDeviceIfNeeded(device);
							if (garageInfo != null) {
								var relayAddress = device.address.substr(0, device.address.length - 1);
								relayAddress += "2";
								var relayDevice = that.isy.getDevice(relayAddress);
								homeKitDevice = new ISYGarageDoorAccessory(that.logger.bind(that), device, relayDevice, garageInfo.name, garageInfo.timeToOpen, garageInfo.alternate);
							}
							homeKitDevice = _this.createAccessory(device);
							if (homeKitDevice != null) {
								// Make sure the device is address to the global map
								deviceMap[device.address] = homeKitDevice;
								results.push(homeKitDevice);
							}
						}
					}
				} catch (err) {
					_didIteratorError4 = true;
					_iteratorError4 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion4 && _iterator4.return) {
							_iterator4.return();
						}
					} finally {
						if (_didIteratorError4) {
							throw _iteratorError4;
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
				that.logger("ISYPLATFORM: Filtered device has: " + results.length + " devices");
				callback(results);
			});
		}
	}, {
		key: "createAccessory",
		value: function createAccessory(device) {
			var that = this;
			if (device instanceof _isydevice.ISYLightDevice) {
				return new ISYLightAccessory(this.logger.bind(this), device);
			} else if (device instanceof _isydevice.ISYLockDevice) {
				return new ISYLockAccessory(this.logger.bind(that), device);
			} else if (device instanceof _isydevice.ISYOutletDevice) {
				return new ISYOutletAccessory(this.logger.bind(this), device);
			} else if (device instanceof _isydevice.ISYFanDevice) {
				return new ISYFanAccessory(that.logger.bind(that), device);
			} else if (device instanceof _isydevice.ISYDoorWindowDevice) {
				return new ISYDoorWindowSensorAccessory(that.logger.bind(that), device);
			} else if (device.deviceType == that.isy.DEVICE_TYPE_ALARM_DOOR_WINDOW_SENSOR) {
				return new ISYDoorWindowSensorAccessory(that.logger.bind(that), device);
			} else if (device.deviceType == that.isy.DEVICE_TYPE_ALARM_PANEL) {
				return new ISYElkAlarmPanelAccessory(that.logger.bind(that), device);
			} else if (device instanceof _isydevice.ISYMotionSensorDevice) {
				return new ISYMotionSensorAccessory(that.logger.bind(that), device);
			} else if (device instanceof _isyscene.ISYScene) {
				return new ISYSceneAccessory(that.logger.bind(that), device);
			} else if (device instanceof _isydevice.ISYThermostatDevice) {
				return new ISYThermostatAccessory(that.logger.bind(that), device);
			}
			return null;
		}
	}]);

	return ISYPlatform;
}();

/////////////////////////////////////////////////////////////////////////////////////////////////
// BASE FOR ALL DEVICES

// Provides common constructor tasks


function ISYAccessoryBaseSetup(accessory, log, device) {
	accessory.log = function (msg) {
		return log(device.name + ": " + msg);
	};
	accessory.device = device;
	accessory.address = device.address;
	accessory.name = device.name;
	accessory.uuid_base = device.isy.address + ":" + device.address;
	console.log(accessory.uuid_base);
}

var ISYBaseAccessory /*extends /*Accessory*/ = function () {
	function ISYBaseAccessory(log, device) {
		_classCallCheck(this, ISYBaseAccessory);

		ISYAccessoryBaseSetup(this, log, device);

		////uper(this.name,homebridge.hap.generateUUID(this.uuid_base));
	}

	_createClass(ISYBaseAccessory, [{
		key: "getServices",
		value: function getServices() {
			var informationService = new Service.AccessoryInformation();
			informationService.setCharacteristic(Characteristic.Manufacturer, "Insteon").setCharacteristic(Characteristic.Model, this.device.productName == null ? this.device.deviceFriendlyName : this.device.productName).setCharacteristic(Characteristic.SerialNumber, this.device.address);
			this.informationService = informationService;
		}
	}]);

	return ISYBaseAccessory;
}();

var ISYThermostatAccessory = function (_ISYBaseAccessory) {
	_inherits(ISYThermostatAccessory, _ISYBaseAccessory);

	function ISYThermostatAccessory(log, device) {
		_classCallCheck(this, ISYThermostatAccessory);

		return _possibleConstructorReturn(this, (ISYThermostatAccessory.__proto__ || Object.getPrototypeOf(ISYThermostatAccessory)).call(this, log, device));
	}

	_createClass(ISYThermostatAccessory, [{
		key: "identify",
		value: function identify(callback) {
			// Do the identify action
			callback();
		}
		// Translates the Thermostat speed as an isy-js string into the corresponding homekit constant level.
		// Homekit doesn't have steps for the Thermostat speed and needs to have a value from 0 to 100. We
		// split the range into 4 steps and map them to the 4 isy-js levels.

	}, {
		key: "toCelsius",
		value: function toCelsius(temp) {
			return (temp - 32.0) * 5.0 / 9.0;
		}
		// Translates the fan level from homebridge into the isy-js level. Maps from the 0-100
		// to the four isy-js fan speed levels.

	}, {
		key: "toFahrenheit",
		value: function toFahrenheit(temp) {
			return Math.round(temp * 9.0 / 5.0 + 32.0);
		}
		// Returns the current state of the fan from the isy-js level to the 0-100 level of HK.

	}, {
		key: "getCurrentTemperature",
		value: function getCurrentTemperature(callback) {
			this.log("THERM: " + this.device.name + " Getting Current Temperature - Device says: " + this.device.getCurrentTemperatureState() + " translation says: " + this.toCelsius(this.device.getCurrentTemperatureState()));
			callback(null, this.toCelsius(this.device.getCurrentTemperatureState()));
		}
	}, {
		key: "initTargetTemperature",
		value: function initTargetTemperature() {

			var heatSetPoint = this.device.getHeatSetPoint();
			var coolSetPoint = this.device.getCoolSetPoint();
			var currentTemperature = this.device.getCurrentTemperatureState();
			if (currentTemperature >= heatSetPoint && currentTemperature <= coolSetPoint) this.targetTemperature = this.toCelsius(currentTemperature);else if (currentTemperature < heatSetPoint) this.targetTemperature = this.toCelsius(heatSetPoint);else if (currentTemperature > coolSetPoint) this.targetTemperature = this.toCelsius(coolSetPoint);else this.log('Cannot set target temperature - unhandled scenario.');
		}
	}, {
		key: "getTargetTemperature",
		value: function getTargetTemperature(callback) {
			this.log("THERM: " + this.device.name + " Getting Temperature - Device says: " + this.device.getCurrentTemperatureState() + " translation says: " + this.toCelsius(this.device.getCurrentTemperatureState()));
			if (this.targetTemperature == undefined) this.initTargetTemperature();

			callback(null, this.targetTemperature);
		}
	}, {
		key: "getCoolSetPoint",
		value: function getCoolSetPoint(callback) {
			this.log("THERM: " + this.device.name + " Getting Cooling Set Point - Device says: " + this.device.getCoolSetPoint() + " translation says: " + this.toCelsius(this.device.getCoolSetPoint()));
			callback(null, this.toCelsius(this.device.getCoolSetPoint()));
		}
	}, {
		key: "getHeatSetPoint",
		value: function getHeatSetPoint(callback) {
			this.log("THERM: " + this.device.name + " Getting Heating Set Point - Device says: " + this.device.getHeatSetPoint() + " translation says: " + this.toCelsius(this.device.getHeatSetPoint()));
			callback(null, this.toCelsius(this.device.getHeatSetPoint()));
		}
	}, {
		key: "getHeatingCoolingMode",
		value: function getHeatingCoolingMode(callback) {
			this.log("THERM: " + this.device.name + " Getting Heating Cooling Mode - Device says: " + this.device.getHeatingCoolingMode());
			callback(null, this.device.getHeatingCoolingMode());
		}
	}, {
		key: "getHeatingCoolingState",
		value: function getHeatingCoolingState(callback) {
			this.log("THERM: " + this.device.name + " Getting Heating Cooling State - Device says: " + this.device.getHeatingCoolingState());
			callback(null, this.device.getHeatingCoolingState());
		}
	}, {
		key: "getFanState",
		value: function getFanState(callback) {
			this.log("THERM: " + this.device.name + " Getting Fan State - Device says: " + this.device.getFanState());
			callback(null, this.device.getFanState());
		}
	}, {
		key: "getHumidity",
		value: function getHumidity(callback) {
			this.log("THERM: " + this.device.name + " Getting Current Rel. Humidity - Device says: " + this.device.getHumidity());
			callback(null, this.device.getHumidity());
		}

		// Mirrors change in the state of the underlying isj-js device object.

	}, {
		key: "handleExternalChange",
		value: function handleExternalChange() {
			this.log("THERM: " + this.device.name + " Incoming external change. Device says: " + this.device.getCurrentTemperatureState());
			this.thermostatService.updateCharacteristic(Characteristic.CurrentTemperature, this.toCelsius(this.device.getCurrentTemperatureState()));
			this.thermostatService.updateCharacteristic(Characteristic.CoolingThresholdTemperature, this.toCelsius(this.device.getCoolSetPoint()));
			this.thermostatService.updateCharacteristic(Characteristic.HeatingThresholdTemperature, this.toCelsius(this.device.getHeatSetPoint()));
			this.thermostatService.updateCharacteristic(Characteristic.TargetHeatingCoolingState, this.device.getHeatingCoolingMode());
			this.thermostatService.updateCharacteristic(Characteristic.CurrentHeatingCoolingState, this.device.getHeatingCoolingState());
			this.thermostatService.updateCharacteristic(Characteristic.CurrentFanState, this.device.getFanState());
			this.thermostatService.updateCharacteristic(Characteristic.CurrentRelativeHumidity, this.device.getHumidity());
		}
		// Returns the services supported by the fan device.

	}, {
		key: "getServices",
		value: function getServices() {
			_get(ISYThermostatAccessory.prototype.__proto__ || Object.getPrototypeOf(ISYThermostatAccessory.prototype), "getServices", this).call(this);
			var thermostatService = new Service.Thermostat();
			thermostatService.getCharacteristic(Characteristic.TargetTemperature).on("get", this.getTargetTemperature.bind(this));
			thermostatService.getCharacteristic(Characteristic.TargetTemperature).on("set", this.setTargetTemperature.bind(this));
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
	}, {
		key: "setCoolSetPoint",
		value: function setCoolSetPoint(temp, callback) {
			this.log("THERM: " + this.device.name + " Sending command to set cool set point (pre-translate) to: " + temp);
			var newSetPoint = this.toFahrenheit(temp);
			this.log("THERM: " + this.device.name + " Sending command to set cool set point to: " + newSetPoint);
			if (Math.abs(newSetPoint - this.device.getCoolSetPoint()) >= 1) {
				this.device.sendUpdateCoolSetPointCommand(newSetPoint, function (result) {
					callback();
				});
			} else {
				this.log("THERM: " + this.device.name + " command does not change actual set point");
				callback();
			}
		}
	}, {
		key: "setTargetTemperature",
		value: function setTargetTemperature(temp, callback) {
			this.log("THERM: " + this.device.name + " requested target temperature (pre-translate) is: " + temp);
			var targTemp = this.toFahrenheit(temp);
			this.log("THERM: " + this.device.name + " requested target temperature is: " + targTemp);
			if (temp != this.targetTemperature) {
				if (targTemp < this.device.getCoolSetPoint() - 1) {
					this.log("THERM: " + this.device.name + " sending command to set cool set point to: " + targTemp);
					this.device.sendUpdateCoolSetPointCommand(targTemp, function (result) {
						callback();
					});
				} else if (targTemp > this.device.getHeatSetPoint() + 1) {
					this.log("THERM: " + this.device.name + " sending command to set heat set point to: " + targTemp);
					this.device.sendUpdateHeatSetPointCommand(targTemp, function (result) {
						callback();
					});
				}
				this.targetTemperature = temp;
			}
		}
	}, {
		key: "setHeatSetPoint",
		value: function setHeatSetPoint(temp, callback) {
			this.log("THERM: " + this.device.name + " Sending command to set heat set point (pre-translate) to: " + temp);
			var newSetPoint = this.toFahrenheit(temp);
			this.log("THERM: " + this.device.name + " Sending command to set heat set point to: " + newSetPoint);
			if (Math.abs(newSetPoint - this.device.getHeatSetPoint()) >= 1) {
				this.device.sendUpdateHeatSetPointCommand(newSetPoint, function (result) {
					callback();
				});
			} else {
				this.log("THERM: " + this.device.name + " command does not change actual set point");
				callback();
			}
		}
	}, {
		key: "setHeatingCoolingMode",
		value: function setHeatingCoolingMode(mode, callback) {
			this.log("THERM: " + this.device.name + " Sending command to set heating/cooling mode (pre-translate) to: " + mode);

			//this.log("THERM: " + this.device.name + " Sending command to set cool set point to: " + newSetPoint);
			if (mode != this.device.getHeatingCoolingMode()) {
				this.device.sendUpdateHeatingCoolingModeCommand(mode, function (result) {
					callback();
				});
			} else {
				this.log("THERM: " + this.device.name + " command does not change actual set point");
				callback();
			}
		}
	}]);

	return ISYThermostatAccessory;
}(ISYBaseAccessory);

var ISYFanAccessory = function (_ISYBaseAccessory2) {
	_inherits(ISYFanAccessory, _ISYBaseAccessory2);

	function ISYFanAccessory(log, device) {
		_classCallCheck(this, ISYFanAccessory);

		return _possibleConstructorReturn(this, (ISYFanAccessory.__proto__ || Object.getPrototypeOf(ISYFanAccessory)).call(this, log, device));
	}

	_createClass(ISYFanAccessory, [{
		key: "identify",
		value: function identify(callback) {
			// Do the identify action
			callback();
		}
	}, {
		key: "translateFanSpeedToHK",
		value: function translateFanSpeedToHK(fanSpeed) {
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
					this.log("FAN: " + this.device.name + " !!!! ERROR: Unknown fan speed: " + fanSpeed);
					return 0;
			}
		}
		// Translates the fan level from homebridge into the isy-js level. Maps from the 0-100
		// to the four isy-js fan speed levels.

	}, {
		key: "translateHKToFanSpeed",
		value: function translateHKToFanSpeed(fanStateHK) {
			if (fanStateHK == 0) {
				return this.device.FAN_OFF;
			} else if (fanStateHK > 0 && fanStateHK <= 32) {
				return this.device.FAN_LEVEL_LOW;
			} else if (fanStateHK >= 33 && fanStateHK <= 75) {
				return this.device.FAN_LEVEL_MEDIUM;
			} else if (fanStateHK > 75) {
				return this.device.FAN_LEVEL_HIGH;
			} else {
				this.log("FAN: " + this.device.name + " ERROR: Unknown fan state!");
				return this.device.FAN_OFF;
			}
		}
		// Returns the current state of the fan from the isy-js level to the 0-100 level of HK.

	}, {
		key: "getFanRotationSpeed",
		value: function getFanRotationSpeed(callback) {
			this.log("FAN: " + this.device.name + " Getting fan rotation speed. Device says: " + this.device.getCurrentFanState() + " translation says: " + this.translateFanSpeedToHK(this.device.getCurrentFanState()));
			callback(null, this.translateFanSpeedToHK(this.device.getCurrentFanState()));
		}
		// Sets the current state of the fan from the 0-100 level of HK to the isy-js level.

	}, {
		key: "setFanRotationSpeed",
		value: function setFanRotationSpeed(fanStateHK, callback) {
			this.log("FAN: " + this.device.name + " Sending command to set fan state (pre-translate) to: " + fanStateHK);
			var newFanState = this.translateHKToFanSpeed(fanStateHK);
			this.log("FAN: " + this.device.name + " Sending command to set fan state to: " + newFanState);
			if (newFanState != this.device.getCurrentFanState()) {
				this.device.sendFanCommand(newFanState, function (result) {
					callback();
				});
			} else {
				this.log("FAN: " + this.device.name + " Fan command does not change actual speed");
				callback();
			}
		}
	}, {
		key: "getLightOnState",
		value: function getLightOnState() {}

		// Returns true if the fan is on

	}, {
		key: "getIsFanOn",
		value: function getIsFanOn() {
			this.log("FAN: " + this.device.name + " Getting fan is on. Device says: " + this.device.getCurrentFanState() + " Code says: " + (this.device.getCurrentFanState() != "Off"));
			return this.device.getCurrentFanState() != "Off";
		}
		// Returns the state of the fan to the homebridge system for the On characteristic

	}, {
		key: "getFanOnState",
		value: function getFanOnState(callback) {
			callback(null, this.getIsFanOn());
		}
		// Sets the fan state based on the value of the On characteristic. Default to Medium for on.

	}, {
		key: "setFanOnState",
		value: function setFanOnState(onState, callback) {
			this.log("FAN: " + this.device.name + " Setting fan on state to: " + onState + " Device says: " + this.device.getCurrentFanState());
			if (onState != this.getIsFanOn()) {
				if (onState) {
					this.log("FAN: " + this.device.name + " Setting fan speed to medium");
					this.setFanRotationSpeed(this.translateFanSpeedToHK(this.device.FAN_LEVEL_MEDIUM), callback);
				} else {
					this.log("FAN: " + this.device.name + " Setting fan speed to off");
					this.setFanRotationSpeed(this.translateFanSpeedToHK(this.device.FAN_OFF), callback);
				}
			} else {
				this.log("FAN: " + this.device.name + " Fan command does not change actual state");
				callback();
			}
		}
	}, {
		key: "setPowerState",
		value: function setPowerState(powerOn, callback) {
			this.log("LIGHT: " + this.device.name + " Setting powerstate to " + powerOn);
			if (powerOn != this.device.getCurrentLightState()) {
				this.log("LIGHT: " + this.device.name + " Changing powerstate to " + powerOn);
				this.device.sendLightCommand(powerOn, function (result) {
					callback();
				});
			} else {
				this.log("LIGHT: " + this.device.name + " Ignoring redundant setPowerState");
				callback();
			}
		}

		// Handles request to get the current on state

	}, {
		key: "getPowerState",
		value: function getPowerState(callback) {
			callback(null, this.device.getCurrentLightState());
		}
		// Handles request to set the brightness level of dimmable lights. Ignore redundant commands.

	}, {
		key: "setBrightness",
		value: function setBrightness(level, callback) {
			this.log("LIGHT: " + this.device.name + " Setting brightness to " + level);
			if (level != this.device.getCurrentLightDimState()) {
				if (level == 0) {
					this.log("LIGHT: " + this.device.name + " Brightness set to 0, sending off command");
					this.device.sendLightCommand(false, function (result) {
						callback();
					});
				} else {
					this.log("LIGHT: " + this.device.name + " Changing Brightness to " + level);
					this.device.sendLightDimCommand(level, function (result) {
						callback();
					});
				}
			} else {
				this.log("LIGHT: " + this.device.name + " Ignoring redundant setBrightness");
				callback();
			}
		}
		// Handles a request to get the current brightness level for dimmable lights.

	}, {
		key: "getBrightness",
		value: function getBrightness(callback) {
			callback(null, this.device.getCurrentLightDimState());
		}

		// Mirrors change in the state of the underlying isj-js device object.

	}, {
		key: "handleExternalChange",
		value: function handleExternalChange() {
			this.log("FAN: " + this.device.name + " Incoming external change. Device says: " + this.device.getCurrentFanState());
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

	}, {
		key: "getServices",
		value: function getServices() {
			_get(ISYFanAccessory.prototype.__proto__ || Object.getPrototypeOf(ISYFanAccessory.prototype), "getServices", this).call(this);
			var fanService = new Service.Fan();
			var lightService = this.fanService = fanService;
			this.lightService = lightService;
			fanService.getCharacteristic(Characteristic.On).on("set", this.setFanOnState.bind(this));
			fanService.getCharacteristic(Characteristic.On).on("get", this.getFanOnState.bind(this));
			fanService.addCharacteristic(Characteristic.RotationSpeed).on("get", this.getFanRotationSpeed.bind(this));
			fanService.getCharacteristic(Characteristic.RotationSpeed).on("set", this.setFanRotationSpeed.bind(this));

			return [this.informationService, fanService];
		}
	}]);

	return ISYFanAccessory;
}(ISYBaseAccessory);

var ISYSwitchAccessory = function (_ISYBaseAccessory3) {
	_inherits(ISYSwitchAccessory, _ISYBaseAccessory3);

	function ISYSwitchAccessory(log, device) {
		_classCallCheck(this, ISYSwitchAccessory);

		return _possibleConstructorReturn(this, (ISYSwitchAccessory.__proto__ || Object.getPrototypeOf(ISYSwitchAccessory)).call(this, log, device));
	}

	_createClass(ISYSwitchAccessory, [{
		key: "identify",
		value: function identify(callback) {
			callback();
		}
	}, {
		key: "getServices",
		value: function getServices() {}
	}]);

	return ISYSwitchAccessory;
}(ISYBaseAccessory);

var ISYOutletAccessory = function (_ISYBaseAccessory4) {
	_inherits(ISYOutletAccessory, _ISYBaseAccessory4);

	function ISYOutletAccessory(log, device) {
		_classCallCheck(this, ISYOutletAccessory);

		return _possibleConstructorReturn(this, (ISYOutletAccessory.__proto__ || Object.getPrototypeOf(ISYOutletAccessory)).call(this, log, device));
	}
	// Handles the identify command


	_createClass(ISYOutletAccessory, [{
		key: "identify",
		value: function identify(callback) {
			// Do the identify action
			callback();
		}
		// Handles a request to set the outlet state. Ignores redundant sets based on current states.

	}, {
		key: "setOutletState",
		value: function setOutletState(outletState, callback) {
			this.log("OUTLET: " + this.device.name + " Sending command to set outlet state to: " + outletState);
			if (outletState != this.device.getCurrentOutletState()) {
				this.device.sendOutletCommand(outletState, function (result) {
					callback();
				});
			} else {
				callback();
			}
		}
		// Handles a request to get the current outlet state based on underlying isy-js device object.

	}, {
		key: "getOutletState",
		value: function getOutletState(callback) {
			callback(null, this.device.getCurrentOutletState());
		}
		// Handles a request to get the current in use state of the outlet. We set this to true always as
		// there is no way to deterine this through the isy.

	}, {
		key: "getOutletInUseState",
		value: function getOutletInUseState(callback) {
			callback(null, true);
		}
		// Mirrors change in the state of the underlying isj-js device object.

	}, {
		key: "handleExternalChange",
		value: function handleExternalChange() {
			this.outletService.updateCharacteristic(Characteristic.On, this.device.getCurrentOutletState());
		}
		// Returns the set of services supported by this object.

	}, {
		key: "getServices",
		value: function getServices() {
			_get(ISYOutletAccessory.prototype.__proto__ || Object.getPrototypeOf(ISYOutletAccessory.prototype), "getServices", this).call(this);
			var outletService = new Service.Outlet();
			this.outletService = outletService;
			outletService.getCharacteristic(Characteristic.On).on("set", this.setOutletState.bind(this));
			outletService.getCharacteristic(Characteristic.On).on("get", this.getOutletState.bind(this));
			outletService.getCharacteristic(Characteristic.OutletInUse).on("get", this.getOutletInUseState.bind(this));
			return [this.informationService, outletService];
		}
	}]);

	return ISYOutletAccessory;
}(ISYBaseAccessory);

var ISYLockAccessory = function (_ISYBaseAccessory5) {
	_inherits(ISYLockAccessory, _ISYBaseAccessory5);

	function ISYLockAccessory(log, device) {
		_classCallCheck(this, ISYLockAccessory);

		return _possibleConstructorReturn(this, (ISYLockAccessory.__proto__ || Object.getPrototypeOf(ISYLockAccessory)).call(this, log, device));
	}
	// Handles an identify request


	_createClass(ISYLockAccessory, [{
		key: "identify",
		value: function identify(callback) {
			callback();
		}
		// Handles a set to the target lock state. Will ignore redundant commands.

	}, {
		key: "setTargetLockState",
		value: function setTargetLockState(lockState, callback) {
			this.log(this, "LOCK: " + this.device.name + " Sending command to set lock state to: " + lockState);
			if (lockState != this.getDeviceCurrentStateAsHK()) {
				var targetLockValue = lockState == 0 ? false : true;
				this.device.sendLockCommand(targetLockValue, function (result) {
					callback();
				});
			} else {
				callback();
			}
		}
		// Translates underlying lock state into the corresponding homekit state

	}, {
		key: "getDeviceCurrentStateAsHK",
		value: function getDeviceCurrentStateAsHK() {
			return this.device.getCurrentLockState() ? 1 : 0;
		}
		// Handles request to get the current lock state for homekit

	}, {
		key: "getLockCurrentState",
		value: function getLockCurrentState(callback) {
			callback(null, this.getDeviceCurrentStateAsHK());
		}
		// Handles request to get the target lock state for homekit

	}, {
		key: "getTargetLockState",
		value: function getTargetLockState(callback) {
			this.getLockCurrentState(callback);
		}
		// Mirrors change in the state of the underlying isj-js device object.

	}, {
		key: "handleExternalChange",
		value: function handleExternalChange() {
			this.lockService.updateCharacteristic(Characteristic.LockTargetState, this.getDeviceCurrentStateAsHK());
			this.lockService.updateCharacteristic(Characteristic.LockCurrentState, this.getDeviceCurrentStateAsHK());
		}
		// Returns the set of services supported by this object.

	}, {
		key: "getServices",
		value: function getServices() {
			_get(ISYLockAccessory.prototype.__proto__ || Object.getPrototypeOf(ISYLockAccessory.prototype), "getServices", this).call(this);
			var lockMechanismService = new Service.LockMechanism();
			this.lockService = lockMechanismService;

			lockMechanismService.getCharacteristic(Characteristic.LockTargetState).on("set", this.setTargetLockState.bind(this));
			lockMechanismService.getCharacteristic(Characteristic.LockTargetState).on("get", this.getTargetLockState.bind(this));
			lockMechanismService.getCharacteristic(Characteristic.LockCurrentState).on("get", this.getLockCurrentState.bind(this));
			return [this.informationService, lockMechanismService];
		}
	}]);

	return ISYLockAccessory;
}(ISYBaseAccessory);

var ISYLightAccessory = function (_ISYBaseAccessory6) {
	_inherits(ISYLightAccessory, _ISYBaseAccessory6);

	function ISYLightAccessory(log, device) {
		_classCallCheck(this, ISYLightAccessory);

		var _this7 = _possibleConstructorReturn(this, (ISYLightAccessory.__proto__ || Object.getPrototypeOf(ISYLightAccessory)).call(this, log, device));

		_this7.dimmable = _this7.device.deviceType == "DimmableLight";
		return _this7;
	}
	// Handles the identify command


	_createClass(ISYLightAccessory, [{
		key: "identify",
		value: function identify(callback) {
			var that = this;
			this.device.sendLightCommand(true, function (result) {
				that.device.sendLightCommand(false, function (result) {
					callback();
				});
			});
		}
		// Handles request to set the current powerstate from homekit. Will ignore redundant commands.

	}, {
		key: "setPowerState",
		value: function setPowerState(powerOn, callback) {
			this.log("LIGHT: " + this.device.name + " Setting powerstate to " + powerOn);
			if (powerOn != this.device.getCurrentLightState()) {
				this.log("LIGHT: " + this.device.name + " Changing powerstate to " + powerOn);
				this.device.sendLightCommand(powerOn, function (result) {
					callback();
				});
			} else {
				this.log("LIGHT: " + this.device.name + " Ignoring redundant setPowerState");
				callback();
			}
		}
		// Mirrors change in the state of the underlying isj-js device object.

	}, {
		key: "handleExternalChange",
		value: function handleExternalChange() {
			this.log("LIGHT: " + this.device.name + " Handling external change for light");
			this.lightService.updateCharacteristic(Characteristic.On, this.device.getCurrentLightState());
			if (this.dimmable) {
				this.lightService.updateCharacteristic(Characteristic.Brightness, this.device.getCurrentLightDimState());
			}
		}
		// Handles request to get the current on state

	}, {
		key: "getPowerState",
		value: function getPowerState(callback) {
			callback(null, this.device.getCurrentLightState());
		}
		// Handles request to set the brightness level of dimmable lights. Ignore redundant commands.

	}, {
		key: "setBrightness",
		value: function setBrightness(level, callback) {
			this.log("LIGHT: " + this.device.name + " Setting brightness to " + level);
			if (level != this.device.getCurrentLightDimState()) {
				if (level == 0) {
					this.log("LIGHT: " + this.device.name + " Brightness set to 0, sending off command");
					this.device.sendLightCommand(false, function (result) {
						callback();
					});
				} else {
					this.log("LIGHT: " + this.device.name + " Changing Brightness to " + level);
					this.device.sendLightDimCommand(level, function (result) {
						callback();
					});
				}
			} else {
				this.log("LIGHT: " + this.device.name + " Ignoring redundant setBrightness");
				callback();
			}
		}
		// Handles a request to get the current brightness level for dimmable lights.

	}, {
		key: "getBrightness",
		value: function getBrightness(callback) {
			callback(null, this.device.getCurrentLightDimState());
		}
		// Returns the set of services supported by this object.

	}, {
		key: "getServices",
		value: function getServices() {
			_get(ISYLightAccessory.prototype.__proto__ || Object.getPrototypeOf(ISYLightAccessory.prototype), "getServices", this).call(this);
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
	}]);

	return ISYLightAccessory;
}(ISYBaseAccessory);

var ISYSceneAccessory = function (_ISYBaseAccessory7) {
	_inherits(ISYSceneAccessory, _ISYBaseAccessory7);

	function ISYSceneAccessory(log, device) {
		_classCallCheck(this, ISYSceneAccessory);

		return _possibleConstructorReturn(this, (ISYSceneAccessory.__proto__ || Object.getPrototypeOf(ISYSceneAccessory)).call(this, log, device));
	}
	// Handles the identify command


	_createClass(ISYSceneAccessory, [{
		key: "identify",
		value: function identify(callback) {
			var that = this;
			this.device.sendLightCommand(true, function (result) {
				that.device.sendLightCommand(false, function (result) {
					callback();
				});
			});
		}
		// Handles request to set the current powerstate from homekit. Will ignore redundant commands.

	}, {
		key: "setPowerState",
		value: function setPowerState(powerOn, callback) {
			this.log("SCENE: " + this.device.name + " Setting powerstate to " + powerOn);
			if (!this.device.getAreAllLightsInSpecifiedState(powerOn)) {
				this.log("SCENE: " + this.device.name + " Changing powerstate to " + powerOn);
				this.device.sendLightCommand(powerOn, function (result) {
					callback();
				});
			} else {
				this.log("SCENE: " + this.device.name + " Ignoring redundant setPowerState");
				callback();
			}
		}
		// Mirrors change in the state of the underlying isj-js device object.

	}, {
		key: "handleExternalChange",
		value: function handleExternalChange() {
			this.log("SCENE: " + this.device.name + " Handling external change for light");
			if (this.device.getAreAllLightsInSpecifiedState(true) || this.device.getAreAllLightsInSpecifiedState(false)) {
				this.lightService.updateCharacteristic(Characteristic.On, this.device.getAreAllLightsInSpecifiedState(true));
			}
		}
	}, {
		key: "calculatePowerState",
		value: function calculatePowerState() {
			return this.device.getAreAllLightsInSpecifiedState(true);
		}
		// Handles request to get the current on state

	}, {
		key: "getPowerState",
		value: function getPowerState(callback) {
			callback(null, this.calculatePowerState());
		}
		// Returns the set of services supported by this object.

	}, {
		key: "getServices",
		value: function getServices() {
			_get(ISYSceneAccessory.prototype.__proto__ || Object.getPrototypeOf(ISYSceneAccessory.prototype), "getServices", this).call(this);
			var lightBulbService = new Service.Lightbulb();

			this.lightService = lightBulbService;
			lightBulbService.getCharacteristic(Characteristic.On).on("set", this.setPowerState.bind(this));
			lightBulbService.getCharacteristic(Characteristic.On).on("get", this.getPowerState.bind(this));
			return [this.informationService, lightBulbService];
		}
	}]);

	return ISYSceneAccessory;
}(ISYBaseAccessory);

var ISYDoorWindowSensorAccessory = function (_ISYBaseAccessory8) {
	_inherits(ISYDoorWindowSensorAccessory, _ISYBaseAccessory8);

	function ISYDoorWindowSensorAccessory(log, device) {
		_classCallCheck(this, ISYDoorWindowSensorAccessory);

		var _this9 = _possibleConstructorReturn(this, (ISYDoorWindowSensorAccessory.__proto__ || Object.getPrototypeOf(ISYDoorWindowSensorAccessory)).call(this, log, device));

		_this9.doorWindowState = false;
		return _this9;
	}
	// Handles the identify command.


	_createClass(ISYDoorWindowSensorAccessory, [{
		key: "identify",
		value: function identify(callback) {
			// Do the identify action
			callback();
		}
		// Translates the state of the underlying device object into the corresponding homekit compatible state

	}, {
		key: "translateCurrentDoorWindowState",
		value: function translateCurrentDoorWindowState() {
			return this.device.getCurrentDoorWindowState() ? Characteristic.ContactSensorState.CONTACT_NOT_DETECTED : Characteristic.ContactSensorState.CONTACT_DETECTED;
		}
		// Handles the request to get he current door window state.

	}, {
		key: "getCurrentDoorWindowState",
		value: function getCurrentDoorWindowState(callback) {
			callback(null, this.translateCurrentDoorWindowState());
		}
		// Mirrors change in the state of the underlying isj-js device object.

	}, {
		key: "handleExternalChange",
		value: function handleExternalChange() {
			this.sensorService.setCharacteristic(Characteristic.ContactSensorState, this.translateCurrentDoorWindowState());
		}
		// Returns the set of services supported by this object.

	}, {
		key: "getServices",
		value: function getServices() {
			_get(ISYDoorWindowSensorAccessory.prototype.__proto__ || Object.getPrototypeOf(ISYDoorWindowSensorAccessory.prototype), "getServices", this).call(this);
			var sensorService = new Service.ContactSensor();
			this.sensorService = sensorService;
			sensorService.getCharacteristic(Characteristic.ContactSensorState).on("get", this.getCurrentDoorWindowState.bind(this));
			return [this.informationService, sensorService];
		}
	}]);

	return ISYDoorWindowSensorAccessory;
}(ISYBaseAccessory);

var ISYMotionSensorAccessory = function (_ISYBaseAccessory9) {
	_inherits(ISYMotionSensorAccessory, _ISYBaseAccessory9);

	function ISYMotionSensorAccessory(log, device) {
		_classCallCheck(this, ISYMotionSensorAccessory);

		return _possibleConstructorReturn(this, (ISYMotionSensorAccessory.__proto__ || Object.getPrototypeOf(ISYMotionSensorAccessory)).call(this, log, device));
	}
	// Handles the identify command.


	_createClass(ISYMotionSensorAccessory, [{
		key: "identify",
		value: function identify(callback) {
			// Do the identify action
			callback();
		}
		// Handles the request to get he current motion sensor state.

	}, {
		key: "getCurrentMotionSensorState",
		value: function getCurrentMotionSensorState(callback) {
			callback(null, this.device.getCurrentMotionSensorState());
		}
		// Mirrors change in the state of the underlying isj-js device object.

	}, {
		key: "handleExternalChange",
		value: function handleExternalChange() {
			this.sensorService.setCharacteristic(Characteristic.MotionDetected, this.device.getCurrentMotionSensorState());
		}
		// Returns the set of services supported by this object.

	}, {
		key: "getServices",
		value: function getServices() {
			_get(ISYMotionSensorAccessory.prototype.__proto__ || Object.getPrototypeOf(ISYMotionSensorAccessory.prototype), "getServices", this).call(this);
			var sensorService = new Service.MotionSensor();
			this.sensorService = sensorService;

			sensorService.getCharacteristic(Characteristic.MotionDetected).on("get", this.getCurrentMotionSensorState.bind(this));
			return [this.informationService, sensorService];
		}
	}]);

	return ISYMotionSensorAccessory;
}(ISYBaseAccessory);

var ISYElkAlarmPanelAccessory = function (_ISYBaseAccessory10) {
	_inherits(ISYElkAlarmPanelAccessory, _ISYBaseAccessory10);

	function ISYElkAlarmPanelAccessory(log, device) {
		_classCallCheck(this, ISYElkAlarmPanelAccessory);

		return _possibleConstructorReturn(this, (ISYElkAlarmPanelAccessory.__proto__ || Object.getPrototypeOf(ISYElkAlarmPanelAccessory)).call(this, log, device));
	}
	// Handles the identify command


	_createClass(ISYElkAlarmPanelAccessory, [{
		key: "identify",
		value: function identify(callback) {
			callback();
		}
		// Handles the request to set the alarm target state

	}, {
		key: "setAlarmTargetState",
		value: function setAlarmTargetState(targetStateHK, callback) {
			this.log("ALARMSYSTEM: " + this.device.name + "Sending command to set alarm panel state to: " + targetStateHK);
			var targetState = this.translateHKToAlarmTargetState(targetStateHK);
			this.log("ALARMSYSTEM: " + this.device.name + " Would send the target state of: " + targetState);
			if (this.device.getAlarmMode() != targetState) {
				this.device.sendSetAlarmModeCommand(targetState, function (result) {
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

	}, {
		key: "translateAlarmCurrentStateToHK",
		value: function translateAlarmCurrentStateToHK() {
			var tripState = this.device.getAlarmTripState();
			var sourceAlarmState = this.device.getAlarmState();
			var sourceAlarmMode = this.device.getAlarmMode();
			if (tripState >= this.device.ALARM_TRIP_STATE_TRIPPED) {
				return Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
			} else if (sourceAlarmState == this.device.ALARM_STATE_NOT_READY_TO_ARM || sourceAlarmState == this.device.ALARM_STATE_READY_TO_ARM || sourceAlarmState == this.device.ALARM_STATE_READY_TO_ARM_VIOLATION) {
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

	}, {
		key: "translateAlarmTargetStateToHK",
		value: function translateAlarmTargetStateToHK() {
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

	}, {
		key: "translateHKToAlarmTargetState",
		value: function translateHKToAlarmTargetState(state) {
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

	}, {
		key: "getAlarmTargetState",
		value: function getAlarmTargetState(callback) {
			callback(null, this.translateAlarmTargetStateToHK());
		}
		// Handles request to get the current alarm state

	}, {
		key: "getAlarmCurrentState",
		value: function getAlarmCurrentState(callback) {
			callback(null, this.translateAlarmCurrentStateToHK());
		}
		// Mirrors change in the state of the underlying isj-js device object.

	}, {
		key: "handleExternalChange",
		value: function handleExternalChange() {
			this.log("ALARMPANEL: " + this.device.name + " Source device. Currenty state locally -" + this.device.getAlarmStatusAsText());
			this.log("ALARMPANEL: " + this.device.name + " Got alarm change notification. Setting HK target state to: " + this.translateAlarmTargetStateToHK() + " Setting HK Current state to: " + this.translateAlarmCurrentStateToHK());
			this.alarmPanelService.setCharacteristic(Characteristic.SecuritySystemTargetState, this.translateAlarmTargetStateToHK());
			this.alarmPanelService.setCharacteristic(Characteristic.SecuritySystemCurrentState, this.translateAlarmCurrentStateToHK());
		}
		// Returns the set of services supported by this object.

	}, {
		key: "getServices",
		value: function getServices() {
			_get(ISYElkAlarmPanelAccessory.prototype.__proto__ || Object.getPrototypeOf(ISYElkAlarmPanelAccessory.prototype), "getServices", this).call(this);
			var alarmPanelService = new Service.SecuritySystem();
			this.alarmPanelService = alarmPanelService;

			alarmPanelService.getCharacteristic(Characteristic.SecuritySystemTargetState).on("set", this.setAlarmTargetState.bind(this));
			alarmPanelService.getCharacteristic(Characteristic.SecuritySystemTargetState).on("get", this.getAlarmTargetState.bind(this));
			alarmPanelService.getCharacteristic(Characteristic.SecuritySystemCurrentState).on("get", this.getAlarmCurrentState.bind(this));
			return [this.informationService, alarmPanelService];
		}
	}]);

	return ISYElkAlarmPanelAccessory;
}(ISYBaseAccessory);

var ISYGarageDoorAccessory = function (_ISYBaseAccessory11) {
	_inherits(ISYGarageDoorAccessory, _ISYBaseAccessory11);

	function ISYGarageDoorAccessory(log, sensorDevice, relayDevice, name, timeToOpen, alternate) {
		_classCallCheck(this, ISYGarageDoorAccessory);

		var _this12 = _possibleConstructorReturn(this, (ISYGarageDoorAccessory.__proto__ || Object.getPrototypeOf(ISYGarageDoorAccessory)).call(this, log, sensorDevice));

		_this12.name = name;
		_this12.timeToOpen = timeToOpen;
		_this12.relayDevice = relayDevice;
		_this12.alternate = alternate == undefined ? false : alternate;
		if (_this12.getSensorState()) {
			_this12.log("GARAGE: " + _this12.name + " Initial set during startup the sensor is open so defaulting states to open");
			_this12.targetGarageState = Characteristic.TargetDoorState.OPEN;
			_this12.currentGarageState = Characteristic.CurrentDoorState.OPEN;
		} else {
			_this12.log("GARAGE: " + _this12.name + " Initial set during startup the sensor is closed so defaulting states to closed");
			_this12.targetGarageState = Characteristic.TargetDoorState.CLOSED;
			_this12.currentGarageState = Characteristic.CurrentDoorState.CLOSED;
		}
		return _this12;
	}

	_createClass(ISYGarageDoorAccessory, [{
		key: "getSensorState",
		value: function getSensorState() {
			if (this.alternate) {
				return !this.device.getCurrentDoorWindowState();
			} else {
				return this.device.getCurrentDoorWindowState();
			}
		}
		// Handles an identify request

	}, {
		key: "identify",
		value: function identify(callback) {
			callback();
		}
	}, {
		key: "sendGarageDoorCommand",
		value: function sendGarageDoorCommand(callback) {
			this.relayDevice.sendLightCommand(true, function () {
				callback();
			});
		}
		// Handles a set to the target lock state. Will ignore redundant commands.

	}, {
		key: "setTargetDoorState",
		value: function setTargetDoorState(targetState, callback) {
			var that = this;
			if (targetState == this.targetGarageState) {
				this.log("GARAGE: Ignoring redundant set of target state");
				callback();
				return;
			}
			this.targetGarageState = targetState;
			if (this.currentGarageState == Characteristic.CurrentDoorState.OPEN) {
				if (targetState == Characteristic.TargetDoorState.CLOSED) {
					this.log("GARAGE: " + this.device.name + " Current state is open and target is closed. Changing state to closing and sending command");
					this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
					this.sendGarageDoorCommand(callback);
				}
			} else if (this.currentGarageState == Characteristic.CurrentDoorState.CLOSED) {
				if (targetState == Characteristic.TargetDoorState.OPEN) {
					this.log("GARAGE: " + this.device.name + " Current state is closed and target is open. Waiting for sensor change to trigger opening state");
					this.sendGarageDoorCommand(callback);
					return;
				}
			} else if (this.currentGarageState == Characteristic.CurrentDoorState.OPENING) {
				if (targetState == Characteristic.TargetDoorState.CLOSED) {
					this.log("GARAGE: " + this.device.name + " Current state is opening and target is closed. Sending command and changing state to closing");
					this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
					this.sendGarageDoorCommand(function () {
						setTimeout(function () {
							that.sendGarageDoorCommand(callback);
						}, 3000);
					});
					return;
				}
			} else if (this.currentGarageState == Characteristic.CurrentDoorState.CLOSING) {
				if (targetState == Characteristic.TargetDoorState.OPEN) {
					this.log("GARAGE: " + this.device.name + " Current state is closing and target is open. Sending command and setting timeout to complete");
					this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
					this.sendGarageDoorCommand(function () {
						that.sendGarageDoorCommand(callback);
						setTimeout(that.completeOpen.bind(that), that.timeToOpen);
					}, 3000);
				}
			}
		}
		// Handles request to get the current lock state for homekit

	}, {
		key: "getCurrentDoorState",
		value: function getCurrentDoorState(callback) {
			callback(null, this.currentGarageState);
		}
	}, {
		key: "setCurrentDoorState",
		value: function setCurrentDoorState(newState, callback) {
			this.currentGarageState = newState;
			callback();
		}
		// Handles request to get the target lock state for homekit

	}, {
		key: "getTargetDoorState",
		value: function getTargetDoorState(callback) {
			callback(null, this.targetGarageState);
		}
	}, {
		key: "completeOpen",
		value: function completeOpen() {
			if (this.currentGarageState == Characteristic.CurrentDoorState.OPENING) {
				this.log("GARAGE:  " + this.device.name + "Current door has bee opening long enough, marking open");
				this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
			} else {
				this.log("GARAGE:  " + this.device.name + "Opening aborted so not setting opened state automatically");
			}
		}
		// Mirrors change in the state of the underlying isj-js device object.

	}, {
		key: "handleExternalChange",
		value: function handleExternalChange() {
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
					this.log("GARAGE:  " + this.device.name + "Current state of door is closing and now sensor shows closed. Setting current state to closed");
					this.garageDoorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
					this.targetGarageState = Characteristic.TargetDoorState.CLOSED;
					this.garageDoorService.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
				}
			}
		}
	}, {
		key: "getObstructionState",
		value: function getObstructionState(callback) {
			callback(null, false);
		}
		// Returns the set of services supported by this object.

	}, {
		key: "getServices",
		value: function getServices() {
			_get(ISYGarageDoorAccessory.prototype.__proto__ || Object.getPrototypeOf(ISYGarageDoorAccessory.prototype), "getServices", this).call(this);
			var garageDoorService = new Service.GarageDoorOpener();
			this.garageDoorService = garageDoorService;

			garageDoorService.getCharacteristic(Characteristic.TargetDoorState).on("set", this.setTargetDoorState.bind(this));
			garageDoorService.getCharacteristic(Characteristic.TargetDoorState).on("get", this.getTargetDoorState.bind(this));
			garageDoorService.getCharacteristic(Characteristic.CurrentDoorState).on("get", this.getCurrentDoorState.bind(this));
			garageDoorService.getCharacteristic(Characteristic.CurrentDoorState).on("set", this.setCurrentDoorState.bind(this));
			garageDoorService.getCharacteristic(Characteristic.ObstructionDetected).on("get", this.getObstructionState.bind(this));
			return [this.informationService, garageDoorService];
		}
	}]);

	return ISYGarageDoorAccessory;
}(ISYBaseAccessory);

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