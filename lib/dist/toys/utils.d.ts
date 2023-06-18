import { SensorMaskValues, SensorMaskV2, APIVersion, ISensorMaskRaw } from './types';
import { ISensorResponse } from '../commands/types';
export declare const sensorValuesToRaw: (sensorMask: SensorMaskValues[], apiVersion?: APIVersion) => ISensorMaskRaw;
export declare const flatSensorMask: (sensorMask: SensorMaskV2[]) => number;
export declare const convertBinaryToFloat: (nums: number[], offset: number) => number;
export declare const parseSensorEvent: (payload: number[], sensorMask: ISensorMaskRaw) => ISensorResponse;
