"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Peripheral = void 0;
require("./noble-fix-rasp");
const noble = require("@abandonware/noble");
exports.Peripheral = noble.Peripheral;
exports.default = noble;
