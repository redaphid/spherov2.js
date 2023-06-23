import { Characteristic, Peripheral } from '@abandonware/noble';
import { DriveFlag, ICommandWithRaw, SensorData } from '../commands/types';
import { Stance, APIVersion } from './types';
export interface IReExport {
  a: Stance;
  b: DriveFlag;
}
export declare const commandsType: {
  api: {
    echo: () => ICommandWithRaw;
  };
  driving: {
    drive: (
      speed: number,
      heading: number,
      flags: DriveFlag[]
    ) => ICommandWithRaw;
    driveAsRc: (heading: number, speed: number) => ICommandWithRaw;
  };
  power: {
    batteryVoltage: () => ICommandWithRaw;
    sleep: () => ICommandWithRaw;
    something2: () => ICommandWithRaw;
    something3: () => ICommandWithRaw;
    something4: () => ICommandWithRaw;
    wake: () => ICommandWithRaw;
  };
  somethingApi: {
    something5: () => ICommandWithRaw;
  };
  systemInfo: {
    appVersion: () => ICommandWithRaw;
    something: () => ICommandWithRaw;
    something6: () => ICommandWithRaw;
    something7: () => ICommandWithRaw;
  };
  userIo: {
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
    setR2D2FrontLEDColor: (r: number, g: number, b: number) => ICommandWithRaw
    /**
     * Wakes up the toy from sleep mode
     */;
    setR2D2BackLEDcolor: (r: number, g: number, b: number) => ICommandWithRaw;
    setR2D2HoloProjectorIntensity: (i: number) => ICommandWithRaw;
    setR2D2LogicDisplaysIntensity: (i: number) => ICommandWithRaw;
    setR2D2Waddle: (waddle: number) => ICommandWithRaw;
    playR2D2Sound: (hex1: number, hex2: number) => ICommandWithRaw;
    startIdleLedAnimation: () => ICommandWithRaw;
    setAudioVolume: (vol: number) => ICommandWithRaw;
  };
  sensor: {
    enableCollisionAsync: () => ICommandWithRaw;
    configureCollision: (
      xThreshold: number,
      yThreshold: number,
      xSpeed: number,
      ySpeed: number,
      deadTime: number,
      method?: number
    ) => ICommandWithRaw;
    sensorMask: (
      sensorRawValue: number,
      streamingRate: number
    ) => ICommandWithRaw;
    sensorMaskExtended: (mask: number) => ICommandWithRaw;
  };
};
export declare const decodeType: {
  add(byte: number): number | void;
};
export interface IQueuePayload {
  command: ICommandWithRaw;
  characteristic?: Characteristic;
}
export declare enum Event {
  onCollision = 'onCollision',
  onSensor = 'onSensor',
}
export declare class Core {
  protected maxVoltage: number;
  protected minVoltage: number;
  protected apiVersion: APIVersion;
  protected commands: typeof commandsType;
  private peripheral;
  private apiV2Characteristic?;
  private dfuControlCharacteristic?;
  private subsCharacteristic?;
  private antiDoSCharacteristic?;
  private decoder;
  private started;
  private queue;
  private initPromise;
  private initPromiseResolve;
  private eventsListeners;
  private sensorMask;
  constructor(p: Peripheral);
  /**
   * Determines and returns the current battery charging state
   */
  batteryVoltage(): Promise<number>;
  /**
   * returns battery level from [0, 1] range.
   * Child class must implement max voltage and min voltage to get
   * correct %
   */
  batteryLevel(): Promise<number>;
  /**
   * Wakes up the toy from sleep mode
   */
  wake(): Promise<IQueuePayload>;
  /**
   * Sets the to into sleep mode
   */
  sleep(): Promise<IQueuePayload>;
  /**
   * Starts the toy
   */
  start(): Promise<void>;
  /**
   * Determines and returns the system app version of the toy
   */
  appVersion(): Promise<{
    major: number;
    minor: number;
  }>;
  on(eventName: Event, handler: (command: SensorData) => void): void;
  destroy(): Promise<void>;
  configureSensorStream(): Promise<void>;
  enableCollisionDetection(): Promise<IQueuePayload>;
  configureCollisionDetection(
    xThreshold?: number,
    yThreshold?: number,
    xSpeed?: number,
    ySpeed?: number,
    deadTime?: number,
    method?: number
  ): Promise<IQueuePayload>;
  protected queueCommand(command: ICommandWithRaw): Promise<IQueuePayload>;
  private init;
  private onExecute;
  private match;
  private bindServices;
  private bindListeners;
  private onPacketRead;
  private eventHandler;
  private handleCollision;
  private handleSensorUpdate;
  private onApiRead;
  private onApiNotify;
  private onDFUControlNotify;
  private write;
}
