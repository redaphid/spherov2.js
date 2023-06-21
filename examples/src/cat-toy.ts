import { SpheroMini, Utils, Event, SensorData } from 'spherov2.js';
import { starter } from './utils/starter';

const MOVE_TIME = 100;
const WAIT_TIME = 2000;
const SPEED = 100;
export const catToy = async (toy: SpheroMini): Promise<void> => {
  // eslint-disable-next-line no-constant-condition

  toy.configureSensorStream();
  let initialX = undefined;
  let initialY = undefined;
  toy.on(Event.onSensor, (data: SensorData) => {
    initialX = data.locator.position.x;
    initialY = data.locator.position.y;
  });
  console.log({ realInitialX: initialX, realInitialY: initialY });

  while (true) {
    //move randomly
    // await toy.rollTime(100, 270, 1000, []);
    // await toy.rollTime(SPEED, Math.floor(Math.random() * 360), 1000, []);

    await toy.rollTime(SPEED, 270, MOVE_TIME, []);

    // await Utils.wait(5000);

    //when it hits something, move away

    toy.configureCollisionDetection();
    // toy.on(Event.onCollision, () => {
    //   await toy.rollTime(SPEED, 90, MOVE_TIME, []);
    // });

    //SensorData is the correct type here, their types are wrong
    toy.on(Event.onSensor, (data: SensorData) => {
      console.log({ initialX, initialY });
      console.log({ x: data.locator.position.x, y: data.locator.position.y });
      //move back to x and y coordinates if it's moved 5 units away
      if (
        Math.abs(data.locator.position.x) - Math.abs(initialX) > 20 ||
        Math.abs(data.locator.position.y) - Math.abs(initialY) > 20
      ) {
        console.log('moving back');

        toy.rollTime(SPEED, 90, MOVE_TIME, []);
      }
    });
  }
};

starter(catToy);
