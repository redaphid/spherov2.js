import { Event, Utils, SensorData, RollableToy } from '../../lib';
import { starter } from './utils/starter';

const main = async (sphero: RollableToy) => {
  await sphero.configureSensorStream();
  // await sphero.enableCollisionDetection();

  console.log('Sensor enabled');

  // sphero.on(Event.onCollision, (command: ICommandWithRaw) => {
  //
  //   console.log('Sensor Read', command);
  // });

  sphero.on(Event.onSensor, (command: SensorData) => {
    console.log('onSensor', command);
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await Utils.wait(1000);
  }
};

starter(main);
