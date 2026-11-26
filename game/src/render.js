// The 3D scene: sky dome, sun and ambient light per time of day, the chase
// camera that never fights the pilot and the cockpit camera at the nose.
// Day legs are bright trades; dusk legs burn orange; night legs are dark
// water lit only by runway lamps and the instruments.
import * as THREE from 'three';
import { TIMES_OF_DAY } from './config.js';
import { createSeededRandom } from './random.js';

export function createFlightRenderer(canvas, timeOfDayId) {
  const timeOfDay = TIMES_OF_DAY[timeOfDayId] ?? TIMES_OF_DAY.day;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(timeOfDay.skyBottom);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 12000);
  const sun = new THREE.DirectionalLight(timeOfDay.sunColor, 2.4);
  const elevation = Math.max(0.08, timeOfDay.sunElevation);
  sun.position.set(Math.cos(0.7) * 1000, elevation * 1600, Math.sin(0.7) * 1000);
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0xffffff, timeOfDay.ambient);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(timeOfDay.skyTop, 0x2a4a3a, 0.55);
  scene.add(hemi);
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(9000, 24, 12),
    new THREE.MeshBasicMaterial({ color: timeOfDay.skyTop, side: THREE.BackSide, fog: false }),
  );
  scene.add(skyDome);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(180, 24),
    new THREE.MeshBasicMaterial({ color: timeOfDay.sunColor, fog: false, transparent: true, opacity: 0.95 }),
  );
  sunDisc.position.copy(sun.position).normalize().multiplyScalar(8200);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  if (timeOfDay.night) {
    const starRandom = createSeededRandom(4242);
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      const theta = starRandom.next() * Math.PI * 2;
      const phi = starRandom.next() * Math.PI * 0.45;
      starPositions[i * 3] = Math.cos(theta) * Math.sin(phi) * 8500;
      starPositions[i * 3 + 1] = Math.cos(phi) * 8500;
      starPositions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * 8500;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 14, sizeAttenuation: false, fog: false })));
  }
  function resize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  return {
    renderer,
    scene,
    camera,
    timeOfDay,
    resize,
    applyTimeOfDay(timeOfDayId) {
      const next = TIMES_OF_DAY[timeOfDayId] ?? TIMES_OF_DAY.day;
      this.timeOfDay = next;
      scene.background = new THREE.Color(next.skyBottom);
      const elevation = Math.max(0.08, next.sunElevation);
      sun.position.set(Math.cos(0.7) * 1000, elevation * 1600, Math.sin(0.7) * 1000);
      sun.color.setHex(next.sunColor);
      ambient.intensity = next.ambient;
      hemi.color.setHex(next.skyTop);
      skyDome.material.color.setHex(next.skyTop);
      sunDisc.material.color.setHex(next.sunColor);
      sunDisc.position.copy(sun.position).normalize().multiplyScalar(8200);
      sunDisc.lookAt(0, 0, 0);
    },
    setNightLights(runwayLightsOn) {
      scene.traverse((object) => {
        if (object.userData.runwayLight) {
          object.material.color.setHex(runwayLightsOn ? 0xffc861 : 0x3a3a3a);
        }
      });
    },
  };
}

// Chase camera: behind and above the aircraft, eased so it never snaps, with
// the mouse-look offset applied. Cockpit camera: at the nose, looking forward
// along the aircraft's attitude, with a touch of roll so banks read.
export function updateFlightCamera(camera, aircraft, mode, look, dt) {
  const forward = new THREE.Vector3(-Math.sin(aircraft.heading), 0, -Math.cos(aircraft.heading));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  // Scripted autopilot inputs carry no mouse-look; treat a missing look as
  // straight ahead, never as NaN — a NaN camera position blanks the render.
  const lookX = look?.lookX ?? 0;
  const lookY = look?.lookY ?? 0;
  if (mode === 'cockpit') {
    const eye = new THREE.Vector3(aircraft.x, aircraft.y + 1.1, aircraft.z);
    const pitchDown = aircraft.pitch * 0.8;
    const lookAt = new THREE.Vector3(
      aircraft.x + forward.x * 100 - Math.sin(aircraft.heading) * 0,
      aircraft.y + 1.1 + Math.tan(pitchDown) * 100 - aircraft.verticalSpeed * 0.4,
      aircraft.z + forward.z * 100,
    );
    camera.position.copy(eye);
    camera.up.set(Math.sin(aircraft.roll) * 0.6, Math.cos(aircraft.roll), 0);
    camera.lookAt(lookAt);
    camera.fov = 68;
    camera.updateProjectionMatrix();
    return;
  }
  const back = 26 + aircraft.speed * 0.12;
  const up = 8 + aircraft.speed * 0.02;
  const desired = new THREE.Vector3(
    aircraft.x - forward.x * back + right.x * lookX * 14,
    aircraft.y + up + lookY * 8,
    aircraft.z - forward.z * back + right.z * lookX * 14,
  );
  const ease = Math.min(1, dt * 5);
  camera.position.lerp(desired, ease);
  const target = new THREE.Vector3(
    aircraft.x + forward.x * 40,
    aircraft.y + 2 - aircraft.verticalSpeed * 0.5,
    aircraft.z + forward.z * 40,
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.fov = 62;
  camera.updateProjectionMatrix();
}

export function renderFlightFrame(flightRenderer, aircraftMesh, aircraft, dt) {
  aircraftMesh.position.set(aircraft.x, aircraft.y, aircraft.z);
  aircraftMesh.rotation.set(0, 0, 0);
  aircraftMesh.rotateY(aircraft.heading);
  aircraftMesh.rotateX(aircraft.pitch);
  aircraftMesh.rotateZ(aircraft.roll);
  const prop = aircraftMesh.userData.prop;
  if (prop) prop.rotation.z += (2 + aircraft.throttle * 38) * dt * 3;
  flightRenderer.renderer.render(flightRenderer.scene, flightRenderer.camera);
}
