"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Gatt = require("@abandonware/noble/lib/hci-socket/gatt");
const ATT_OP_WRITE_RESP = 0x13;
Gatt.prototype.notify = function (serviceUuid, characteristicUuid, notify) {
    const characteristic = this._characteristics[serviceUuid][characteristicUuid];
    const valueBuffer = new Buffer(2);
    valueBuffer.writeUInt16LE(0x01, 0);
    this._queueCommand(this.writeRequest(characteristic.endHandle, valueBuffer, false), function (data) {
        const opcode = data[0];
        if (opcode === ATT_OP_WRITE_RESP) {
            this.emit('notify', this._address, serviceUuid, characteristicUuid, notify);
        }
    }.bind(this));
};
