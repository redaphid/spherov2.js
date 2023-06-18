"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpheroBolt = void 0;
const types_1 = require("./types");
const rollable_toy_1 = require("./rollable-toy");
class SpheroBolt extends rollable_toy_1.RollableToy {
    constructor() {
        super(...arguments);
        this.maxVoltage = 3.9;
        this.minVoltage = 3.55;
        this.apiVersion = types_1.APIVersion.V21;
    }
}
exports.SpheroBolt = SpheroBolt;
SpheroBolt.advertisement = {
    name: 'Sphero Bolt',
    prefix: 'SB-',
    class: SpheroBolt,
};
