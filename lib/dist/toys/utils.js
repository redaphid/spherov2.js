"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSensorEvent = exports.convertBinaryToFloat = exports.flatSensorMask = exports.sensorValuesToRaw = void 0;
const types_1 = require("./types");
const sensorValuesToRawV2 = (sensorMask, apiVersion = types_1.APIVersion.V2) => sensorMask.reduce((v2, m) => {
    let mask;
    switch (m) {
        case types_1.SensorMaskValues.accelerometer:
            mask = types_1.SensorMaskV2.accelerometerFilteredAll;
            break;
        case types_1.SensorMaskValues.locator:
            mask = types_1.SensorMaskV2.locatorAll;
            break;
        case types_1.SensorMaskValues.orientation:
            mask = types_1.SensorMaskV2.imuAnglesFilteredAll;
            break;
    }
    if (m === types_1.SensorMaskValues.gyro && apiVersion === types_1.APIVersion.V2) {
        mask = types_1.SensorMaskV2.gyroFilteredAllV2;
    }
    if (mask) {
        return [...v2, mask];
    }
    return v2;
}, []);
const sensorValuesToRawV21 = (sensorMask, apiVersion = types_1.APIVersion.V2) => sensorMask.reduce((v21, m) => {
    let mask;
    if (m === types_1.SensorMaskValues.gyro && apiVersion === types_1.APIVersion.V21) {
        mask = types_1.SensorMaskV2.gyroFilteredAllV21;
    }
    if (mask) {
        return [...v21, mask];
    }
    return v21;
}, []);
const sensorValuesToRaw = (sensorMask, apiVersion = types_1.APIVersion.V2) => {
    return {
        v2: sensorValuesToRawV2(sensorMask, apiVersion),
        v21: sensorValuesToRawV21(sensorMask, apiVersion),
    };
};
exports.sensorValuesToRaw = sensorValuesToRaw;
const flatSensorMask = (sensorMask) => sensorMask.reduce((bits, m) => {
    return (bits |= m);
}, 0);
exports.flatSensorMask = flatSensorMask;
const convertBinaryToFloat = (nums, offset) => {
    // Extract binary data from payload array at the specific position in the array
    // Position in array is defined by offset variable
    // 1 Float value is always 4 bytes!
    if (offset + 4 > nums.length) {
        console.log('offset exceeded Limit of array ' + nums.length);
        return 0;
    }
    // convert it to a unsigned 8 bit array (there might be a better way)
    const ui8 = new Uint8Array([
        nums[0 + offset],
        nums[1 + offset],
        nums[2 + offset],
        nums[3 + offset],
    ]); // [0, 0, 0, 0]
    // set the uInt8 Array as source for data view
    const view = new DataView(ui8.buffer);
    // return the float value as function of dataView class
    return view.getFloat32(0);
};
exports.convertBinaryToFloat = convertBinaryToFloat;
const fillAngles = (state) => {
    const { sensorMask, floats, response, location } = state;
    if (sensorMask.v2.indexOf(types_1.SensorMaskV2.imuAnglesFilteredAll) >= 0) {
        response.angles = {
            pitch: floats[location],
            roll: floats[location + 1],
            yaw: floats[location + 2],
        };
        return Object.assign(Object.assign({}, state), { response, location: location + 3 });
    }
    return state;
};
const fillAccelerometer = (state) => {
    const { sensorMask, floats, response, location } = state;
    if (sensorMask.v2.indexOf(types_1.SensorMaskV2.accelerometerFilteredAll) >= 0) {
        response.accelerometer = {
            filtered: {
                x: floats[location],
                y: floats[location + 1],
                z: floats[location + 2],
            },
        };
        return Object.assign(Object.assign({}, state), { response, location: location + 3 });
    }
    return state;
};
const fillLocator = (state) => {
    const { sensorMask, floats, response, location } = state;
    if (sensorMask.v2.indexOf(types_1.SensorMaskV2.locatorAll) >= 0) {
        const metersToCentimeters = 100.0;
        response.locator = {
            position: {
                x: floats[location] * metersToCentimeters,
                y: floats[location + 1] * metersToCentimeters,
            },
            velocity: {
                x: floats[location + 2] * metersToCentimeters,
                y: floats[location + 3] * metersToCentimeters,
            },
        };
        return Object.assign(Object.assign({}, state), { response, location: location + 4 });
    }
    return state;
};
const fillGyroV2 = (state) => {
    const { sensorMask, floats, response, location } = state;
    if (sensorMask.v2.indexOf(types_1.SensorMaskV2.gyroFilteredAllV2) >= 0) {
        const multiplier = 2000.0 / 32767.0;
        response.gyro = {
            filtered: {
                x: floats[location] * multiplier,
                y: floats[location + 1] * multiplier,
                z: floats[location + 2] * multiplier,
            },
        };
        return Object.assign(Object.assign({}, state), { response, location: location + 3 });
    }
    return state;
};
const fillGyroV21 = (state) => {
    const { sensorMask, floats, response, location } = state;
    if (sensorMask.v21.indexOf(types_1.SensorMaskV2.gyroFilteredAllV21) >= 0) {
        response.gyro = {
            filtered: {
                x: floats[location],
                y: floats[location + 1],
                z: floats[location + 2],
            },
        };
        return Object.assign(Object.assign({}, state), { response, location: location + 3 });
    }
    return state;
};
const tranformToFloat = (bytes) => {
    const floats = [];
    for (let i = 0; i < bytes.length; i += 4) {
        floats.push(exports.convertBinaryToFloat(bytes, i));
    }
    return floats;
};
const parseSensorEvent = (payload, sensorMask) => {
    let state = {
        floats: tranformToFloat(payload),
        sensorMask,
        location: 0,
        response: {},
    };
    state = fillAngles(state);
    state = fillAccelerometer(state);
    state = fillGyroV2(state);
    state = fillLocator(state);
    state = fillGyroV21(state);
    return state.response;
};
exports.parseSensorEvent = parseSensorEvent;
