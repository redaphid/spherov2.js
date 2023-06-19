import { Scanner, Stance, Utils } from '../../lib';

const WAIT_TIME = 1000;

const main = async () => {
  const r2d2 = await Scanner.findR2D2();
  if (r2d2) {
    await r2d2.wake();
    await r2d2.turnDome(90);
    await Utils.wait(WAIT_TIME);
    await r2d2.turnDome(-90);
    await Utils.wait(WAIT_TIME);
    await r2d2.playAnimation(2);
    await Utils.wait(5 * WAIT_TIME);
    await r2d2.setStance(Stance.tripod);
    await Utils.wait(5 * WAIT_TIME);
    await r2d2.playAudioFile(3);
    await r2d2.setStance(Stance.bipod);
    await Utils.wait(5 * WAIT_TIME);
    await r2d2.playAnimation(5);
    await r2d2.sleep();
  }
};

main();
