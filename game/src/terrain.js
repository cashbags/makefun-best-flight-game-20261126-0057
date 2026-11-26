// The Kaldera archipelago: one displaced plane for the land, one flat sea,
// twelve seeded islands with beach, grass, rock and volcanic ash, flat
// airstrips cut into the six strip islands, and the eight race rings.
import * as THREE from 'three';
import { ISLANDS, RING_COUNT, WORLD_SEED, WORLD_SIZE } from './config.js';
import { createSeededRandom } from './random.js';

const STRIP_LENGTH = 340;
const STRIP_WIDTH = 26;

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function islandByName(name) {
  return ISLANDS.find((island) => island.name === name);
}

// Height of the land at (x, z). Islands are smooth cones with a seeded wobble;
// volcanoes dip into a crater at the top. Strips are flattened to one height.
export function createHeightSampler() {
  const random = createSeededRandom(WORLD_SEED);
  const wobbles = ISLANDS.map(() => ({
    angle: random.range(0, Math.PI * 2),
    strength: random.range(0.12, 0.3),
  }));
  function rawHeight(x, z) {
    let height = 0;
    for (let i = 0; i < ISLANDS.length; i++) {
      const island = ISLANDS[i];
      const dx = x - island.x;
      const dz = z - island.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist >= island.radius) continue;
      const fall = 1 - dist / island.radius;
      let bump = island.peak * Math.pow(fall, 1.6);
      const wobble = wobbles[i];
      bump *= 1 + wobble.strength * Math.sin(dist * 0.02 + wobble.angle);
      if (island.volcano && dist < island.radius * 0.22) {
        bump -= island.peak * 0.45 * (1 - dist / (island.radius * 0.22));
      }
      height = Math.max(height, bump);
    }
    return height;
  }
  function stripHeight(island) {
    if (!island.strip) return 0;
    return Math.max(14, rawHeight(island.x, island.z) * 0.55);
  }
  function heightAt(x, z) {
    let height = rawHeight(x, z);
    for (const island of ISLANDS) {
      if (!island.strip) continue;
      const heading = island.stripHeading;
      const along = (x - island.x) * Math.cos(heading) + (z - island.z) * Math.sin(heading);
      const across = -(x - island.x) * Math.sin(heading) + (z - island.z) * Math.cos(heading);
      if (Math.abs(along) < STRIP_LENGTH / 2 + 60 && Math.abs(across) < STRIP_WIDTH / 2 + 60) {
        const blend = smoothstep(STRIP_WIDTH / 2 + 60, STRIP_WIDTH / 2 + 10, Math.abs(across))
          * smoothstep(STRIP_LENGTH / 2 + 60, STRIP_LENGTH / 2 + 10, Math.abs(along));
        height = height * (1 - blend) + stripHeight(island) * blend;
      }
    }
    return height;
  }
  return { heightAt, stripHeight, rawHeight };
}

function colorForHeight(height, random) {
  const jitter = random.range(-0.03, 0.03);
  if (height < 4) return new THREE.Color(0xd9c48f).offsetHSL(0, 0, jitter);
  if (height < 55) return new THREE.Color(0x5d8a4a).offsetHSL(0, 0, jitter);
  if (height < 130) return new THREE.Color(0x6f7d5a).offsetHSL(0, 0, jitter);
  if (height < 210) return new THREE.Color(0x7a6a58).offsetHSL(0, 0, jitter);
  return new THREE.Color(0x3d3a38).offsetHSL(0, 0, jitter);
}

export function buildArchipelago(scene, sampler) {
  const random = createSeededRandom(WORLD_SEED + 7);
  const segments = 130;
  const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const height = sampler.heightAt(x, z);
    positions.setY(i, height);
    color.copy(colorForHeight(height, random));
    // Crater rims glow faintly ember on volcanoes.
    for (const island of ISLANDS) {
      if (!island.volcano) continue;
      const dist = Math.hypot(x - island.x, z - island.z);
      if (dist < island.radius * 0.2 && height > island.peak * 0.4) {
        color.lerp(new THREE.Color(0x8a2f16), 0.55);
      }
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const land = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  scene.add(land);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE * 2.4, WORLD_SIZE * 2.4),
    new THREE.MeshLambertMaterial({ color: 0x1d5f7a, transparent: true, opacity: 0.94 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.4;
  scene.add(sea);

  buildStrips(scene, sampler);
  return { land, sea };
}

function buildStrips(scene, sampler) {
  const asphalt = new THREE.MeshLambertMaterial({ color: 0x2c2f33 });
  const paint = new THREE.MeshBasicMaterial({ color: 0xf2ead2 });
  const lightOn = new THREE.MeshBasicMaterial({ color: 0xffc861 });
  for (const island of ISLANDS) {
    if (!island.strip) continue;
    const y = sampler.stripHeight(island) + 0.6;
    const group = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.BoxGeometry(STRIP_LENGTH, 1.2, STRIP_WIDTH), asphalt);
    group.add(pad);
    for (let i = -3; i <= 3; i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 1.6), paint);
      dash.position.set(i * 44, 0.8, 0);
      group.add(dash);
    }
    for (const side of [-1, 1]) {
      for (let i = -7; i <= 7; i++) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 2), lightOn);
        lamp.position.set(i * 24, 0.8, side * (STRIP_WIDTH / 2 + 3));
        lamp.userData.runwayLight = true;
        group.add(lamp);
      }
    }
    group.position.set(island.x, y, island.z);
    group.rotation.y = -island.stripHeading;
    scene.add(group);
  }
}

// Eight race rings on a loop over the inner sea, seeded altitudes and gaps.
export function buildRaceRings(scene) {
  const random = createSeededRandom(WORLD_SEED + 21);
  const group = new THREE.Group();
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffb020, side: THREE.DoubleSide });
  const ringGlow = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  const rings = [];
  const centerX = 150;
  const centerZ = -300;
  for (let i = 0; i < RING_COUNT; i++) {
    const angle = (i / RING_COUNT) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * 1150 + random.range(-120, 120);
    const z = centerZ + Math.sin(angle) * 950 + random.range(-120, 120);
    const y = 110 + random.range(0, 90);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(26, 2.2, 10, 28), ringMaterial);
    ring.position.set(x, y, z);
    ring.lookAt(x + Math.cos(angle + Math.PI / 2) * 100, y, z + Math.sin(angle + Math.PI / 2) * 100);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(29, 0.8, 8, 28), ringGlow);
    halo.position.copy(ring.position);
    halo.quaternion.copy(ring.quaternion);
    group.add(ring);
    group.add(halo);
    rings.push({ x, y, z, radius: 26, mesh: ring });
  }
  scene.add(group);
  return rings;
}

// A vertical beacon of light over the current waypoint island, plus a windsock
// at every strip so the wind reads in the world, not only on the gauges.
export function buildWaypointBeacon(scene) {
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 14, 700, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc861, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.position.y = 350;
  beacon.visible = false;
  scene.add(beacon);
  return beacon;
}

// The island whose strip rectangle contains (x, z), or null when the point
// is not on any strip. Landing legs only count on a strip.
export function islandStripAt(x, z) {
  for (const island of ISLANDS) {
    if (!island.strip) continue;
    const heading = island.stripHeading;
    const along = (x - island.x) * Math.cos(heading) + (z - island.z) * Math.sin(heading);
    const across = -(x - island.x) * Math.sin(heading) + (z - island.z) * Math.cos(heading);
    if (Math.abs(along) < STRIP_LENGTH / 2 && Math.abs(across) < STRIP_WIDTH / 2) return island;
  }
  return null;
}
