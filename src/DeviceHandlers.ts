import { ISYDimmableAccessory } from './ISYDimmerAccessory';
import { ISYDoorWindowSensorAccessory } from './ISYDoorWindowSensorAccessory';
import { ISYFanAccessory } from './ISYFanAccessory';
import { ISYLockAccessory } from './ISYLockAccessory';
import { ISYMotionSensorAccessory } from './ISYMotionSensorAccessory';
import { ISYOutletAccessory } from './ISYOutletAccessory';
import { ISYRelayAccessory } from './ISYRelayAccessory';
import { ISYThermostatAccessory } from './ISYThermostatAccessory';

const DeviceHandlers = {
    DimmableLight: ISYDimmableAccessory,
    DoorLock: ISYLockAccessory,
    DoorWindowSensor: ISYDoorWindowSensorAccessory,
    Fan: ISYFanAccessory,
    Light: ISYRelayAccessory,
    MotionSensor: ISYMotionSensorAccessory,
    Outlet: ISYOutletAccessory,
    Thermostat: ISYThermostatAccessory,
};

export { DeviceHandlers };
