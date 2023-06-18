"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightningMcQueen = void 0;
const rollable_toy_1 = require("./rollable-toy");
class LightningMcQueen extends rollable_toy_1.RollableToy {
    driveAsRc(heading, speed) {
        const cmd = this.commands.driving.driveAsRc(heading, speed);
        // console.log(Array.from(cmd.raw).map((x) => x.toString(16).padStart(2, '0')).join(':'));
        return this.queueCommand(cmd);
    }
}
exports.LightningMcQueen = LightningMcQueen;
LightningMcQueen.advertisement = {
    name: 'Lightning McQueen',
    prefix: 'LM-',
    class: LightningMcQueen,
};
