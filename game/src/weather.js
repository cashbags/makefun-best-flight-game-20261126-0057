// The three weather fronts: wind that pushes the aircraft, gusts that shove
// it, fog that shortens the world, and rain that only the storm brings.
import * as THREE from 'three';
import { WEATHER_FRONTS } from './config.js';
import { createSeededRandom } from './random.js';

export function frontById(id) {
  return WEATHER_FRONTS.find((front) => front.id === id) ?? WEATHER_FRONTS[0];
}

export function createWeatherFront(frontId, seed) {
  const front = frontById(frontId);
  const random = createSeededRandom(seed + 99);
  const windHeading = random.range(0, Math.PI * 2);
  const wind = {
    x: Math.cos(windHeading) * front.windSpeed,
    z: Math.sin(windHeading) * front.windSpeed,
  };
  let rainPoints = null;
  return {
    front,
    wind,
    gustAt(time) {
      const gust = front.gust;
      if (gust <= 0) return { x: 0, z: 0 };
      const n = random.noise1(time * 0.35);
      const m = random.noise1(time * 0.21 + 40);
      return { x: wind.x * 0.25 + n * gust, z: wind.z * 0.25 + m * gust };
    },
    turbulenceAt(time) {
      return front.turbulence * random.noise1(time * 1.7 + 11);
    },
    applyToScene(scene, timeOfDay) {
      scene.fog = new THREE.Fog(0xcfe0ea, 900, 900 + (1 / Math.max(front.fog, 0.00001)) * 0.55);
      if (timeOfDay.night) scene.fog.color.setHex(0x0a1226);
      else if (timeOfDay.sunElevation < 0.4) scene.fog.color.setHex(0xd8a077);
    },
    buildRain(scene) {
      if (!front.rain) return null;
      const count = 900;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = random.range(-300, 300);
        positions[i * 3 + 1] = random.range(0, 220);
        positions[i * 3 + 2] = random.range(-300, 300);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      rainPoints = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xaac4d8, size: 1.6, transparent: true, opacity: 0.7 }));
      rainPoints.visible = false;
      scene.add(rainPoints);
      return rainPoints;
    },
    moveRainWith(aircraftPosition) {
      if (!rainPoints) return;
      rainPoints.position.set(aircraftPosition.x, aircraftPosition.y - 90, aircraftPosition.z);
      rainPoints.visible = true;
      const positions = rainPoints.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i) - 3.2;
        if (y < 0) y = 220;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    },
  };
}
