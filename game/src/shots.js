// Deterministic screenshot scenes: ?shot=cover|cockpit|landing|complete with
// &seed=N stages the game at a busy, readable moment and flies it forward
// with a scripted autopilot, so the same seed always paints the same frame.
// The cover must show, in one frame: chase view, aircraft, lit instruments,
// a ring and a runway ahead, altitude + speed + heading on the HUD.
import { missionById } from './missions.js';
import { islandByName } from './terrain.js';
import { AIRCRAFT } from './config.js';

export const SHOT_SCENES = {
  cover: { mission: 'ring-rally', camera: 'chase', frames: 120 },
  cockpit: { mission: 'first-hop', camera: 'cockpit', frames: 240 },
  landing: { mission: 'first-hop', camera: 'chase', frames: 180 },
  complete: { mission: 'first-hop', camera: 'chase', frames: 60 },
};

function aircraftSpec(id) {
  return AIRCRAFT.find((spec) => spec.id === id) ?? AIRCRAFT[0];
}

// Places the aircraft and mission for the shot, and returns the scripted
// autopilot: a pure function of the frame number, so replays are identical.
// heightAt, when given, snaps a parked aircraft onto the ground.
export function stageShotScene(shotName, aircraft, missionRun, rings, heightAt) {
  const scene = SHOT_SCENES[shotName] ?? SHOT_SCENES.cover;
  const mission = missionById(scene.mission);
  if (shotName === 'cover') {
    const ring = rings[0];
    const prev = rings[rings.length - 1];
    const courseX = ring.x - prev.x;
    const courseZ = ring.z - prev.z;
    const courseLength = Math.hypot(courseX, courseZ);
    aircraft.spec = aircraftSpec('tern');
    aircraft.x = ring.x - (courseX / courseLength) * 280;
    aircraft.z = ring.z - (courseZ / courseLength) * 280;
    aircraft.y = ring.y + 25;
    aircraft.heading = Math.atan2(-(ring.x - aircraft.x), -(ring.z - aircraft.z));
    aircraft.pitch = -0.02;
    aircraft.roll = 0.06;
    aircraft.speed = 88;
    aircraft.throttle = 0.78;
    aircraft.fuel = 82;
    aircraft.damage = 4;
    aircraft.onGround = false;
    missionRun.ringsPassed = 0;
    return {
      camera: 'chase',
      frames: scene.frames,
      autopilot() {
        // Straight at the ring: no bank, no pitch change, so the ring stays
        // dead ahead and the staged frame catches it large in front.
        return { throttleDelta: 0, pitch: 0, roll: 0 };
      },
    };
  }
  if (shotName === 'cockpit') {
    const palmrest = islandByName('Palmrest');
    const kalo = islandByName('Kalo');
    aircraft.spec = aircraftSpec('kite');
    aircraft.x = kalo.x + 900;
    aircraft.z = kalo.z + 700;
    aircraft.y = 190;
    aircraft.heading = Math.atan2(-(palmrest.x - aircraft.x), -(palmrest.z - aircraft.z));
    aircraft.pitch = -0.03;
    aircraft.roll = -0.05;
    aircraft.speed = 62;
    aircraft.throttle = 0.7;
    aircraft.fuel = 74;
    aircraft.damage = 0;
    aircraft.onGround = false;
    return {
      camera: 'cockpit',
      frames: scene.frames,
      autopilot() {
        return { throttleDelta: 0, pitch: -0.02, roll: 0.04 };
      },
    };
  }
  if (shotName === 'landing') {
    const tidepool = islandByName('Tidepool');
    const heading = tidepool.stripHeading;
    // Higher final approach, like the cover's geometry (which renders
    // cleanly): the strip and the volcano ahead, the aircraft centred.
    const approachX = tidepool.x - Math.cos(heading) * 450;
    const approachZ = tidepool.z - Math.sin(heading) * 450;
    aircraft.spec = aircraftSpec('gull');
    aircraft.x = approachX;
    aircraft.z = approachZ;
    aircraft.y = 130;
    aircraft.heading = Math.atan2(-Math.cos(heading), -Math.sin(heading));
    aircraft.pitch = -0.05;
    aircraft.roll = 0;
    aircraft.speed = 46;
    aircraft.throttle = 0.36;
    aircraft.fuel = 58;
    aircraft.damage = 8;
    aircraft.gearDown = true;
    aircraft.onGround = false;
    return {
      camera: 'chase',
      frames: scene.frames,
      autopilot(frame) {
        // Steady descent on final; a touch of flare at the end.
        const flare = frame > 140 ? 0.06 : -0.05;
        return { throttleDelta: frame > 140 ? -0.3 : 0, pitch: flare, roll: 0 };
      },
    };
  }
  // complete: parked on the Tidepool strip after a finished First Hop.
  const tidepool = islandByName('Tidepool');
  aircraft.spec = aircraftSpec('kite');
  aircraft.x = tidepool.x;
  aircraft.z = tidepool.z;
  aircraft.y = heightAt ? heightAt(tidepool.x, tidepool.z) + 2.1 : 60;
  aircraft.heading = tidepool.stripHeading;
  aircraft.pitch = 0;
  aircraft.roll = 0;
  aircraft.speed = 0;
  aircraft.throttle = 0;
  aircraft.fuel = 61;
  aircraft.damage = 0;
  aircraft.onGround = true;
  aircraft.landed = true;
  missionRun.done = true;
  missionRun.score = 214;
  missionRun.log.push('Landed at Tidepool', 'Mail delivered');
  return {
    camera: 'chase',
    frames: scene.frames,
    autopilot() {
      return { throttleDelta: 0, pitch: 0, roll: 0 };
    },
  };
}
