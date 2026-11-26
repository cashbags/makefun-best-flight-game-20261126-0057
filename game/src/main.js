// Emberwing Air — boot and the one loop. Screens: title (mission + aircraft
// pick), briefing, play, paused, complete, crashed. Flight advances in fixed
// 1/60 s steps; ?shot=cover|cockpit|landing|complete stages a deterministic
// scene instead and sets window.__shotReady when it is painted.
import { AIRCRAFT, FIXED_STEP, MISSIONS, START_ISLAND, WORLD_SEED } from './config.js';
import { buildArchipelago, buildRaceRings, buildWaypointBeacon, createHeightSampler, islandByName, islandStripAt } from './terrain.js';
import { buildAircraftMesh, createAircraftState, resolveGroundContact, stepAircraftFlight } from './aircraft.js';
import { createWeatherFront } from './weather.js';
import { createFlightInput, ACTION_CAMERA, ACTION_CONFIRM, ACTION_GEAR, ACTION_MUTE, ACTION_PAUSE } from './input.js';
import { createFlightAudio } from './audio.js';
import { createHud } from './hud.js';
import { createFlightRenderer, renderFlightFrame, updateFlightCamera } from './render.js';
import { createMissionRun, currentTarget, landOnStrip, missionById, startRingRace, updateMissionProgress } from './missions.js';
import { stageShotScene } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : WORLD_SEED;
const selectedMissionParam = params.get('mission');

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const hud = createHud();
const input = createFlightInput();
const audio = createFlightAudio();
const sampler = createHeightSampler();
const flightRenderer = createFlightRenderer(canvas, 'day');
const rings = buildRaceRings(flightRenderer.scene);
const beacon = buildWaypointBeacon(flightRenderer.scene);
buildArchipelago(flightRenderer.scene, sampler);

let screen = 'title';
let selectedMission = missionById(selectedMissionParam) ?? MISSIONS[0];
let selectedAircraft = selectedMission.aircraft;
let missionRun = createMissionRun(selectedMission, rings);
let weather = createWeatherFront(selectedMission.weather, seed);
let aircraft = createAircraftState(AIRCRAFT[0], startPose());
let aircraftMesh = buildAircraftMesh(AIRCRAFT[0]);
flightRenderer.scene.add(aircraftMesh);
let cameraMode = 'chase';
let careerScore = 0;
let bestScore = readBest();
let shot = null;
let shotFrame = 0;
let elapsed = 0;
let accumulator = 0;
let lastTime = performance.now();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem('emberwing-best') ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  try {
    window.localStorage.setItem('emberwing-best', String(bestScore));
  } catch {
    // Storage unavailable; the score still shows this session.
  }
}

function startPose() {
  const island = islandByName(START_ISLAND);
  return {
    x: island.x,
    y: sampler.stripHeight(island) + 2.1,
    z: island.z,
    heading: island.stripHeading,
    fuel: 100,
  };
}

function aircraftSpec(id) {
  return AIRCRAFT.find((spec) => spec.id === id) ?? AIRCRAFT[0];
}

function showScreen(name) {
  screen = name;
  for (const id of ['screen-title', 'screen-briefing', 'screen-pause', 'screen-complete', 'screen-crash']) {
    const element = document.getElementById(id);
    if (element) element.style.display = id === `screen-${name}` ? 'flex' : 'none';
  }
  const hudElement = document.getElementById('hud');
  if (hudElement) hudElement.style.display = name === 'play' || name === 'paused' ? 'block' : 'none';
  if (statusLine) statusLine.textContent = `Emberwing Air — ${name}`;
}

function buildMissionList() {
  const list = document.getElementById('mission-list');
  if (!list) return;
  list.innerHTML = '';
  for (const mission of MISSIONS) {
    const button = document.createElement('button');
    button.className = 'mission-card';
    button.innerHTML = `<b>${mission.name}</b><span>${mission.briefing}</span><i>${mission.kind} · ${mission.weather} · ${mission.time} · ★ ${mission.reward}</i>`;
    button.addEventListener('click', () => {
      selectedMission = mission;
      selectedAircraft = mission.aircraft;
      showBriefing();
    });
    list.appendChild(button);
  }
}

function buildAircraftList() {
  const list = document.getElementById('aircraft-list');
  if (!list) return;
  list.innerHTML = '';
  for (const spec of AIRCRAFT) {
    const button = document.createElement('button');
    button.className = 'aircraft-card' + (spec.id === selectedAircraft ? ' picked' : '');
    button.innerHTML = `<b>${spec.name} — ${spec.maker}</b><span>${spec.blurb}</span><i>cruise ${spec.cruise * 3.6 | 0} km/h · stall ${spec.stall * 3.6 | 0} km/h · burn ×${spec.burn}</i>`;
    button.addEventListener('click', () => {
      selectedAircraft = spec.id;
      buildAircraftList();
    });
    list.appendChild(button);
  }
}

function showBriefing() {
  buildAircraftList();
  const title = document.getElementById('briefing-title');
  if (title) title.textContent = `${selectedMission.name} — ${selectedMission.kind}`;
  const text = document.getElementById('briefing-text');
  if (text) text.textContent = selectedMission.briefing;
  const meta = document.getElementById('briefing-meta');
  if (meta) meta.textContent = `Weather: ${selectedMission.weather} · Leg: ${selectedMission.time} · Reward: ★ ${selectedMission.reward}`;
  showScreen('briefing');
}

function startMission() {
  weather = createWeatherFront(selectedMission.weather, seed);
  weather.applyToScene(flightRenderer.scene, flightRenderer.timeOfDay);
  flightRenderer.applyTimeOfDay(selectedMission.time);
  weather.applyToScene(flightRenderer.scene, flightRenderer.timeOfDay);
  const rain = weather.buildRain(flightRenderer.scene);
  if (rain) rain.visible = false;
  missionRun = createMissionRun(selectedMission, rings);
  if (selectedMission.kind === 'rings') startRingRace(missionRun);
  const spec = aircraftSpec(selectedAircraft);
  flightRenderer.scene.remove(aircraftMesh);
  aircraftMesh = buildAircraftMesh(spec);
  flightRenderer.scene.add(aircraftMesh);
  const pose = startPose();
  aircraft = createAircraftState(spec, { ...pose, fuel: selectedMission.fuelStart ?? 100 });
  aircraft.gearDown = true;
  cameraMode = 'chase';
  hud.setCockpitMode(false);
  input.resetLook();
  audio.ensureStarted();
  showScreen('play');
  hud.showBanner(selectedMission.name, selectedMission.briefing);
  beacon.visible = true;
}

function finishMission() {
  careerScore += Math.round(missionRun.score);
  bestScore = Math.max(bestScore, careerScore);
  saveBest();
  const scoreElement = document.getElementById('complete-score');
  if (scoreElement) scoreElement.textContent = `Score ${Math.round(missionRun.score)} · Career ${careerScore} · Best ${bestScore}`;
  const logElement = document.getElementById('complete-log');
  if (logElement) logElement.textContent = missionRun.log.join(' — ') || 'Clean flight.';
  showScreen('complete');
  audio.missionComplete();
}

function crashMission(cause) {
  const causeElement = document.getElementById('crash-cause');
  if (causeElement) causeElement.textContent = `You ${cause}. The Kaldera keeps the wreck; the pilot swims home.`;
  const scoreElement = document.getElementById('crash-score');
  if (scoreElement) scoreElement.textContent = `Score ${Math.round(missionRun.score)} · Career ${careerScore}`;
  showScreen('crashed');
}

function handleFlightEvents(events) {
  for (const event of events) {
    if (event.kind === 'ring') {
      hud.showBanner(`Ring ${event.number} of ${event.total}`, 'Clean line — keep it up.');
      audio.ringChime();
    } else if (event.kind === 'survey') {
      hud.showBanner(`Surveyed ${event.island}`, 'Crater photographed, steady and level.');
      audio.ringChime();
    } else if (event.kind === 'pickup') {
      hud.showBanner(`Picked up at ${event.island}`, 'Passenger aboard — now bring them home.');
      audio.ringChime();
    } else if (event.kind === 'leg-done') {
      hud.showBanner(`Landed at ${event.island}`, missionRun.done ? 'That is the mission.' : 'Next leg: check the beacon.');
      audio.landingThud(false);
    } else if (event.kind === 'wrong-strip') {
      hud.showBanner('Wrong place to land', `The mission needs ${event.island}. Follow the beacon.`);
      audio.warningBeep();
    } else if (event.kind === 'hard-landing') {
      hud.showBanner('Hard landing', `Impact ${event.impact.toFixed(1)} m/s — the airframe felt that.`);
      audio.landingThud(true);
    } else if (event.kind === 'landed') {
      const strip = islandStripAt(aircraft.x, aircraft.z);
      const stripEvents = landOnStrip(missionRun, aircraft, strip !== null);
      handleFlightEvents(stripEvents);
      if (!missionRun.done && stripEvents.length === 0) {
        audio.landingThud(false);
      }
    } else if (event.kind === 'fuel-empty') {
      hud.showBanner('Fuel empty', 'Engine out — glide her down gently.');
      audio.warningBeep();
    } else if (event.kind === 'crash') {
      crashMission(event.cause);
    }
  }
}

function stepFlight(dt) {
  elapsed += dt;
  const liveInput = shot ? shot.autopilot(shotFrame) : input.read();
  const wind = weather.gustAt(elapsed);
  const fullWind = { x: weather.wind.x + wind.x, z: weather.wind.z + wind.z, gust: wind };
  const events = stepAircraftFlight(aircraft, liveInput, fullWind, dt, elapsed);
  handleFlightEvents(events);
  if (aircraft.crashed) return;
  // Soft boundary: beyond the charted sea the wind turns you home.
  const distanceFromCenter = Math.hypot(aircraft.x, aircraft.z);
  if (distanceFromCenter > 3400) {
    const homeHeading = Math.atan2(aircraft.x, aircraft.z) + Math.PI;
    let diff = homeHeading - aircraft.heading;
    diff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    aircraft.heading += diff * dt * 0.5;
    if (shotFrame % 120 === 0) hud.showBanner('Open sea ahead', 'Turning back to the charted islands.');
  }
  const groundHeight = sampler.heightAt(aircraft.x, aircraft.z);
  const strip = islandStripAt(aircraft.x, aircraft.z);
  const water = groundHeight < 1;
  const groundEvents = resolveGroundContact(aircraft, groundHeight, strip !== null, water);
  handleFlightEvents(groundEvents);
  if (aircraft.crashed) return;
  const progressEvents = updateMissionProgress(missionRun, aircraft, dt);
  handleFlightEvents(progressEvents);
  if (missionRun.done && screen === 'play') {
    finishMission();
  }
  const target = currentTarget(missionRun);
  if (target && screen === 'play') {
    beacon.position.set(target.x, 350, target.z);
    beacon.visible = true;
  } else if (screen !== 'play') {
    beacon.visible = false;
  }
  weather.moveRainWith(aircraft);
  audio.updateEngine(aircraft.throttle, aircraft.speed, !aircraft.onGround);
  hud.updateFlight(aircraft, missionRun, weather, target);
}

function resize() {
  flightRenderer.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

function wireButtons() {
  const flyButton = document.getElementById('fly-button');
  if (flyButton) flyButton.addEventListener('click', startMission);
  const backButton = document.getElementById('back-button');
  if (backButton) backButton.addEventListener('click', () => showScreen('title'));
  const resumeButton = document.getElementById('resume-button');
  if (resumeButton) resumeButton.addEventListener('click', () => showScreen('play'));
  const retryButton = document.getElementById('retry-button');
  if (retryButton) retryButton.addEventListener('click', startMission);
  const againButton = document.getElementById('again-button');
  if (againButton) againButton.addEventListener('click', startMission);
  const menuButton = document.getElementById('menu-button');
  if (menuButton) menuButton.addEventListener('click', () => showScreen('title'));
  const menuButton2 = document.getElementById('menu-button-2');
  if (menuButton2) menuButton2.addEventListener('click', () => showScreen('title'));
  const menuButton3 = document.getElementById('menu-button-3');
  if (menuButton3) menuButton3.addEventListener('click', () => showScreen('title'));
}

function frame(now) {
  requestAnimationFrame(frame);
  const delta = Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;
  if (input.wasPressed(ACTION_PAUSE)) {
    if (screen === 'play') showScreen('paused');
    else if (screen === 'paused') showScreen('play');
  }
  if (input.wasPressed(ACTION_CAMERA) && (screen === 'play' || screen === 'paused')) {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
    hud.setCockpitMode(cameraMode === 'cockpit');
  }
  if (input.wasPressed(ACTION_GEAR) && screen === 'play') {
    aircraft.gearDown = !aircraft.gearDown;
    hud.showBanner(aircraft.gearDown ? 'Gear down' : 'Gear up', '');
  }
  if (input.wasPressed(ACTION_MUTE)) {
    audio.setMuted(!audio.isMuted());
  }
  if (input.wasPressed(ACTION_CONFIRM)) {
    if (screen === 'title') showBriefing();
    else if (screen === 'briefing') startMission();
    else if (screen === 'complete' || screen === 'crashed') startMission();
  }
  if (screen === 'play' && !shot) {
    accumulator += delta;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 8) {
      stepFlight(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
      if (screen !== 'play') break;
    }
  }
  const liveInput = shot ? shot.autopilot(shotFrame) : input.read();
  // In the cockpit the pilot's own airframe would fill the view; hide it so
  // the instruments and the world ahead are what the camera sees.
  aircraftMesh.visible = cameraMode !== 'cockpit';
  updateFlightCamera(flightRenderer.camera, aircraft, cameraMode, liveInput, delta);
  renderFlightFrame(flightRenderer, aircraftMesh, aircraft, delta);
  if (shot) {
    shotFrame += 1;
    if (shotFrame >= shot.frames && !window.__shotReady) {
      window.__shotReady = true;
    }
  }
}

function setupShot() {
  const sceneMission = missionById((shotName === 'landing' || shotName === 'cockpit' || shotName === 'complete') ? 'first-hop' : 'ring-rally');
  selectedMission = sceneMission;
  weather = createWeatherFront(sceneMission.weather, seed);
  flightRenderer.applyTimeOfDay(sceneMission.time);
  weather.applyToScene(flightRenderer.scene, flightRenderer.timeOfDay);
  missionRun = createMissionRun(sceneMission, rings);
  const spec = aircraftSpec(sceneMission.aircraft);
  flightRenderer.scene.remove(aircraftMesh);
  aircraftMesh = buildAircraftMesh(spec);
  flightRenderer.scene.add(aircraftMesh);
  const pose = startPose();
  aircraft = createAircraftState(spec, pose);
  shot = stageShotScene(shotName, aircraft, missionRun, rings, (x, z) => sampler.heightAt(x, z));
  cameraMode = shot.camera;
  hud.setCockpitMode(cameraMode === 'cockpit');
  aircraftMesh.visible = cameraMode !== 'cockpit';
  showScreen('play');
  // Fly the scripted autopilot forward in fixed steps, then paint twice so
  // the frame the screenshot takes is the settled one.
  for (let i = 0; i < shot.frames; i++) {
    stepFlight(FIXED_STEP);
    shotFrame += 1;
    if (screen !== 'play') break;
  }
  if (shotName === 'complete') showScreen('complete');
  // The chase camera eases toward its spot; run it to convergence so the
  // staged frame is the one the camera has settled on, not its start.
  for (let i = 0; i < 120; i++) {
    updateFlightCamera(flightRenderer.camera, aircraft, cameraMode, { lookX: 0, lookY: 0 }, 1 / 60);
  }
  renderFlightFrame(flightRenderer, aircraftMesh, aircraft, 1 / 60);
  renderFlightFrame(flightRenderer, aircraftMesh, aircraft, 1 / 60);
  hud.updateFlight(aircraft, missionRun, weather, currentTarget(missionRun));
  window.__shotReady = true;
}

buildMissionList();
wireButtons();
if (shotName) {
  setupShot();
  // Keep the frame loop alive so the page stays painted; the shot is done.
  requestAnimationFrame(frame);
} else {
  showScreen('title');
  requestAnimationFrame(frame);
}
