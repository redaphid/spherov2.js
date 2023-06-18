"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLightningMcQueen = exports.findAllSpheroMini = exports.findSpheroMiniByName = exports.findSpheroMini = exports.findR2Q5 = exports.findR2D2 = exports.findBB9E = exports.findAll = exports.find = exports.findToys = void 0;
const debug_1 = require("debug");
const noble_wrapper_1 = require("./noble-wrapper");
const bb9e_1 = require("./toys/bb9e");
const lightning_mcqueen_1 = require("./toys/lightning-mcqueen");
const r2d2_1 = require("./toys/r2d2");
const r2q5_1 = require("./toys/r2q5");
const sphero_mini_1 = require("./toys/sphero-mini");
const types_1 = require("./toys/types");
const utils_1 = require("./utils");
const utils_2 = require("./utils");
const scannerDebug = debug_1.default('spherov2-scanner');
const discover = async (validToys, toys, p) => {
    scannerDebug('Dicovered', p.address);
    const { advertisement, uuid } = p;
    const { localName = '' } = advertisement;
    validToys.forEach(async (toyAdvertisement) => {
        if (localName.indexOf(toyAdvertisement.prefix) === 0) {
            toys.push(Object.assign(Object.assign({}, toyAdvertisement), { peripheral: p }));
            console.log(`name: ${toyAdvertisement.name}, uuid: ${uuid}, mac-address: ${p.address}`);
        }
    });
};
/**
 * Searches (but does not start) toys that matcht the passed criteria
 */
const findToys = async (toysType) => {
    scannerDebug('findToys');
    const toys = [];
    console.log('Scanning devices...');
    const discoverBinded = discover.bind(this, toysType, toys);
    noble_wrapper_1.default.on('discover', discoverBinded);
    scannerDebug('findToys-nobleStartScanning');
    await utils_2.toPromise(noble_wrapper_1.default, noble_wrapper_1.default.startScanning, [
        Object.keys(types_1.ServicesUUID).map((key) => types_1.ServicesUUID[key]),
        false,
    ]); // any service UUID, no duplicates
    scannerDebug('findToys-wait5seconds');
    await utils_1.wait(5000);
    await utils_2.toPromise(noble_wrapper_1.default, noble_wrapper_1.default.stopScanning);
    noble_wrapper_1.default.removeListener('discover', discoverBinded);
    console.log('Done scanning devices.');
    return toys;
};
exports.findToys = findToys;
const startToy = async (toy) => {
    console.log('Starting...');
    await toy.start();
    console.log('Started');
    const version = await toy.appVersion();
    console.log('Version', version);
    const battery = await toy.batteryLevel();
    console.log('Battery', battery);
};
/**
 * Searches toys that match the passed criteria, starts the first found toy and
 * returns it
 */
const find = async (toyType, name) => {
    const discovered = await exports.findToys([toyType]);
    const discoveredItem = discovered.find((item) => item.peripheral.advertisement.localName === name) || discovered[0];
    if (!discoveredItem) {
        return console.log('Not found');
    }
    const toy = new toyType.class(discoveredItem.peripheral);
    await startToy(toy);
    return toy;
};
exports.find = find;
/**
 * Searches toys that match the passed criteria, starts and returns them
 */
const findAll = async (toyType) => {
    const discovered = await exports.findToys([toyType]);
    if (discovered.length > 0) {
        // Init toys and return array
        return await discovered.reduce(async (promise, item) => {
            const toyArray = await promise;
            const toy = new toyType.class(item.peripheral);
            await startToy(toy);
            return [...toyArray, toy];
        }, Promise.resolve([]));
    }
    else {
        console.log('Not found');
    }
};
exports.findAll = findAll;
/**
 * Searches BB9E toys, starts the first one that was found and returns it
 */
const findBB9E = async () => {
    return (await exports.find(bb9e_1.BB9E.advertisement));
};
exports.findBB9E = findBB9E;
/**
 * Searches R2D2 toys, starts the first one that was found and returns it
 */
const findR2D2 = async () => {
    return (await exports.find(r2d2_1.R2D2.advertisement));
};
exports.findR2D2 = findR2D2;
/**
 * Searches R2Q5 toys, starts the first one that was found and returns it
 */
const findR2Q5 = async () => {
    return (await exports.find(r2q5_1.R2Q5.advertisement));
};
exports.findR2Q5 = findR2Q5;
/**
 * Searches Sphero Mini toys, starts the first one that was found and returns it
 */
const findSpheroMini = async () => {
    return (await exports.find(sphero_mini_1.SpheroMini.advertisement));
};
exports.findSpheroMini = findSpheroMini;
/**
 * Searches a Sphero Mini toy with the passed name, starts and returns it
 */
const findSpheroMiniByName = async (name) => {
    return (await exports.find(sphero_mini_1.SpheroMini.advertisement, name));
};
exports.findSpheroMiniByName = findSpheroMiniByName;
/**
 * Searches for all available Sphero Mini toys, starts and returns them
 */
const findAllSpheroMini = async () => {
    return (await exports.findAll(sphero_mini_1.SpheroMini.advertisement));
};
exports.findAllSpheroMini = findAllSpheroMini;
/**
 * Searches Lightning McQueen toys, starts the first one that was found and
 * returns it
 */
const findLightningMcQueen = async () => {
    return (await exports.find(lightning_mcqueen_1.LightningMcQueen.advertisement));
};
exports.findLightningMcQueen = findLightningMcQueen;
