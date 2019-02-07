import { ElkAlarmSensorDevice } from 'isy-js';
import { ISYAccessory } from './ISYAccessory';
import { Characteristic, Service } from './plugin';
export class ISYElkAlarmPanelAccessory extends ISYAccessory<ElkAlarmSensorDevice> {
    public alarmPanelService: any;
    constructor(log, device) {
        super(log, device);
    }
    // Handles the identify command
    public identify(callback) {
        callback();
    }
    // Handles the request to set the alarm target state
    public setAlarmTargetState(targetStateHK, callback) {
        this.logger('ALARMSYSTEM: ' + this.device.name + 'Sending command to set alarm panel state to: ' + targetStateHK);
        const targetState = this.translateHKToAlarmTargetState(targetStateHK);
        this.logger('ALARMSYSTEM: ' + this.device.name + ' Would send the target state of: ' + targetState);
        if (this.device.getAlarmMode() !== targetState) {
            this.device.sendSetAlarmModeCommand(targetState, function(result) {
                callback();
            });
        } else {
            this.logger('ALARMSYSTEM: ' + this.device.name + ' Redundant command, already in that state.');
            callback();
        }
    }
    // Translates from the current state of the elk alarm system into a homekit compatible state. The elk panel has a lot more
    // possible states then can be directly represented by homekit so we map them. If the alarm is going off then it is tripped.
    // If it is arming or armed it is considered armed. Stay maps to the state state, away to the away state, night to the night
    // state.
    public translateAlarmCurrentStateToHK() {
        const tripState = this.device.getAlarmTripState();
        const sourceAlarmState = this.device.getAlarmState();
        const sourceAlarmMode = this.device.getAlarmMode();
        if (tripState >= this.device.ALARM_TRIP_STATE_TRIPPED) {
            return Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
        } else if (sourceAlarmState === this.device.ALARM_STATE_NOT_READY_TO_ARM || sourceAlarmState === this.device.ALARM_STATE_READY_TO_ARM || sourceAlarmState === this.device.ALARM_STATE_READY_TO_ARM_VIOLATION) {
            return Characteristic.SecuritySystemCurrentState.DISARMED;
        } else {
            if (sourceAlarmMode === this.device.ALARM_MODE_STAY || sourceAlarmMode === this.device.ALARM_MODE_STAY_INSTANT) {
                return Characteristic.SecuritySystemCurrentState.STAY_ARM;
            } else if (sourceAlarmMode === this.device.ALARM_MODE_AWAY || sourceAlarmMode === this.device.ALARM_MODE_VACATION) {
                return Characteristic.SecuritySystemCurrentState.AWAY_ARM;
            } else if (sourceAlarmMode === this.device.ALARM_MODE_NIGHT || sourceAlarmMode === this.device.ALARM_MODE_NIGHT_INSTANT) {
                return Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
            } else {
                this.logger('ALARMSYSTEM: ' + this.device.name + ' Setting to disarmed because sourceAlarmMode is ' + sourceAlarmMode);
                return Characteristic.SecuritySystemCurrentState.DISARMED;
            }
        }
    }
    // Translates the current target state of hthe underlying alarm into the appropriate homekit value
    public translateAlarmTargetStateToHK() {
        const sourceAlarmState = this.device.getAlarmMode();
        if (sourceAlarmState === this.device.ALARM_MODE_STAY || sourceAlarmState === this.device.ALARM_MODE_STAY_INSTANT) {
            return Characteristic.SecuritySystemTargetState.STAY_ARM;
        } else if (sourceAlarmState === this.device.ALARM_MODE_AWAY || sourceAlarmState === this.device.ALARM_MODE_VACATION) {
            return Characteristic.SecuritySystemTargetState.AWAY_ARM;
        } else if (sourceAlarmState === this.device.ALARM_MODE_NIGHT || sourceAlarmState === this.device.ALARM_MODE_NIGHT_INSTANT) {
            return Characteristic.SecuritySystemTargetState.NIGHT_ARM;
        } else {
            return Characteristic.SecuritySystemTargetState.DISARM;
        }
    }
    // Translates the homekit version of the alarm target state into the appropriate elk alarm panel state
    public translateHKToAlarmTargetState(state) {
        if (state === Characteristic.SecuritySystemTargetState.STAY_ARM) {
            return this.device.ALARM_MODE_STAY;
        } else if (state === Characteristic.SecuritySystemTargetState.AWAY_ARM) {
            return this.device.ALARM_MODE_AWAY;
        } else if (state === Characteristic.SecuritySystemTargetState.NIGHT_ARM) {
            return this.device.ALARM_MODE_NIGHT;
        } else {
            return this.device.ALARM_MODE_DISARMED;
        }
    }
    // Handles request to get the target alarm state
    public getAlarmTargetState(callback) {
        callback(null, this.translateAlarmTargetStateToHK());
    }
    // Handles request to get the current alarm state
    public getAlarmCurrentState(callback) {
        callback(null, this.translateAlarmCurrentStateToHK());
    }
    // Mirrors change in the state of the underlying isj-js device object.
    public handleExternalChange(propertyName, value, formattedValue) {
        super.handleExternalChange(propertyName, value, formattedValue);
        this.logger('ALARMPANEL: ' + this.device.name + ' Source device. Currenty state locally -' + this.device.getAlarmStatusAsText());
        this.logger('ALARMPANEL: ' + this.device.name + ' Got alarm change notification. Setting HK target state to: ' + this.translateAlarmTargetStateToHK() + ' Setting HK Current state to: ' + this.translateAlarmCurrentStateToHK());
        this.alarmPanelService.setCharacteristic(Characteristic.SecuritySystemTargetState, this.translateAlarmTargetStateToHK());
        this.alarmPanelService.setCharacteristic(Characteristic.SecuritySystemCurrentState, this.translateAlarmCurrentStateToHK());
    }
    // Returns the set of services supported by this object.
    public getServices() {
        super.getServices();
        const alarmPanelService = new Service.SecuritySystem();
        this.alarmPanelService = alarmPanelService;
        alarmPanelService.getCharacteristic(Characteristic.SecuritySystemTargetState).on('set', this.setAlarmTargetState.bind(this));
        alarmPanelService.getCharacteristic(Characteristic.SecuritySystemTargetState).on('get', this.getAlarmTargetState.bind(this));
        alarmPanelService.getCharacteristic(Characteristic.SecuritySystemCurrentState).on('get', this.getAlarmCurrentState.bind(this));
        return [this.informationService, alarmPanelService];
    }
}
