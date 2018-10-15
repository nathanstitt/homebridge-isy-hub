export interface IgnoreDeviceRule {
	name: string;
	lastAddressDigit: number;
	address: string;
	typeCode: string;
	family: string|number;
	nodeDef: string;
}

export interface RenameDeviceRule {
	name: string;
	address: string;
	newName: string;
}

export interface DeviceConfig
{
	name: string;
	address: string;
	typeCode: string;
	triggers: DevicePropertyTrigger[];
	mapping: DeviceServiceMapping;
	ignore: boolean;
}

export interface DeviceServiceMapping
{
	service: string;
	properties: PropertyCharacteristicMapping[];
}


export interface PropertyCharacteristicMapping
{
	property: string;
	characteristic: string;
}

export interface DevicePropertyTrigger
{
	property: string;
	value: string;
	target:
	{
		name: string;
		address: string;
		command: string;
	}
}

export interface PlatformConfig {
	platform: string;
	name: string;
	host: string;
	username: string;
	password: string;
	useHttps: boolean;
	elkEnabled: boolean;
	debugLoggingEnabled: boolean;
	ignoreDevices: IgnoreDeviceRule[];
	renameDevices: RenameDeviceRule[];
	deviceConfigs: DeviceConfig[];
	[x: string]: any;
}