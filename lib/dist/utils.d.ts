/**
 * Wraps the passed function into a promise
 */
export declare const toPromise: (binding: any, fn: (...args: any[]) => void, args?: any[]) => Promise<unknown>;
/**
 * Waits the given amount of milliseconds
 * @return promise
 */
export declare const wait: (time: number) => Promise<unknown>;
export declare const combineFlags: (flags: number[]) => number;
