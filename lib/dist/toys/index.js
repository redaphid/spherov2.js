"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toys = void 0;
const sphero_bolt_1 = require("./sphero-bolt");
const sphero_mini_1 = require("./sphero-mini");
const r2q5_1 = require("./r2q5");
const r2d2_1 = require("./r2d2");
const lightning_mcqueen_1 = require("./lightning-mcqueen");
const bb9e_1 = require("./bb9e");
exports.toys = [
    bb9e_1.BB9E,
    lightning_mcqueen_1.LightningMcQueen,
    r2d2_1.R2D2,
    r2q5_1.R2Q5,
    sphero_mini_1.SpheroMini,
    sphero_bolt_1.SpheroBolt,
].map((c) => c.advertisement);
