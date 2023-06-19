import { SpheroMini, Event } from '../../lib';
import { emitKeypressEvents } from 'readline';
import { starter } from './utils/starter';

const start = (toy: SpheroMini) => {
  let pressTimeout: NodeJS.Timer;
  let heading = 0;
  let currentSpeed = 0;
  let speed = 150;
  let executing = true;
  let calibrating = false;
  let offset = 0;

  const cancelPress = () => {
    clearTimeout(pressTimeout);
    pressTimeout = null;
  };

  const addTimeout = () => {
    pressTimeout = setTimeout(() => {
      currentSpeed = 0;
    }, 500);
  };

  const onCollide = (collisionData: any) => {

  };

  const loop = async (sensorData: any) => {
    if (!executing && !calibrating) return

    if (executing) {
      toy.roll(
        currentSpeed,
        calibrating ? heading : (heading + offset) % 360,
        []
      );
    }

    if (calibrating) {
      heading += 5;
      heading %= 360
      return
    }

    if (currentSpeed === 0) {
      executing = false;
    }
  };

  const onKeyPress = async (key = '', symbol: { name?: string } = {}) => {
    key = key || symbol.name;
    cancelPress();
    const keyToActionMap = {
      up: async () => {
        heading = 0;
        currentSpeed = speed;
        executing = true;
        addTimeout();
      },
      left: async () => {
        heading = 270;
        currentSpeed = speed;
        executing = true;
        addTimeout();
      },
      right: async () => {
        heading = 90;
        currentSpeed = speed;
        executing = true;
        addTimeout();
      },
      down: async () => {
        heading = 180;
        currentSpeed = speed;
        executing = true;
        addTimeout();
      },
      q: async () => {
        speed += 10;
      },
      z: async () => {
        speed -= 10;
      },
      p: async () => {
        process.exit();
      },
      s: async () => {
        toy.sleep();
      },
      a: async () => {
        toy.wake();
      },
      c: async () => {
        if (calibrating) {
          calibrating = false;
          toy.setBackLedIntensity(0);
          offset = heading;
          heading = 0;
          return;
        }
        toy.setBackLedIntensity(255);
        currentSpeed = 0;
        executing = true;
        heading = 0;
        calibrating = true;
      }
    }
    if (keyToActionMap[key]) keyToActionMap[key]();
  };
  // set up the toy
  toy.configureSensorStream();
  toy.configureCollisionDetection();

  toy.on(Event.onSensor, loop);
  toy.on(Event.onCollision, onCollide);

  // set up the keyboard
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', onKeyPress);
  emitKeypressEvents(process.stdin);
};

starter(start);
