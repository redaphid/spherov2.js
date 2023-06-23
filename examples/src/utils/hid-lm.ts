import nimbus, { IControllerState } from "./nimbus";
import { LightningMcQueen, Utils } from "../../lib";

let state: IControllerState;
nimbus.onChanged((_state) => {
  state = _state;
});

export default nimbus;

// SORRY FOR THIS CODE, It is my playground for now
export const hid = async (toy: LightningMcQueen) => {
  // let stopped = false;
  let heading: number;

  const loop = async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (state) {
        const { x } = state.leftStick;
        const pos = state.r2 / 255;
        const neg = (-1 * state.l2) / 255;
        // const currentSpeed = module * 255;
        heading = isNaN(x) ? 0 : x;

        // if (currentSpeed > 0) {
        //   stopped = false;
        // }

        // console.log(pos + neg);
        toy.driveAsRc(heading, pos + neg);

        // if (currentSpeed === 0) {
        //   stopped = true;
        // }
      }
      await Utils.wait(80);
    }
  };

  await loop();
};
