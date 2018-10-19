import { InsteonThermostatDevice, Props } from 'isy-js';
import { ISYDeviceAccessory } from './ISYDeviceAccessory';
import { Characteristic, Service } from './plugin';
export class ISYThermostatAccessory extends ISYDeviceAccessory<InsteonThermostatDevice> {
	public targetTemperature: number;
	public thermostatService: HAPNodeJS.Service;
	constructor(log, device: InsteonThermostatDevice) {
		super(log, device);
	}
	public toCelsius(temp): any {
		return ((temp - 32.0) * 5.0) / 9.0;
	}
	public toFahrenheit(temp): any {
		return Math.round((temp * 9.0) / 5.0 + 32.0);
	}
	public getCurrentTemperature(callback) {
		this.logger(`Getting Current Temperature - Device says: ${this.device.currentTemperature} says: ${this.toCelsius(this.device.currentTemperature)}`);
		callback(null, this.toCelsius(this.device.currentTemperature));
	}

	public getCoolSetPoint(callback) {
		this.logger(`Getting Cooling Set Point - Device says: ${this.device.coolSetPoint} translation says: ${this.toCelsius(this.device.coolSetPoint)}`);
		callback(null, this.toCelsius(this.device.coolSetPoint));
	}
	public getHeatSetPoint(callback) {
		this.logger(`Getting Heating Set Point - Device says: ${this.device.heatSetPoint} translation says: ${this.toCelsius(this.device.heatSetPoint)}`);
		callback(null, this.toCelsius(this.device.heatSetPoint));
	}
	public getMode(callback) {
		this.logger(`Getting Heating Cooling Mode - Device says: ${this.device.mode}`);
		callback(null, this.device.mode);
	}
	public getOperatingMode(callback) {
		this.logger(`Getting Heating Cooling State - Device says: ${this.device.operatingMode}`);
		callback(null, this.device.operatingMode);
	}
	public getFanMode(callback) {
		this.logger(`Getting Fan State - Device says: ${this.device.fanMode}`);
		callback(null, this.device.fanMode);
	}
	public getHumidity(callback) {
		this.logger(`Getting Current Rel. Humidity - Device says: ${this.device.humidity}`);
		callback(null, this.device.humidity);
	}
	// Mirrors change in the state of the underlying isy-js device object.
	public handleExternalChange(propertyName, value, formattedValue) {
		super.handleExternalChange(propertyName, value, formattedValue);
		switch (propertyName) {
			case Props.Status:
				this.thermostatService.updateCharacteristic(Characteristic.CurrentTemperature, this.toCelsius(this.device.currentTemperature));
				break;
			case Props.Climate.CoolSetPoint:
				this.thermostatService.updateCharacteristic(Characteristic.CoolingThresholdTemperature, this.toCelsius(this.device.coolSetPoint));
				break;
			case Props.Climate.HeatSetPoint:
				this.thermostatService.updateCharacteristic(Characteristic.CoolingThresholdTemperature, this.toCelsius(this.device.heatSetPoint));
				break;
			case Props.Climate.OperatingMode:
				this.thermostatService.updateCharacteristic(Characteristic.CurrentHeatingCoolingState, this.device.operatingMode);
				break;
			case Props.Climate.Mode:
				this.thermostatService.updateCharacteristic(Characteristic.TargetHeatingCoolingState, this.device.mode);
				break;
			case Props.Climate.FanMode:
				this.thermostatService.updateCharacteristic(Characteristic.CurrentFanState, this.device.fanMode);
				break;
			case Props.Climate.Humidity:
				this.thermostatService.updateCharacteristic(Characteristic.CurrentRelativeHumidity, this.device.humidity);
				break;
			default:
				break;
		}
	}
	public getServices(): HAPNodeJS.Service[] {
		const svcs = super.getServices();
		this.thermostatService = new Service.Thermostat();
		// thermostatService.getCharacteristic(Characteristic.TargetTemperature).on("get", this.getTargetTemperature.bind(this));
		// thermostatService.getCharacteristic(Characteristic.TargetTemperature).on("set", this.setTargetTemperature.bind(this));
		this.thermostatService.setCharacteristic(Characteristic.TemperatureDisplayUnits, 1);
		this.thermostatService.addCharacteristic(Characteristic.CurrentFanState);
		this.thermostatService.getCharacteristic(Characteristic.CurrentFanState).on('get', (f) => this.getFanMode(f));
		this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getCurrentTemperature.bind(this));
		this.thermostatService.getCharacteristic(Characteristic.CoolingThresholdTemperature).on('get', this.getCoolSetPoint.bind(this));
		this.thermostatService.getCharacteristic(Characteristic.CoolingThresholdTemperature).on('set', this.setCoolSetPoint.bind(this));
		this.thermostatService.getCharacteristic(Characteristic.HeatingThresholdTemperature).on('get', this.getHeatSetPoint.bind(this));
		this.thermostatService.getCharacteristic(Characteristic.HeatingThresholdTemperature).on('set', this.setHeatSetPoint.bind(this));
		this.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).on('get', this.getOperatingMode.bind(this));
		this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('get', this.getMode.bind(this));
		this.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('set', this.setHeatingCoolingMode.bind(this));
		this.thermostatService.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', this.getHumidity.bind(this));

		svcs.push(this.thermostatService);
		// ThermostatService
		//   .getCharacteristic(Characteristic.RotationSpeed)
		//   .on('set', this.setThermostatRotationSpeed.bind(this));
		return svcs;
	}
	public setCoolSetPoint(temp, callback) {
		this.logger(`Sending command to set cool set point (pre-translate) to: ${temp}`);
		const newSetPoint = this.toFahrenheit(temp);
		this.logger(`Sending command to set cool set point to: ${newSetPoint}`);
		if (Math.abs(newSetPoint - this.device.coolSetPoint) >= 1) {
			this.device.updateCoolSetPoint(newSetPoint).handleWith(callback);
		} else {
			this.logger(`Command does not change actual set point`);
			callback();
		}
	}
	public setHeatSetPoint(temp, callback) {
		this.logger(`Sending command to set heat set point (pre-translate) to: ${temp}`);
		const newSetPoint = this.toFahrenheit(temp);
		this.logger(`Sending command to set heat set point to: ${newSetPoint}`);
		if (Math.abs(newSetPoint - this.device.heatSetPoint) >= 1) {
			this.device
				.updateHeatSetPoint(newSetPoint).handleWith(callback);
		} else {
			this.logger(`Command does not change actual set point`);
			callback();
		}
	}
	public setHeatingCoolingMode(mode, callback) {
		this.logger(`Sending command to set heating/cooling mode (pre-translate) to: ${mode}`);
		// this.logger("THERM: " + this.device.name + " Sending command to set cool set point to: " + newSetPoint);
		if (mode !== this.device.mode) {
			this.device
				.updateMode(mode).handleWith(callback);
		} else {
			this.logger(`Command does not change actual mode`);
			callback();
		}
	}
}
