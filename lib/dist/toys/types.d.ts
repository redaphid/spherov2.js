import { Core } from "./core";
export declare enum ServicesUUID {
  apiV2ControlService = "00010001574f4f2053706865726f2121",
  nordicDfuService = "00020001574f4f2053706865726f2121",
}
export declare enum CharacteristicUUID {
  apiV2Characteristic = "00010002574f4f2053706865726f2121",
  dfuControlCharacteristic = "00020002574f4f2053706865726f2121",
  dfuInfoCharacteristic = "00020004574f4f2053706865726f2121",
  antiDoSCharacteristic = "00020005574f4f2053706865726f2121",
  subsCharacteristic = "00020003574f4f2053706865726f2121",
}
export interface IToyAdvertisement {
  name: string;
  prefix: string;
  class: typeof Core;
}
export declare enum Stance {
  tripod = 1,
  bipod = 2,
}
export declare enum APIVersion {
  V2 = 0,
  V21 = 1,
}
export declare enum SensorMaskValues {
  off = 0,
  locator = 1,
  gyro = 2,
  orientation = 3,
  accelerometer = 4,
}
export declare enum SensorControlDefaults {
  intervalToHz = 1000,
  interval = 250,
}
export interface ISensorMaskRaw {
  v2: SensorMaskV2[];
  v21: SensorMaskV2[];
}
export declare enum SensorMaskV2 {
  off = 0,
  velocityY = 8,
  velocityX = 16,
  locatorY = 32,
  locatorX = 64,
  gyroZFilteredV2 = 1024,
  gyroYFilteredV2 = 2048,
  gyroXFilteredV2 = 4096,
  gyroZFilteredV21 = 8388608,
  gyroYFilteredV21 = 16777216,
  gyroXFilteredV21 = 33554432,
  accelerometerZFiltered = 8192,
  accelerometerYFiltered = 16384,
  accelerometerXFiltered = 32768,
  imuYawAngleFiltered = 65536,
  imuRollAngleFiltered = 131072,
  imuPitchAngleFiltered = 262144,
  gyroFilteredAllV2 = 7168,
  gyroFilteredAllV21 = 58720256,
  imuAnglesFilteredAll = 458752,
  accelerometerFilteredAll = 57344,
  locatorAll = 120,
}
