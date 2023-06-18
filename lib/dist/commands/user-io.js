"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
exports.default = (generator) => {
    const encode = generator(types_1.DeviceId.userIO);
    const encodeAnimatronics = generator(types_1.DeviceId.animatronics);
    return {
        allLEDsRaw: (payload) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload,
        }),
        setBackLedIntensity: (i) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload: [0x00, 0x01, i],
        }),
        setMainLedBlueIntensity: (b) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload: [0x00, 0x08, b],
        }),
        setMainLedColor: (r, g, b) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload: [0x00, 0x70, r, g, b],
        }),
        setMainLedGreenIntensity: (g) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload: [0x00, 0x04, g],
        }),
        setMainLedRedIntensity: (r) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload: [0x00, 0x02, r],
        }),
        playAudioFile: (idx) => encode({
            commandId: types_1.UserIOCommandIds.playAudioFile,
            payload: [idx, 0x00, 0x00],
        }),
        turnDome: (angle) => encodeAnimatronics({
            commandId: types_1.AnimatronicsCommandIds.domePosition,
            payload: [angle[1], angle[0], 0x00, 0x00],
        }),
        setStance: (stance) => encodeAnimatronics({
            commandId: types_1.AnimatronicsCommandIds.shoulderAction,
            payload: [stance],
        }),
        playAnimation: (animation) => encodeAnimatronics({
            commandId: types_1.AnimatronicsCommandIds.animationBundle,
            payload: [0x00, animation],
        }),
        // Set R2D2 main LED color based on RGB vales (each can range between 0 and 255)
        // same like front LED color
        setR2D2LEDColor: (r, g, b) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload: [0x00, 0x77, r, g, b, r, g, b],
        }),
        // Set R2D2 front LED color based on RGB vales (each can range between 0 and 255)
        // same like main LED color
        setR2D2FrontLEDColor: (r, g, b) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload: [0x00, 0x07, r, g, b],
        }),
        // Set R2D2 back LED color based on RGB vales (each can range between 0 and 255)
        setR2D2BackLEDcolor: (r, g, b) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload: [0x00, 0x70, r, g, b],
        }),
        // Set R2D2 the holo projector intensity based on 0-255 values
        setR2D2HoloProjectorIntensity: (i) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload: [0x00, 0x80, i],
        }),
        // Set R2D2 the logic displays intensity based on 0-255 values
        setR2D2LogicDisplaysIntensity: (i) => encode({
            commandId: types_1.UserIOCommandIds.allLEDs,
            payload: [0x00, 0x08, i],
        }),
        // R2D2 Waddle
        // R2D2 waddles 3 = start waddle, 0 = stop waddle
        setR2D2Waddle: (waddle) => encodeAnimatronics({
            commandId: types_1.AnimatronicsCommandIds.shoulderAction,
            payload: [waddle],
        }),
        playR2D2Sound: (hex1, hex2) => encode({
            commandId: types_1.UserIOCommandIds.playAudioFile,
            payload: [hex1, hex2, 0x00],
        }),
        startIdleLedAnimation: () => encode({
            commandId: types_1.UserIOCommandIds.startIdleLedAnimation,
        }),
        setAudioVolume: (vol) => encode({
            commandId: types_1.UserIOCommandIds.audioVolume,
            payload: [vol],
        }),
    };
};
