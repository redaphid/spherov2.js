"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpheroMini = void 0;
const rollable_toy_1 = require("./rollable-toy");
class SpheroMini extends rollable_toy_1.RollableToy {
    constructor() {
        super(...arguments);
        this.maxVoltage = 3.65;
        this.minVoltage = 3.4;
    }
    something1() {
        return this.queueCommand(this.commands.systemInfo.something());
    }
    something2() {
        return this.queueCommand(this.commands.power.something2());
    }
    something3() {
        return this.queueCommand(this.commands.power.something3());
    }
    something4() {
        return this.queueCommand(this.commands.power.something4());
    }
    something5() {
        return this.queueCommand(this.commands.somethingApi.something5());
    }
    something6() {
        return this.queueCommand(this.commands.systemInfo.something6());
    }
    something7() {
        return this.queueCommand(this.commands.systemInfo.something7());
    }
}
exports.SpheroMini = SpheroMini;
SpheroMini.advertisement = {
    name: 'Sphero Mini',
    prefix: 'SM-',
    class: SpheroMini,
};
