import { IToyAdvertisement, APIVersion } from "./types"
import { RollableToy } from "./rollable-toy"

export class SpheroBolt extends RollableToy {
  public static advertisement: IToyAdvertisement = {
    name: "Sphero Bolt",
    prefix: "SB-",
    class: SpheroBolt,
  }

  protected maxVoltage = 3.9
  protected minVoltage = 3.55
  protected apiVersion: APIVersion = APIVersion.V21
}
