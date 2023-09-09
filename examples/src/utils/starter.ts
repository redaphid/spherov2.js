import { Scanner, Core, SpheroMini } from "../../../lib";

const robotName = process.env.ROBOT_NAME || undefined;
const robotRegistry = {
  "c75d2e4ee665d78e80853548bacfac01": "bubble",
  "bc6ce81a687119e1c81a56ef58d59dbd": "gum",
}

export const starter = async <T extends Core>(fn: (sphero: T) => void) => {
  const findAndStart = async () => {
    const spheros = await Scanner.findAll(SpheroMini.advertisement);
    for (const sphero of spheros) {
      console.log(`found: ${robotRegistry[sphero.id] || sphero.id}`);
      if (robotName) {
        if (sphero.id === robotName || robotRegistry[sphero.id] === robotName) {
          fn(sphero);
          break;
        }
        continue;
      }
      fn(sphero);
      break;
    }
    console.log('rescanning');
    setTimeout(findAndStart, 100);
  }
  findAndStart();
};
