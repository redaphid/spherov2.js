import { IToyAdvertisement, APIVersion } from "./types";
import { RollableToy } from "./rollable-toy";
export declare class SpheroBolt extends RollableToy {
  static advertisement: IToyAdvertisement;
  protected maxVoltage: number;
  protected minVoltage: number;
  protected apiVersion: APIVersion;
}
