import { Scanner, Core, SpheroMini } from "../../../lib";

const robotName = process.env.ROBOT_NAME || undefined;
const robotRegistry = {
  "c75d2e4ee665d78e80853548bacfac01": "crude-dolphin",
  "bc6ce81a687119e1c81a56ef58d59dbd": "defective-bear",
}
export const starter = async <T extends Core>(fn: (sphero: T) => void) => {
  const spheros = await Scanner.findAll(SpheroMini.advertisement);
  for (const sphero of spheros) {
    if(robotRegistry[sphero.id]) {
      console.log(`Found ${robotRegistry[sphero.id]}`);
    } else {
      console.log(`unknown robot ${sphero.id}`);
    }
    if(robotName) {
      if(robotRegistry[sphero.id] === robotName) {
        fn(sphero);
        break;
      }
      continue;
    }
    fn(sphero);
    break;
  }
};
