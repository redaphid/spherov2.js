"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BB9E = void 0;
const rollable_toy_1 = require("./rollable-toy");
class BB9E extends rollable_toy_1.RollableToy {
    constructor() {
        super(...arguments);
        this.maxVoltage = 7.8;
        this.minVoltage = 6.5;
    }
}
exports.BB9E = BB9E;
BB9E.advertisement = {
    name: 'BB-9E',
    prefix: 'GB-',
    class: BB9E,
};
