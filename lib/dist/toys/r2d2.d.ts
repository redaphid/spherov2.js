import { IToyAdvertisement, Stance } from './types';
import { RollableToy } from './rollable-toy';
import { IQueuePayload } from './core';
export declare class R2D2 extends RollableToy {
  static advertisement: IToyAdvertisement;
  protected maxVoltage: number;
  protected minVoltage: number;
  wake(): Promise<IQueuePayload>;
  sleep(): Promise<IQueuePayload>;
  playAudioFile(idx: number): Promise<IQueuePayload>;
  turnDome(angle: number): Promise<IQueuePayload>;
  setStance(stance: Stance): Promise<IQueuePayload>;
  playAnimation(animation: number): Promise<IQueuePayload>;
  setR2D2LEDColor(r: number, g: number, b: number): Promise<IQueuePayload>;
  setR2D2FrontLEDColor(r: number, g: number, b: number): Promise<IQueuePayload>;
  setR2D2BackLEDcolor(r: number, g: number, b: number): Promise<IQueuePayload>;
  setR2D2LogicDisplaysIntensity(i: number): Promise<IQueuePayload>;
  setR2D2HoloProjectorIntensity(i: number): Promise<IQueuePayload>;
  startIdleLedAnimation(): Promise<IQueuePayload>;
  playR2D2Sound(hex1: number, hex2: number): Promise<IQueuePayload>;
  setAudioVolume(vol: number): Promise<IQueuePayload>;
  private calculateDomeAngle;
  private static hobIndex;
}
