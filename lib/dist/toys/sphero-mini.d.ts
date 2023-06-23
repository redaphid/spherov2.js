import { IToyAdvertisement } from './types';
import { RollableToy } from './rollable-toy';
import { IQueuePayload } from './core';
export declare class SpheroMini extends RollableToy {
  static advertisement: IToyAdvertisement;
  protected maxVoltage: number;
  protected minVoltage: number;
  something1(): Promise<IQueuePayload>;
  something2(): Promise<IQueuePayload>;
  something3(): Promise<IQueuePayload>;
  something4(): Promise<IQueuePayload>;
  something5(): Promise<IQueuePayload>;
  something6(): Promise<IQueuePayload>;
  something7(): Promise<IQueuePayload>;
}
