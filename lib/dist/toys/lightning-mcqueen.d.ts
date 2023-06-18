import { IToyAdvertisement } from './types';
import { RollableToy } from './rollable-toy';
import { IQueuePayload } from './core';
export declare class LightningMcQueen extends RollableToy {
    static advertisement: IToyAdvertisement;
    driveAsRc(heading: number, speed: number): Promise<IQueuePayload>;
}
