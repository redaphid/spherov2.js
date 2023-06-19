import { Toys, Scanner, Core } from '../../../lib';

const robot = `SM-`;
export const starter = async <T extends Core>(fn: (sphero: T) => void) => {
  console.log(process.argv[2]);
  console.log(`Looking for ${robot}...`);
  const adv = Toys.find((toy) => toy.prefix === robot);
  console.log({ adv });
  const sphero = await Scanner.find<T>(adv);
  if (sphero) {
    fn(sphero);
  }
  return sphero;
};
