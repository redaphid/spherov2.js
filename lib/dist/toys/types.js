"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorMaskV2 = exports.SensorControlDefaults = exports.SensorMaskValues = exports.APIVersion = exports.Stance = exports.CharacteristicUUID = exports.ServicesUUID = void 0;
// web
// export enum ServicesUUID {
//   apiV2ControlService = '00010001-574f-4f20-5370-6865726f2121',
//   nordicDfuService = '00020001-574f-4f20-5370-6865726f2121'
// }
var ServicesUUID;
(function (ServicesUUID) {
    ServicesUUID["apiV2ControlService"] = "00010001574f4f2053706865726f2121";
    ServicesUUID["nordicDfuService"] = "00020001574f4f2053706865726f2121";
})(ServicesUUID = exports.ServicesUUID || (exports.ServicesUUID = {}));
var CharacteristicUUID;
(function (CharacteristicUUID) {
    CharacteristicUUID["apiV2Characteristic"] = "00010002574f4f2053706865726f2121";
    CharacteristicUUID["dfuControlCharacteristic"] = "00020002574f4f2053706865726f2121";
    CharacteristicUUID["dfuInfoCharacteristic"] = "00020004574f4f2053706865726f2121";
    CharacteristicUUID["antiDoSCharacteristic"] = "00020005574f4f2053706865726f2121";
    CharacteristicUUID["subsCharacteristic"] = "00020003574f4f2053706865726f2121";
})(CharacteristicUUID = exports.CharacteristicUUID || (exports.CharacteristicUUID = {}));
var Stance;
(function (Stance) {
    Stance[Stance["tripod"] = 1] = "tripod";
    Stance[Stance["bipod"] = 2] = "bipod";
})(Stance = exports.Stance || (exports.Stance = {}));
var APIVersion;
(function (APIVersion) {
    APIVersion[APIVersion["V2"] = 0] = "V2";
    APIVersion[APIVersion["V21"] = 1] = "V21";
})(APIVersion = exports.APIVersion || (exports.APIVersion = {}));
var SensorMaskValues;
(function (SensorMaskValues) {
    SensorMaskValues[SensorMaskValues["off"] = 0] = "off";
    SensorMaskValues[SensorMaskValues["locator"] = 1] = "locator";
    SensorMaskValues[SensorMaskValues["gyro"] = 2] = "gyro";
    SensorMaskValues[SensorMaskValues["orientation"] = 3] = "orientation";
    SensorMaskValues[SensorMaskValues["accelerometer"] = 4] = "accelerometer";
})(SensorMaskValues = exports.SensorMaskValues || (exports.SensorMaskValues = {}));
var SensorControlDefaults;
(function (SensorControlDefaults) {
    SensorControlDefaults[SensorControlDefaults["intervalToHz"] = 1000] = "intervalToHz";
    SensorControlDefaults[SensorControlDefaults["interval"] = 250] = "interval";
})(SensorControlDefaults = exports.SensorControlDefaults || (exports.SensorControlDefaults = {}));
var SensorMaskV2;
(function (SensorMaskV2) {
    SensorMaskV2[SensorMaskV2["off"] = 0] = "off";
    SensorMaskV2[SensorMaskV2["velocityY"] = 8] = "velocityY";
    SensorMaskV2[SensorMaskV2["velocityX"] = 16] = "velocityX";
    SensorMaskV2[SensorMaskV2["locatorY"] = 32] = "locatorY";
    SensorMaskV2[SensorMaskV2["locatorX"] = 64] = "locatorX";
    SensorMaskV2[SensorMaskV2["gyroZFilteredV2"] = 1024] = "gyroZFilteredV2";
    SensorMaskV2[SensorMaskV2["gyroYFilteredV2"] = 2048] = "gyroYFilteredV2";
    SensorMaskV2[SensorMaskV2["gyroXFilteredV2"] = 4096] = "gyroXFilteredV2";
    SensorMaskV2[SensorMaskV2["gyroZFilteredV21"] = 8388608] = "gyroZFilteredV21";
    SensorMaskV2[SensorMaskV2["gyroYFilteredV21"] = 16777216] = "gyroYFilteredV21";
    SensorMaskV2[SensorMaskV2["gyroXFilteredV21"] = 33554432] = "gyroXFilteredV21";
    SensorMaskV2[SensorMaskV2["accelerometerZFiltered"] = 8192] = "accelerometerZFiltered";
    SensorMaskV2[SensorMaskV2["accelerometerYFiltered"] = 16384] = "accelerometerYFiltered";
    SensorMaskV2[SensorMaskV2["accelerometerXFiltered"] = 32768] = "accelerometerXFiltered";
    SensorMaskV2[SensorMaskV2["imuYawAngleFiltered"] = 65536] = "imuYawAngleFiltered";
    SensorMaskV2[SensorMaskV2["imuRollAngleFiltered"] = 131072] = "imuRollAngleFiltered";
    SensorMaskV2[SensorMaskV2["imuPitchAngleFiltered"] = 262144] = "imuPitchAngleFiltered";
    SensorMaskV2[SensorMaskV2["gyroFilteredAllV2"] = 7168] = "gyroFilteredAllV2";
    SensorMaskV2[SensorMaskV2["gyroFilteredAllV21"] = 58720256] = "gyroFilteredAllV21";
    SensorMaskV2[SensorMaskV2["imuAnglesFilteredAll"] = 458752] = "imuAnglesFilteredAll";
    SensorMaskV2[SensorMaskV2["accelerometerFilteredAll"] = 57344] = "accelerometerFilteredAll";
    SensorMaskV2[SensorMaskV2["locatorAll"] = 120] = "locatorAll";
})(SensorMaskV2 = exports.SensorMaskV2 || (exports.SensorMaskV2 = {}));
