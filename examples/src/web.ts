import { Toys, Scanner, Core } from "../../lib";
import { patrol } from "./utils/patrol";

const robot = `SB-`;
export const starter = async <T extends Core>(fn: (sphero: T) => void) => {
  const adv = Toys.find((toy) => toy.prefix === robot);
  const sphero = await Scanner.find<T>(adv);
  if (sphero) {
    fn(sphero);
  }
};

document.querySelector("button").onclick = () => {
  starter(patrol);
};
