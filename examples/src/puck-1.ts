import { emitKeypressEvents } from 'readline';
import { stdin } from 'process';

import { SpheroMini, Event } from '../../lib';
import { starter } from './utils/starter';
const timeout = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
const cmdPlay = async (toy: SpheroMini) => {
  let waitTime = 1;
  let flashlight = false;
  const collisionTimeout = 100;
  let timeSinceLastCollision = 9999;
  let heading = 0;

  let isHeadingLocked = false;
  let lockedHeading = 0;

  let isSpeedLocked = false;
  let lockedSpeed = 0;

  let isRandomLocked = false;
  let lockedRandom = 0;
  let speed = 0;
  let cooldown = 0;

  const random = (min: number = 0, max: number = 1) => {
    let randomValue = Math.random();
    if (isRandomLocked) {
      randomValue = lockedRandom;
    }
    return randomValue * (max - min) + min;
  };

  await toy.configureCollisionDetection();

  const loop = async () => {
    try {
      timeSinceLastCollision += waitTime;
      if (cooldown > 0) {
        cooldown -= waitTime;
        await timeout(waitTime);
        loop();
        return;
      }
      if (speed > 0) {
        // move mode
        console.log({ speed, heading });
        speed -= waitTime;
        if (timeSinceLastCollision > collisionTimeout)
          toy.setMainLedColor(0, 255, 0); // show green (move mode)
      } else {
        if (timeSinceLastCollision > collisionTimeout) {
          await toy.setMainLedColor(0, 0, 255); // show blue (idle mode)
          if (random() < 0.001) {
            cooldown = 5000; // 1% of the time, stop for 5 seconds
            await toy.setMainLedColor(0, 0, 0); // light goes out (dead mode)
          }
        }
      }

      if (timeSinceLastCollision > collisionTimeout) heading += random(-10, 10); // jiggle if we haven't collided recently
      if (random() < 0.01) heading += 200; // randomly turn around some of the time
      heading = Math.abs(Math.floor(heading % 360) || 0); // keep heading between 0 and 360

      if (random() < 0.01) speed = 25; // randomly start moving some of the time
      let speedToGo = speed > 0 ? speed * 10 + 100 : 0; // if we weren't moving, don't move
      if (timeSinceLastCollision < collisionTimeout) speedToGo = 1000; // if we've collided recently, go fast
      await toy.roll(speedToGo, heading, []);
    } catch (e) {
      console.log(e);
      cooldown = 100;
    }
    await timeout(waitTime);
    loop();
  };
  const collide = () => {
    if (timeSinceLastCollision < 100) return; // ignore collisions that are too close together
    speed = 500; // if we collide, speed up by 500. this will switch us to "move mode"
    heading += 180; // and turn around
    timeSinceLastCollision = 0;
    cooldown = 0; // stop idling
    // turn the led red
    console.log('COLLISION');
    toy.setMainLedColor(255, 0, 0);
  };
  toy.on(Event.onCollision, collide);

  // try to "sort of" control the sphere with the keyboard
  const intervalTimes = (time: number, fn: () => void) => {
    if (time <= 0) return;
    fn();
    setTimeout(() => intervalTimes(time - 1, fn), time - 1);
  };
  stdin.setRawMode(true);
  emitKeypressEvents(stdin);
  // suppress keypresses from being printed to the terminal
  setInterval(() => {
    if (isHeadingLocked) heading = lockedHeading;
  }, 100);
  setInterval(() => {
    if (isSpeedLocked) speed = lockedSpeed;
  }, 100);
  const turningSpeed = 23;
  stdin.on('keypress', (ch, { name: key, ctrl }) => {
    const keyToActionMap = {
      c: () => {
        if (ctrl) process.exit();
        collide();
      },
      l: () => {
        //lock(ish) the heading
        isHeadingLocked = !isHeadingLocked;
        console.log({ isHeadingLocked });
        lockedHeading = heading;
      },
      q: () => {
        // lock(ish) the speed
        isSpeedLocked = !isSpeedLocked;
        console.log({ isSpeedLocked });
        lockedSpeed = speed;
      },
      s: () => {
        // sleep
        console.log('sleep');
        toy.setMainLedColor(0, 0, 0);
        cooldown = 5000;
      },
      space: () => {
        isRandomLocked = !isRandomLocked;
        console.log({ isRandomLocked });
      },
      z: () => {
        lockedRandom += 0.001;
        console.log({ lockedRandom });
      },
      x: () => {
        lockedRandom -= 0.001;
        console.log({ lockedRandom });
      },
      w: () => {
        console.log(`speed going from ${speed} to ${speed + 10}`);
        speed += 10;
        lockedSpeed = speed;
      },

      a: () => {
        console.log(
          `heading going from ${heading} to ${heading - turningSpeed}`
        );
        heading -= turningSpeed;
        lockedHeading = heading;
      },
      d: () => {
        console.log(
          `heading going from ${heading} to ${heading + turningSpeed}`
        );
        heading += turningSpeed;
        lockedHeading = heading;
      },
      r: () => {
        // turn around
        heading += 180;
      },
      f: () => {
        if (flashlight) {
          toy.setBackLedIntensity(0);
        } else {
          toy.setBackLedIntensity(255);
        }
        flashlight = !flashlight;
      },
    };
    if (keyToActionMap[key]) keyToActionMap[key]();
  });

  loop();
};

starter(cmdPlay);
