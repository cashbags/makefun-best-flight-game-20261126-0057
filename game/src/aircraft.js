// The aircraft: a mesh built from primitives (a fuselage, wings, a tail, a
// spinning prop, floats of livery paint) and the arcade flight model that
// flies it — throttle, lift, stall, fuel burn and damage on hard contact.
import * as THREE from 'three';

export function buildAircraftMesh(spec) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: spec.color });
  const trim = new THREE.MeshLambertMaterial({ color: spec.trim });
  const dark = new THREE.MeshLambertMaterial({ color: 0x23262b });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd8e8, emissive: 0x1a3a44 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.75, 7.4, 12), paint);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.2, 12), trim);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = -4.8;
  group.add(nose);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.scale.set(1, 0.72, 1.9);
  canopy.position.set(0, 0.75, -1.4);
  group.add(canopy);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.28, 2.4), trim);
  wing.position.set(0, 0.1, -0.4);
  group.add(wing);
  const wingTipLeft = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 2.4), paint);
  wingTipLeft.position.set(-6.9, 0.1, -0.4);
  group.add(wingTipLeft);
  const wingTipRight = wingTipLeft.clone();
  wingTipRight.position.x = 6.9;
  group.add(wingTipRight);
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), trim);
  tailWing.position.set(0, 0.35, 3.4);
  group.add(tailWing);
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.3, 1.7), paint);
  tailFin.position.set(0, 1.2, 3.4);
  group.add(tailFin);
  const propHub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 8), dark);
  propHub.rotation.x = Math.PI / 2;
  propHub.position.z = -6.0;
  group.add(propHub);
  const prop = new THREE.Group();
  const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0x1c1e22, transparent: true, opacity: 0.85 });
  for (const angle of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.6, 0.12), bladeMaterial);
    blade.rotation.z = angle;
    prop.add(blade);
  }
  prop.position.z = -6.4;
  group.add(prop);
  for (const [x, z] of [[-1.1, 1.6], [1.1, 1.6], [0, 3.1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    leg.position.set(x, -1.4, z);
    group.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -1.95, z);
    group.add(wheel);
  }
  const navLeft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4444 }));
  navLeft.position.set(-6.9, 0.1, -0.4);
  group.add(navLeft);
  const navRight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0x44ff88 }));
  navRight.position.set(6.9, 0.1, -0.4);
  group.add(navRight);
  group.userData.prop = prop;
  // The chase camera sits metres behind this group, so its parts are always
  // in frame; never let a stale bounding sphere cull it out of a render.
  group.traverse((part) => { part.frustumCulled = false; });
  return group;
}

export function createAircraftState(spec, start) {
  return {
    spec,
    x: start.x,
    y: start.y,
    z: start.z,
    heading: start.heading,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: start.fuel ?? 100,
    damage: 0,
    gearDown: true,
    onGround: true,
    verticalSpeed: 0,
    engineOut: false,
    crashed: false,
    crashCause: '',
    landed: false,
    airborneOnce: false,
    distanceFlown: 0,
  };
}

// One fixed step of flight. Throttle feeds speed, pitch trades speed for
// height, roll banks the turn, and below stall speed the wing gives up and
// the aircraft sinks. Returns events the game should announce.
export function stepAircraftFlight(state, input, wind, dt, time) {
  const events = [];
  const spec = state.spec;
  if (state.crashed) return events;
  state.throttle = Math.min(1, Math.max(0, state.throttle + input.throttleDelta * dt * 0.7));
  if (state.fuel <= 0) {
    state.engineOut = true;
    state.throttle = 0;
    if (!state.warnedFuel) {
      state.warnedFuel = true;
      events.push({ kind: 'fuel-empty' });
    }
  }
  const targetSpeed = state.engineOut ? 0 : spec.maxSpeed * (0.25 + 0.75 * state.throttle);
  const accel = state.onGround ? 11 : 8;
  state.speed += Math.min(accel * dt, Math.max(-accel * dt, targetSpeed - state.speed));
  state.speed = Math.max(0, state.speed);

  const rollTarget = input.roll * 0.9;
  state.roll += (rollTarget - state.roll) * Math.min(1, dt * 3.2);
  const pitchTarget = input.pitch * 0.42;
  state.pitch += (pitchTarget - state.pitch) * Math.min(1, dt * 2.6);
  const turnRate = -Math.sin(state.roll) * 0.55 * spec.turn * Math.min(1, state.speed / spec.cruise);
  state.heading += turnRate * dt;

  const lift = state.speed > spec.stall ? 1 : Math.max(0, state.speed / spec.stall);
  const climbRate = Math.sin(state.pitch) * state.speed * lift;
  // Sink only bites in the air: wheels on the ground hold the aircraft up,
  // so a parked aircraft never "lands" on itself.
  const sinkRate = !state.onGround && state.speed < spec.stall ? (spec.stall - state.speed) * 0.55 : 0;
  state.verticalSpeed = climbRate - sinkRate;
  const forwardX = -Math.sin(state.heading);
  const forwardZ = -Math.cos(state.heading);
  const gustX = wind.gust.x * 0.12;
  const gustZ = wind.gust.z * 0.12;
  const stepX = (forwardX * Math.cos(state.pitch) * state.speed + wind.x + gustX) * dt;
  const stepZ = (forwardZ * Math.cos(state.pitch) * state.speed + wind.z + gustZ) * dt;
  state.x += stepX;
  state.z += stepZ;
  state.y += state.verticalSpeed * dt;
  state.distanceFlown += Math.hypot(stepX, stepZ);
  burnFuel(state, dt);
  return events;
}

export function burnFuel(state, dt) {
  if (state.engineOut) return;
  const burn = state.throttle * state.spec.burn * 0.055 * dt * 10;
  state.fuel = Math.max(0, state.fuel - burn);
  if (state.fuel <= 0) state.fuel = 0;
}

// Ground contact: a gentle touchdown on a strip is a landing; anything else
// hard, fast or wet is damage, and past the frame's limit is a crash.
export function resolveGroundContact(state, groundHeight, onStrip, water) {
  const events = [];
  if (state.crashed) return events;
  const gearHeight = 2.1;
  if (state.y > groundHeight + gearHeight) {
    state.onGround = false;
    state.landed = false;
    state.airborneOnce = true;
    return events;
  }
  state.y = groundHeight + gearHeight;
  state.onGround = true;
  const impact = -state.verticalSpeed;
  if (water) {
    state.crashed = true;
    state.crashCause = 'ditched in the sea';
    events.push({ kind: 'crash', cause: state.crashCause });
    return events;
  }
  if (impact > 7 || state.speed > 62) {
    const hit = (impact - 5) * 14 + Math.max(0, state.speed - 55) * 1.6;
    applyDamage(state, hit / state.spec.toughness);
    events.push({ kind: 'hard-landing', impact });
    if (state.damage >= 100) {
      state.crashed = true;
      state.crashCause = impact > 7 ? 'came down too hard' : 'ran off the ground too fast';
      events.push({ kind: 'crash', cause: state.crashCause });
    }
  } else if (state.speed < 1.5 && !state.landed && state.airborneOnce) {
    state.landed = true;
    state.airborneOnce = false;
    events.push({ kind: 'landed', onStrip, gentle: impact < 3.5 });
  }
  if (state.onGround) {
    // Rolling resistance is light; braking hard only with the throttle closed.
    const drag = state.throttle < 0.1 ? 4 : 1.2;
    state.speed = Math.max(0, state.speed - drag * (1 / 60));
    state.pitch *= 0.9;
    state.roll *= 0.85;
  }
  return events;
}

export function applyDamage(state, amount) {
  state.damage = Math.min(100, state.damage + amount);
  if (state.damage >= 100 && !state.crashed) {
    state.crashed = true;
    state.crashCause = 'airframe gave out';
  }
}

export function headingDegrees(state) {
  const degrees = ((-state.heading * 180) / Math.PI) % 360;
  return (degrees + 360) % 360;
}
