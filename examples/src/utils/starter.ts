import { Toys, Scanner, Core } from 'spherov2.js';

const robot = `${process.argv[2]}-`;
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
