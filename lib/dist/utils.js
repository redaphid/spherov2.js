"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineFlags = exports.wait = exports.toPromise = void 0;
/**
 * Wraps the passed function into a promise
 */
const toPromise = (binding, fn, args) => {
    return new Promise((resolve, reject) => {
        console.log('toPromise', binding, fn, args);
        const safeArgs = args || [];
        fn.bind(binding)(...safeArgs, (err, ...retArgs) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(retArgs || null);
            }
        });
    });
};
exports.toPromise = toPromise;
/**
 * Waits the given amount of milliseconds
 * @return promise
 */
const wait = (time) => new Promise((callback) => setTimeout(callback, time));
exports.wait = wait;
const combineFlags = (flags) => flags.reduce((memo, flag) => memo | flag, 0);
exports.combineFlags = combineFlags;
