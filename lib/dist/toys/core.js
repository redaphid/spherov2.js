"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Core = exports.Event = exports.decodeType = exports.commandsType = void 0;
const debug_1 = require("debug");
const commands_1 = require("../commands");
const decoder_1 = require("../commands/decoder");
const types_1 = require("../commands/types");
const utils_1 = require("../utils");
const queue_1 = require("./queue");
const types_2 = require("./types");
const utils_2 = require("./utils");
const coreDebug = debug_1.default('spherov2-core');
// TS workaround until 2.8 (not released), then ReturnType<factory>
exports.commandsType = false && commands_1.factory();
exports.decodeType = false && decoder_1.factory((_) => null);
var Event;
(function (Event) {
    Event["onCollision"] = "onCollision";
    Event["onSensor"] = "onSensor";
})(Event = exports.Event || (exports.Event = {}));
class Core {
    constructor(p) {
        // Override in child class to get right percent
        this.maxVoltage = 0;
        this.minVoltage = 1;
        this.apiVersion = types_2.APIVersion.V2;
        this.sensorMask = {
            v2: [],
            v21: [],
        };
        this.peripheral = p;
    }
    /**
     * Determines and returns the current battery charging state
     */
    async batteryVoltage() {
        const response = await this.queueCommand(this.commands.power.batteryVoltage());
        return decoder_1.number(response.command.payload, 1) / 100;
    }
    /**
     * returns battery level from [0, 1] range.
     * Child class must implement max voltage and min voltage to get
     * correct %
     */
    async batteryLevel() {
        const voltage = await this.batteryVoltage();
        const percent = (voltage - this.minVoltage) / (this.maxVoltage - this.minVoltage);
        return percent > 1 ? 1 : percent;
    }
    /**
     * Wakes up the toy from sleep mode
     */
    wake() {
        return this.queueCommand(this.commands.power.wake());
    }
    /**
     * Sets the to into sleep mode
     */
    sleep() {
        return this.queueCommand(this.commands.power.sleep());
    }
    /**
     * Starts the toy
     */
    async start() {
        coreDebug('start-start');
        // start
        await this.init();
        coreDebug('start-usetheforce...band');
        await this.write(this.antiDoSCharacteristic, 'usetheforce...band');
        coreDebug('start-dfuControlCharacteristic-subscribe');
        await utils_1.toPromise(this.dfuControlCharacteristic, this.dfuControlCharacteristic.subscribe);
        coreDebug('start-apiV2Characteristic-subscribe');
        await utils_1.toPromise(this.apiV2Characteristic, this.apiV2Characteristic.subscribe);
        coreDebug('start-initPromise');
        await this.initPromise;
        this.initPromiseResolve = null;
        this.started = true;
        try {
            coreDebug('start-wake');
            await this.wake();
        }
        catch (e) {
            console.error('error', e);
        }
        coreDebug('start-end');
    }
    /**
     * Determines and returns the system app version of the toy
     */
    async appVersion() {
        const response = await this.queueCommand(this.commands.systemInfo.appVersion());
        return {
            major: decoder_1.number(response.command.payload, 1),
            minor: decoder_1.number(response.command.payload, 3),
        };
    }
    on(eventName, handler) {
        this.eventsListeners[eventName] = handler;
    }
    async destroy() {
        // TODO handle all unbind, disconnect, etc
        this.eventsListeners = {}; // remove references
        await utils_1.toPromise(this.peripheral, this.peripheral.disconnect);
    }
    async configureSensorStream() {
        const sensorMask = [
            types_2.SensorMaskValues.accelerometer,
            types_2.SensorMaskValues.orientation,
            types_2.SensorMaskValues.locator,
            types_2.SensorMaskValues.gyro,
        ];
        // save it so on response we can parse it
        this.sensorMask = utils_2.sensorValuesToRaw(sensorMask, this.apiVersion);
        await this.queueCommand(this.commands.sensor.sensorMask(utils_2.flatSensorMask(this.sensorMask.v2), types_2.SensorControlDefaults.interval));
        if (this.sensorMask.v21.length > 0) {
            await this.queueCommand(this.commands.sensor.sensorMaskExtended(utils_2.flatSensorMask(this.sensorMask.v21)));
        }
    }
    enableCollisionDetection() {
        return this.queueCommand(this.commands.sensor.enableCollisionAsync());
    }
    configureCollisionDetection(xThreshold = 100, yThreshold = 100, xSpeed = 100, ySpeed = 100, deadTime = 10, method = 0x01) {
        return this.queueCommand(this.commands.sensor.configureCollision(xThreshold, yThreshold, xSpeed, ySpeed, deadTime, method));
    }
    queueCommand(command) {
        return this.queue.queue({
            characteristic: this.apiV2Characteristic,
            command,
        });
    }
    async init() {
        coreDebug('init-start');
        const p = this.peripheral;
        this.initPromise = new Promise((resolve) => {
            this.initPromiseResolve = resolve;
        });
        this.queue = new queue_1.Queue({
            match: (cA, cB) => this.match(cA, cB),
            onExecute: (item) => this.onExecute(item),
        });
        this.eventsListeners = {};
        this.commands = commands_1.factory();
        this.decoder = decoder_1.factory((error, packet) => this.onPacketRead(error, packet));
        this.started = false;
        coreDebug('init-connect');
        await utils_1.toPromise(p, p.connect);
        coreDebug('init-discoverAllServicesAndCharacteristics');
        await utils_1.toPromise(p, p.discoverAllServicesAndCharacteristics);
        // WEB
        // noble.onServicesDiscover(
        //   p.uuid,
        //   Object.keys(ServicesUUID).map(key => ServicesUUID[key])
        // );
        // await toPromise(p.services[0], p.services[0].discoverCharacteristics,
        // []); await toPromise(p.services[1],
        // p.services[1].discoverCharacteristics, []);
        this.bindServices();
        this.bindListeners();
        coreDebug('init-done');
    }
    async onExecute(item) {
        if (!this.started) {
            return;
        }
        await this.write(item.characteristic, item.command.raw);
    }
    match(commandA, commandB) {
        return (commandA.command.deviceId === commandB.command.deviceId &&
            commandA.command.commandId === commandB.command.commandId &&
            commandA.command.sequenceNumber === commandB.command.sequenceNumber);
    }
    bindServices() {
        coreDebug('bindServices');
        this.peripheral.services.forEach((s) => s.characteristics.forEach((c) => {
            if (c.uuid === types_2.CharacteristicUUID.antiDoSCharacteristic) {
                this.antiDoSCharacteristic = c;
                coreDebug('bindServices antiDoSCharacteristic found ', c);
            }
            else if (c.uuid === types_2.CharacteristicUUID.apiV2Characteristic) {
                this.apiV2Characteristic = c;
                coreDebug('bindServices apiV2Characteristic found', c);
            }
            else if (c.uuid === types_2.CharacteristicUUID.dfuControlCharacteristic) {
                this.dfuControlCharacteristic = c;
                coreDebug('bindServices dfuControlCharacteristic found', c);
            }
            else if (c.uuid === types_2.CharacteristicUUID.subsCharacteristic) {
                this.subsCharacteristic = c;
            }
        }));
    }
    bindListeners() {
        coreDebug('bindListeners');
        this.apiV2Characteristic.on('read', (data, isNotification) => this.onApiRead(data, isNotification));
        this.apiV2Characteristic.on('notify', (data, isNotification) => this.onApiNotify(data, isNotification));
        this.dfuControlCharacteristic.on('notify', (data, isNotification) => this.onDFUControlNotify(data, isNotification));
    }
    onPacketRead(error, command) {
        if (error) {
            console.error('There was a parse error', error);
        }
        else if (command.sequenceNumber === 255) {
            coreDebug('onEvent', error, command);
            this.eventHandler(command);
        }
        else {
            coreDebug('onPacketRead', error, command);
            this.queue.onCommandProcessed({ command });
        }
    }
    eventHandler(command) {
        if (command.deviceId === types_1.DeviceId.sensor &&
            command.commandId === types_1.SensorCommandIds.collisionDetectedAsync) {
            this.handleCollision(command);
        }
        else if (command.deviceId === types_1.DeviceId.sensor &&
            command.commandId === types_1.SensorCommandIds.sensorResponse) {
            this.handleSensorUpdate(command);
        }
        else {
            console.log('UNKOWN EVENT', command.raw);
        }
    }
    handleCollision(command) {
        // TODO parse collision
        const handler = this.eventsListeners.onCollision;
        if (handler) {
            handler(command);
        }
        else {
            console.log('No handler for collision but collision was detected');
        }
    }
    handleSensorUpdate(command) {
        const handler = this.eventsListeners.onSensor;
        if (handler) {
            const parsedEvent = utils_2.parseSensorEvent(command.payload, this.sensorMask);
            handler(parsedEvent);
        }
        else {
            console.log('No handler for collision but collision was detected');
        }
    }
    onApiRead(data, isNotification) {
        data.forEach((byte) => this.decoder.add(byte));
    }
    onApiNotify(data, isNotification) {
        if (this.initPromiseResolve) {
            coreDebug('onApiNotify', data);
            this.initPromiseResolve();
            this.initPromiseResolve = null;
            this.initPromise = null;
            return;
        }
    }
    onDFUControlNotify(data, isNotification) {
        coreDebug('onDFUControlNotify', data);
        return this.write(this.dfuControlCharacteristic, new Uint8Array([0x30]));
    }
    write(c, data) {
        let buff;
        if (typeof data === 'string') {
            buff = Buffer.from(data);
        }
        else {
            buff = Buffer.from(data);
        }
        coreDebug('write', data);
        return utils_1.toPromise(c, c.write, [buff, true]);
    }
}
exports.Core = Core;
