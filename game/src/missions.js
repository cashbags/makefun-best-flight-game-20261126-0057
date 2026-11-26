// The nine missions: waypoints, ring races, deliveries, rescues and surveys.
// A mission is a list of legs; each leg completes by flying to its island and
// doing its action — land on the strip, pick someone up, or fly the survey
// height steady over the crater. Rings are their own leg, flown in order.
import { MISSIONS, RING_COUNT } from './config.js';
import { islandByName } from './terrain.js';

export function missionById(id) {
  return MISSIONS.find((mission) => mission.id === id);
}

export function createMissionRun(mission, rings) {
  return {
    mission,
    legIndex: 0,
    rings,
    ringsPassed: 0,
    startedAt: 0,
    finishedAt: 0,
    done: false,
    failed: false,
    surveyHeld: 0,
    pickupDone: false,
    score: 0,
    log: [],
  };
}

export function currentLeg(run) {
  return run.mission.legs[run.legIndex] ?? null;
}

export function currentTarget(run) {
  const leg = currentLeg(run);
  if (!leg) return null;
  if (leg.action === 'rings') {
    const ring = run.rings[run.ringsPassed];
    return ring ? { x: ring.x, y: ring.y, z: ring.z, radius: ring.radius, label: `Ring ${run.ringsPassed + 1} of ${RING_COUNT}` } : null;
  }
  const island = islandByName(leg.island);
  if (!island) return null;
  return { x: island.x, y: leg.altitude, z: island.z, radius: leg.action === 'survey' ? 260 : 120, label: `${island.name} — ${leg.action}` };
}

export function missionObjectiveText(run) {
  const leg = currentLeg(run);
  if (!leg) return 'Tour complete — head home to Kalo.';
  if (leg.action === 'rings') return `Fly ring ${run.ringsPassed + 1} of ${RING_COUNT}`;
  const island = islandByName(leg.island);
  if (leg.action === 'land') return `Land on the ${island.name} strip`;
  if (leg.action === 'pickup') return `Pick up at ${island.name} — land and stop`;
  if (leg.action === 'survey') return `Survey ${island.name} crater at ${leg.altitude} m, steady`;
  return `Fly to ${island.name}`;
}

function distance3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function advanceLeg(run, bonus, note) {
  run.score += bonus;
  run.log.push(note);
  run.legIndex += 1;
  run.surveyHeld = 0;
  if (run.legIndex >= run.mission.legs.length) {
    run.done = true;
  }
}

// Called when the aircraft touches down gently. Only a landing leg (or a
// pickup leg, which is a landing that then loads a passenger) can complete.
export function landOnStrip(run, aircraft, onStrip) {
  if (run.done || run.failed) return [];
  const leg = currentLeg(run);
  if (!leg) return [];
  const events = [];
  if (leg.action === 'land' || leg.action === 'pickup') {
    const island = islandByName(leg.island);
    const dist = Math.hypot(aircraft.x - island.x, aircraft.z - island.z);
    // Pickup legs land on the beach flat near the island, not on a strip;
    // delivery legs must find the strip.
    if (leg.action === 'land' && (dist > 420 || !onStrip)) {
      events.push({ kind: 'wrong-strip', island: island.name });
      return events;
    }
    if (leg.action === 'pickup' && dist > 420) {
      events.push({ kind: 'wrong-strip', island: island.name });
      return events;
    }
    const gentle = -aircraft.verticalSpeed < 3.5;
    const bonus = gentle ? 40 : 10;
    if (leg.action === 'pickup') {
      run.pickupDone = true;
      advanceLeg(run, 60 + bonus, `Picked up at ${island.name}`);
      events.push({ kind: 'pickup', island: island.name });
    } else {
      advanceLeg(run, run.mission.reward / run.mission.legs.length + bonus, `Landed at ${island.name}`);
      events.push({ kind: 'leg-done', island: island.name });
    }
  }
  return events;
}

export function deliverCargo(run, aircraft) {
  return landOnStrip(run, aircraft, true);
}

export function rescuePassenger(run, aircraft) {
  return landOnStrip(run, aircraft, true);
}

// Per-frame mission progress: rings flown in order, survey height held over a
// crater, and the tour's strip landings (handled by landOnStrip).
export function updateMissionProgress(run, aircraft, dt) {
  if (run.done || run.failed) return [];
  const leg = currentLeg(run);
  if (!leg) return [];
  const events = [];
  if (leg.action === 'rings') {
    const ring = run.rings[run.ringsPassed];
    if (ring) {
      const dist = distance3(aircraft, ring);
      if (dist < ring.radius) {
        run.ringsPassed += 1;
        run.score += 25;
        events.push({ kind: 'ring', number: run.ringsPassed, total: RING_COUNT });
        if (run.ringsPassed >= RING_COUNT) {
          advanceLeg(run, 80, 'Ring rally complete');
          events.push({ kind: 'leg-done', island: 'the rally course' });
        }
      }
    }
    return events;
  }
  if (leg.action === 'survey') {
    const island = islandByName(leg.island);
    const horizontal = Math.hypot(aircraft.x - island.x, aircraft.z - island.z);
    const heightOk = Math.abs(aircraft.y - leg.altitude) < 45 && Math.abs(aircraft.verticalSpeed) < 4;
    if (horizontal < 260 && heightOk && aircraft.speed > 30) {
      run.surveyHeld += dt;
      if (run.surveyHeld > 4) {
        advanceLeg(run, 70, `Surveyed ${island.name} crater`);
        events.push({ kind: 'survey', island: island.name });
      }
    } else {
      run.surveyHeld = Math.max(0, run.surveyHeld - dt * 2);
    }
    return events;
  }
  return events;
}

export function startRingRace(run) {
  run.ringsPassed = 0;
  run.log.push('Ring rally started — eight rings, in order.');
}
