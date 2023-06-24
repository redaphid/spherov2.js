import { emitKeypressEvents } from "readline";
import { stdin } from "process";

import { SpheroMini, Event } from "../../lib";
import { starter } from "./utils/starter";

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const cmdPlay = async (toy: SpheroMini) => {
  let waitTime = 1;
  let flashlight = false;
  const collisionTimeout = 100;
  let timeSinceLastCollision = 9999;

  let heading = 0;
  let isHeadingLocked = false;
  let lockedHeading = 0;

  let speed = 0;
  let isSpeedLocked = false;
  let lockedSpeed = 0;

  let isRandomLocked = false;
  let lockedRandom = 0;

  let isCooldownLocked = false;
  let cooldown = 0;
  let lockedCooldown = 0;

  const random = (min: number = 0, max: number = 1) => {
    let randomValue = isRandomLocked ? lockedRandom : Math.random();
    lockedRandom = randomValue;
    return randomValue * (max - min) + min;
  };

  await toy.configureCollisionDetection();

  const loop = async () => {
    timeSinceLastCollision += waitTime;
    if (cooldown > 0) return (cooldown -= waitTime);

    if (random() < 0.001) return cooldown = 1000; // randomly sleep
    if (random() < 0.005) speed = 25; // randomly speed up
    if (random() < 0.01) heading += 200; // randomly turn around

    if (timeSinceLastCollision > collisionTimeout) {
      speed = Math.max(0, speed - 1);
      heading += random(-10, 10); // jitter around if we're not running away from a collision
      if (speed > 0) {
        toy.setMainLedColor(0, 255, 0); // green
      }
      else {
        toy.setMainLedColor(0, 0, 255); // blue
      }
    }
    heading = Math.floor(heading % 360)
    if (heading < 0) heading += 360
  };

  const collide = () => {
    if (timeSinceLastCollision < 100) return; // ignore collisions that are too close together
    timeSinceLastCollision = 0;
    speed = 100
    heading += 180; //turn around
    cooldown = 0; // stop idling
    // turn the led red
    toy.setMainLedColor(255, 0, 0);
  };

  toy.on(Event.onCollision, collide);

  if (stdin.setRawMode) stdin.setRawMode(true);
  emitKeypressEvents(stdin);
  const turningSpeed = 10;
  stdin.on("keypress", (ch, { name: key, ctrl, shift }) => {
    const keyToActionMap = {
      c: () => {
        if (ctrl) process.exit();
        collide();
      },
      q: () => {
        toy.setMainLedColor(0, 0, 0);
        if (ctrl) return isCooldownLocked = !isCooldownLocked;
        let increment = 100;
        if (shift) increment *= 5;
        cooldown += increment;
        lockedCooldown = cooldown;
      },
      e: () => {
        toy.setMainLedColor(0, 0, 0);
        if (ctrl) return isCooldownLocked = !isCooldownLocked;
        let increment = 100;
        if (shift) increment *= 5;
        cooldown -= increment;
        lockedCooldown = cooldown;
      },

      z: () => {
        if (ctrl) return (isRandomLocked = !isRandomLocked);
        let increment = 0.005;
        if (shift) increment *= 5;
        lockedRandom += increment;
      },
      x: () => {
        if (ctrl) return (isRandomLocked = !isRandomLocked);
        let increment = 0.005;
        if (shift) increment *= 5;
        lockedRandom -= increment;
      },
      w: () => {
        if (ctrl) return (isSpeedLocked = !isSpeedLocked);
        let increment = 10;
        if (shift) increment *= 5;
        speed += increment;
        lockedSpeed = speed;
      },
      s: () => {
        if (ctrl) return (isSpeedLocked = !isSpeedLocked);
        let increment = 10;
        if (shift) increment *= 5;
        speed -= increment;
        lockedSpeed = speed;
      },
      a: () => {
        if (ctrl) return (isHeadingLocked = !isHeadingLocked);
        let increment = turningSpeed;
        if (shift) increment *= 5;
        heading -= increment;
        lockedHeading = heading;
      },

      d: () => {
        if (ctrl) return (isHeadingLocked = !isHeadingLocked);
        let increment = turningSpeed;
        if (shift) increment *= 5;
        heading += increment;
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

  while (true) {
    await timeout(waitTime);
    // clear the console
    try {
      await loop();

      if (isSpeedLocked) speed = lockedSpeed;
      if (isHeadingLocked) heading = lockedHeading;
      if (isCooldownLocked) cooldown = lockedCooldown;

      await toy.roll(speed > 0 ? speed * 10 + 100 : 0, heading, []);
    } catch (e) {
      console.log(e);
      cooldown = 100;
    }
    console.clear();
    console.table({
      heading: { value: heading, locked: isHeadingLocked },
      speed: { value: speed, locked: isSpeedLocked },
      cooldown: { value: cooldown, locked: isCooldownLocked },
      random: { value: parseFloat(lockedRandom.toFixed(4)), locked: isRandomLocked },
      timeSinceLastCollision: { value: timeSinceLastCollision, locked: false },
    });
  }
};

starter(cmdPlay);
