import { CommandGenerator, ICommandWithRaw } from "./types";
import { Stance } from "../toys/types";
declare const _default: (
  generator: CommandGenerator
) => {
  allLEDsRaw: (payload: number[]) => ICommandWithRaw;
  setBackLedIntensity: (i: number) => ICommandWithRaw;
  setMainLedBlueIntensity: (b: number) => ICommandWithRaw;
  setMainLedColor: (r: number, g: number, b: number) => ICommandWithRaw;
  setMainLedGreenIntensity: (g: number) => ICommandWithRaw;
  setMainLedRedIntensity: (r: number) => ICommandWithRaw;
  playAudioFile: (idx: number) => ICommandWithRaw;
  turnDome: (angle: Uint8Array) => ICommandWithRaw;
  setStance: (stance: Stance) => ICommandWithRaw;
  playAnimation: (animation: number) => ICommandWithRaw;
  setR2D2LEDColor: (r: number, g: number, b: number) => ICommandWithRaw;
  setR2D2FrontLEDColor: (r: number, g: number, b: number) => ICommandWithRaw;
  setR2D2BackLEDcolor: (r: number, g: number, b: number) => ICommandWithRaw;
  setR2D2HoloProjectorIntensity: (i: number) => ICommandWithRaw;
  setR2D2LogicDisplaysIntensity: (i: number) => ICommandWithRaw;
  setR2D2Waddle: (waddle: number) => ICommandWithRaw;
  playR2D2Sound: (hex1: number, hex2: number) => ICommandWithRaw;
  startIdleLedAnimation: () => ICommandWithRaw;
  setAudioVolume: (vol: number) => ICommandWithRaw;
};
export default _default;
