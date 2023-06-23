import { starter } from "./utils/starter";
import { Utils } from "../../lib";
import { exit } from "shelljs";
import { RollableToy } from "../../lib";

export const wakeSleep = async (toy: RollableToy) => {
  await toy.setMainLedColor(255, 0, 0);
  await toy.setMainLedColor(0, 0, 255);
  await Utils.wait(2000);
  await toy.sleep();
  await toy.destroy();
  exit(0);
};

starter(wakeSleep);
