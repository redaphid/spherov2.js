import { SpheroMini, Utils, Event } from '../../lib';
import { starter } from './utils/starter';
const cmdPlay = (toy: SpheroMini) => {
  toy.configureSensorStream()
  toy.on(Event.onSensor, (d) => {
    let data = d as any
    console.log(data.locator?.position)
  })
};

starter(cmdPlay);
